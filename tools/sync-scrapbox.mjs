import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { root, read } from "./project.mjs";
import { entryPage, managedMarker, packageFiles } from "./scrapbox-package.mjs";

const origin = "https://scrapbox.io";
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");
const trimEnd = (lines) => {
  const result = [...lines];
  while (result.at(-1) === "") result.pop();
  return result;
};
const pageLines = (page) => page.lines.map((line) => (typeof line === "string" ? line : line.text));

export function planSync(pkg, target) {
  if (Object.keys(pkg).some((key) => key !== "pages"))
    throw new Error("Unexpected package metadata.");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(target.project))
    throw new Error("Invalid Scrapbox project name.");
  if (target.page !== entryPage || pkg.pages?.length !== 1 || pkg.pages[0].title !== entryPage) {
    throw new Error(`Only the managed ${entryPage} page may be published.`);
  }
  const page = pkg.pages[0];
  if (!Array.isArray(page.lines) || page.lines[0] !== entryPage || page.lines[1] !== managedMarker)
    throw new Error("Missing managed-page marker.");
  if (
    page.lines.length >= 10000 ||
    !page.lines.every((line) => typeof line === "string" && !/[\r\n\u2028\u2029]/.test(line))
  ) {
    throw new Error("Invalid Scrapbox page lines.");
  }
  if (Object.keys(page).some((key) => !["title", "lines"].includes(key)))
    throw new Error("Unexpected page metadata.");
  return {
    project: target.project,
    page: entryPage,
    lines: page.lines.length,
    codeBlocks: packageFiles(pkg).size,
    contentSha256: sha256(JSON.stringify(pkg)),
    url: `${origin}/${target.project}/${encodeURIComponent(entryPage)}`,
  };
}

export function cookieHeader(sid) {
  if (typeof sid !== "string" || !sid.trim()) throw new Error("SCRAPBOX_SID is not configured.");
  sid = sid.trim();
  if (sid.startsWith('"') && sid.endsWith('"')) sid = sid.slice(1, -1);
  if (sid.startsWith("connect.sid=")) sid = sid.slice("connect.sid=".length);
  if (!sid || /[\s;\r\n]/.test(sid))
    throw new Error("SCRAPBOX_SID must contain only the connect.sid cookie value.");
  return `connect.sid=${sid}`;
}

