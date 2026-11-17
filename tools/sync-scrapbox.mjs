import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { root, read } from "./project.mjs";
import { entryPage, managedMarker, packageFiles } from "./scrapbox-package.mjs";
import { compileNativeStyle, mergeNativeStyle, managedStyleFromCode } from "./native-usercss.mjs";

import {
  legacyEntrypoints,
  mergeLegacyEntrypoint,
  managedLegacyCode,
} from "./legacy-entrypoints.mjs";

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
  if (target.legacyEntrypoints !== undefined && typeof target.legacyEntrypoints !== "boolean")
    throw new Error("Invalid legacy entrypoint configuration.");
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
  if (
    target.usercss &&
    (!/^[a-z0-9][a-z0-9-]*$/.test(target.usercss.project) ||
      target.usercss.page !== "Settings" ||
      Object.keys(target.usercss).some((key) => !["project", "page"].includes(key)))
  )
    throw new Error("Invalid native UserCSS target.");
  if (target.legacyEntrypoints && target.usercss?.project === target.project)
    throw new Error("Legacy and consumer UserCSS must use different Settings pages.");
  return {
    project: target.project,
    page: entryPage,
    lines: page.lines.length,
    codeBlocks: packageFiles(pkg).size,
    contentSha256: sha256(JSON.stringify(pkg)),
    url: `${origin}/${target.project}/${encodeURIComponent(entryPage)}`,
    ...(target.usercss ? { usercss: target.usercss } : {}),
    ...(target.legacyEntrypoints
      ? {
          legacyEntrypoints: [
            { page: "Settings", block: "style.css" },
            { page: "kame", block: "script.js" },
          ],
        }
      : {}),
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
    if (!failures.length) {
      for (const entry of target.legacyEntrypoints ? legacyEntrypoints(pkg, target.project) : []) {
        const response = await request(
          fetchImpl,
          `${origin}/api/code/${target.project}/${entry.page}/${entry.block}?verify=${entry.version}`,
          { cache: "no-store" },
          "Legacy entrypoint verification",
        );
        const type = response.headers.get("content-type") ?? "";
        const validType =
          entry.kind === "css"
            ? type.includes("text/css")
            : /(?:text|application)\/javascript/.test(type);
        try {
          if (
            !response.ok ||
            !validType ||
            managedLegacyCode(await response.text(), entry).code !== entry.code.trim()
          )
            failures.push(`${entry.page}/${entry.block}`);
        } catch {
          failures.push(`${entry.page}/${entry.block}`);
        }
      }
      if (!failures.length)
        return {
          ...plan,
          verifiedCodeBlocks: expected.length,
          ...(target.legacyEntrypoints ? { verifiedLegacyEntrypoints: 2 } : {}),
        };
    }
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
  const legacy = target.legacyEntrypoints ? legacyEntrypoints(pkg, target.project) : [];
  const readLegacy = async (entry) =>
    jsonResponse(
      await request(
        fetchImpl,
        `${origin}/api/pages/${target.project}/${entry.page}?verify=${crypto.randomUUID()}`,
        { headers, cache: "no-store" },
        "Legacy entrypoint preflight",
      ),
      "Legacy entrypoint preflight",
    );
  for (const entry of legacy) mergeLegacyEntrypoint(await readLegacy(entry), entry);
  const syncLegacy = async () => {
    if (!legacy.length) return {};
    const backups = [],
      actions = [];
    for (const entry of legacy) {
      const current = await readLegacy(entry);
      const next = mergeLegacyEntrypoint(current, entry);
      const changed = JSON.stringify(pageLines(current)) !== JSON.stringify(next.lines);
      if (changed) {
        backups.push({ title: current.title, lines: pageLines(current) });
        fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
        fs.writeFileSync(
          path.join(backupDirectory, "previous-legacy.scrapbox.json"),
          JSON.stringify({ pages: backups }, null, 2) + "\n",
          { mode: 0o600 },
        );
        const writeHeaders = {
          ...headers,
          Origin: origin,
          Referer: `${origin}/${target.project}/`,
          ...(typeof profile.csrfToken === "string" && profile.csrfToken
            ? { "X-CSRF-TOKEN": profile.csrfToken }
            : {}),
        };
        const form = new FormData();
        form.append(
          "import-file",
          new Blob([JSON.stringify({ pages: [next] })], { type: "application/octet-stream" }),
          "kame-layout-legacy.scrapbox.json",
        );
        form.append("duplicateFileBetweenProject", "false");
        await jsonResponse(
          await request(
            fetchImpl,
            `${origin}/api/page-data/import/${target.project}.json`,
            { method: "POST", headers: writeHeaders, body: form },
            "Legacy entrypoint update",
          ),
          "Legacy entrypoint update",
        );
        const finished = await request(
          fetchImpl,
          `${origin}/api/page-data/import-finish/${target.project}.json`,
          { method: "POST", headers: writeHeaders },
          "Legacy entrypoint finish",
        );
        if (!finished.ok) throw new Error(`Legacy entrypoint finish: HTTP ${finished.status}.`);
      }
      actions.push({
        page: entry.page,
        block: entry.block,
        action: changed ? "updated" : "unchanged",
      });
    }
    return { legacyEntrypoints: actions };
  };
  const native = target.usercss ? compileNativeStyle(pkg) : null;
  const readNative = async () =>
    jsonResponse(
      await request(
        fetchImpl,
        `${origin}/api/pages/${target.usercss.project}/${encodeURIComponent(target.usercss.page)}`,
        { headers, cache: "no-store" },
        "Native UserCSS preflight",
      ),
      "Native UserCSS preflight",
    );
  // Validate the explicitly configured consumer before writing either project.
  if (native) mergeNativeStyle(await readNative(), target.usercss, target.project, native.css);
  const syncNative = async () => {
    if (!native) return {};
    // Re-read immediately before merging, preserving user changes outside our markers.
    const current = await readNative();
    const next = mergeNativeStyle(current, target.usercss, target.project, native.css);
    const changed = JSON.stringify(pageLines(current)) !== JSON.stringify(next.lines);
    if (changed) {
      const nativeHeaders = {
        ...headers,
        Origin: origin,
        Referer: `${origin}/${target.usercss.project}/`,
        ...(typeof profile.csrfToken === "string" && profile.csrfToken
          ? { "X-CSRF-TOKEN": profile.csrfToken }
          : {}),
      };
      const form = new FormData();
      form.append(
        "import-file",
        new Blob([JSON.stringify({ pages: [next] })], { type: "application/octet-stream" }),
        "kame-layout-usercss.scrapbox.json",
      );
      form.append("duplicateFileBetweenProject", "false");
      await jsonResponse(
        await request(
          fetchImpl,
          `${origin}/api/page-data/import/${target.usercss.project}.json`,
          { method: "POST", headers: nativeHeaders, body: form },
          "Native UserCSS update",
        ),
        "Native UserCSS update",
      );
      const finished = await request(
        fetchImpl,
        `${origin}/api/page-data/import-finish/${target.usercss.project}.json`,
        { method: "POST", headers: nativeHeaders },
        "Native UserCSS finish",
      );
      if (!finished.ok) throw new Error(`Native UserCSS finish: HTTP ${finished.status}.`);
    }
    const response = await request(
      fetchImpl,
      `${origin}/api/code/${target.usercss.project}/${encodeURIComponent(target.usercss.page)}/style.css?verify=${native.version}`,
      { headers, cache: "no-store" },
      "Native UserCSS verification",
    );
    if (!response.ok || !response.headers.get("content-type")?.includes("text/css"))
      throw new Error("Native UserCSS verification failed.");
    if (managedStyleFromCode(await response.text()) !== native.css.trim())
      throw new Error("Native UserCSS content does not match.");
    // Never log or upload the private Settings page or its custom CSS.
    return {
      nativeUsercss: {
        project: target.usercss.project,
        page: target.usercss.page,
        version: native.version,
        action: changed ? "updated" : "unchanged",
        verified: true,
      },
    };
  };
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
      const legacyResult = await syncLegacy();
      return {
        ...(await verify(pkg, target, { fetchImpl })),
        ...legacyResult,
        ...(await syncNative()),
        action: "unchanged",
      };
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
  const legacyResult = await syncLegacy();
  return {
    ...(await verify(pkg, target, { fetchImpl })),
    ...legacyResult,
    ...(await syncNative()),
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