async function request(fetchImpl, url, init, label) {
  let response;
  try {
    response = await fetchImpl(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new Error(
      `${label}: network request failed. No credentials or response body were logged.`,
    );
  }
  return response;
}

async function jsonResponse(response, label) {
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}.`);
  try {
    return await response.json();
  } catch {
    throw new Error(`${label}: expected a JSON response.`);
  }
}

export async function verifyPublished(
  pkg,
  target,
  {
    fetchImpl = fetch,
    retries = 5,
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = {},
) {
  const plan = planSync(pkg, target);
  const expected = [...packageFiles(pkg)];
  let failures = [];
  for (let attempt = 0; attempt < retries; attempt++) {
    failures = [];
    // Limit concurrent code requests. A fresh query prevents stale intermediary responses.
    for (let offset = 0; offset < expected.length; offset += 4) {
      await Promise.all(
        expected.slice(offset, offset + 4).map(async ([name, body]) => {
          const url = `${origin}/api/code/${plan.project}/${name.split("/").map(encodeURIComponent).join("/")}?verify=${plan.contentSha256}`;
          const response = await request(
            fetchImpl,
            url,
            { cache: "no-store" },
            "Code verification",
          );
          const type = response.headers.get("content-type") ?? "";
          const validType = name.endsWith(".css")
            ? type.includes("text/css")
            : /(?:text|application)\/javascript/.test(type);
          if (!response.ok || !validType || (await response.text()) !== body) failures.push(name);
        }),
      );
    }
    if (!failures.length) return { ...plan, verifiedCodeBlocks: expected.length };
    if (attempt + 1 < retries) await wait(1500);
  }
  throw new Error(
    `Published code verification failed for ${failures.length} block(s): ${failures.join(", ")}`,
  );
}

export async function publishPackage(
  pkg,
  target,
  {
    sid,
    fetchImpl = fetch,
    backupDirectory = path.join(root, ".cache/scrapbox-sync"),
    verify = verifyPublished,
  } = {},
) {
  const plan = planSync(pkg, target);
  const cookie = cookieHeader(sid);
  const headers = { Cookie: cookie, Accept: "application/json, text/plain, */*" };
  const profile = await jsonResponse(
    await request(fetchImpl, `${origin}/api/users/me`, { headers }, "Authentication"),
    "Authentication",
  );
  if (profile.isGuest) {
    throw new Error("Scrapbox login session is missing or expired. Update SCRAPBOX_SID.");
  }
  if (typeof profile.id !== "string" || !profile.id) {
    throw new Error("Unexpected Scrapbox profile response. Check the authentication API.");
  }
  const pageUrl = `${origin}/api/pages/${plan.project}/${encodeURIComponent(plan.page)}`;
  const currentResponse = await request(
    fetchImpl,
    pageUrl,
    { headers, cache: "no-store" },
    "Managed page preflight",
  );
  let previous = null;
  if (currentResponse.status !== 404) {
    previous = await jsonResponse(currentResponse, "Managed page preflight");
    if (
      !Array.isArray(previous.lines) ||
      previous.title !== entryPage ||
      !pageLines(previous).includes(managedMarker)
    ) {
      throw new Error("Refusing to overwrite a page without the managed delivery marker.");
    }
    if (
      JSON.stringify(trimEnd(pageLines(previous))) === JSON.stringify(trimEnd(pkg.pages[0].lines))
    ) {
      return { ...(await verify(pkg, target, { fetchImpl })), action: "unchanged" };
    }
    fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      path.join(backupDirectory, "previous.scrapbox.json"),
      JSON.stringify({ pages: [{ title: previous.title, lines: pageLines(previous) }] }, null, 2) +
        "\n",
      { mode: 0o600 },
    );
  }
  const writeHeaders = {
    ...headers,
    // Current native requests use Cookie + Origin. Keep compatibility with older
    // API responses that also supplied a CSRF token, without requiring that field.
    ...(typeof profile.csrfToken === "string" && profile.csrfToken
      ? { "X-CSRF-TOKEN": profile.csrfToken }
      : {}),
    Origin: origin,
    Referer: `${origin}/${plan.project}/`,
  };
  const form = new FormData();
  form.append(
    "import-file",
    new Blob([JSON.stringify(pkg)], { type: "application/octet-stream" }),
    "kame-layout.scrapbox.json",
  );
  form.append("duplicateFileBetweenProject", "false");
  await jsonResponse(
    await request(
      fetchImpl,
      `${origin}/api/page-data/import/${plan.project}.json`,
      {
        method: "POST",
        headers: writeHeaders,
        body: form,
      },
      "Page import",
    ),
    "Page import",
  );
  // This is the second step used by the native Import Pages UI, including indexing.
  const finished = await request(
    fetchImpl,
    `${origin}/api/page-data/import-finish/${plan.project}.json`,
    {
      method: "POST",
      headers: writeHeaders,
    },
    "Import finish",
  );
  if (!finished.ok) throw new Error(`Import finish: HTTP ${finished.status}.`);
  return {
    ...(await verify(pkg, target, { fetchImpl })),
    action: previous ? "updated" : "created",
  };
}

async function main() {
  const pkg = JSON.parse(read("dist/kame-layout.scrapbox.json"));
  const target = JSON.parse(read("config/scrapbox-sync.json"));
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--publish", "--verify"].includes(arg)) || args.length > 1)
    throw new Error("Use no option (dry run), --publish, or --verify.");
  const plan = planSync(pkg, target);
  const result = args.includes("--publish")
    ? await publishPackage(pkg, target, { sid: process.env.SCRAPBOX_SID })
    : args.includes("--verify")
      ? await verifyPublished(pkg, target)
      : { ...plan, action: "dry-run", writes: 0 };
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Scrapbox sync\n\n- Action: ${result.action ?? "verified"}\n- Page: [${plan.project}/${plan.page}](${plan.url})\n- SHA-256: \`${plan.contentSha256}\`\n- Code blocks: ${plan.codeBlocks}\n\n`,
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
