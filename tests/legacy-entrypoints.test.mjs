import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { createPackage, packageFiles } from "../tools/scrapbox-package.mjs";
import { compileNativeStyle } from "../tools/native-usercss.mjs";
import {
  legacyEntrypoints,
  mergeLegacyEntrypoint,
  legacyCodeRange,
  managedLegacyCode,
} from "../tools/legacy-entrypoints.mjs";
import { publishPackage, verifyPublished, planSync } from "../tools/sync-scrapbox.mjs";
import { read, root, migration } from "../tools/project.mjs";
const pkg = createPackage(),
  entries = legacyEntrypoints(pkg, "kamelayout"),
  files = packageFiles(pkg);
const target = { project: "kamelayout", page: "kame-layout:delivery", legacyEntrypoints: true };
const original = (entry) => ({
  title: entry.page,
  lines: [
    entry.page,
    "existing prose and image",
    "code:" + entry.block,
    ...execFileSync("git", ["show", `${migration.baseline}:src/${entry.page}/${entry.block}`], {
      cwd: root,
      encoding: "utf8",
    })
      .trimEnd()
      .split("\n")
      .map((line) => " " + line),
    "",
    "after-code prose",
    "code:other.txt",
    " keep this block",
  ],
});
const code = (page, entry) => {
  const { start, end } = legacyCodeRange(page.lines, entry);
  return page.lines
    .slice(start, end)
    .map((line) => line.slice(1))
    .join("\n");
};
test("download paths contain the native CSS and a versioned, same-origin Script import", () => {
  assert.equal(read("src/Settings/style.css"), entries[0].code);
  assert.equal(entries[0].source, compileNativeStyle(pkg).css);
  assert.equal(read("src/kame/script.js"), entries[1].code);
  assert.equal(
    entries[1].source,
    `import "/api/code/kamelayout/kame-layout%3Adelivery/script.js?v=${entries[1].version}";`,
  );
  assert.ok(!entries[1].source.includes("loader.js"));
  assert.throws(() => planSync(pkg, { ...target, legacyEntrypoints: "true" }), /configuration/);
});
test("legacy migration recognises immutable original blocks and preserves all other page content", () => {
  for (const entry of entries) {
    const before = original(entry),
      after = mergeLegacyEntrypoint(before, entry);
    const a = legacyCodeRange(before.lines, entry),
      b = legacyCodeRange(after.lines, entry);
    assert.deepEqual(after.lines.slice(0, b.start), before.lines.slice(0, a.start));
    assert.deepEqual(after.lines.slice(b.end), before.lines.slice(a.end));
    assert.equal(code(after, entry), entry.code.trimEnd());
    const custom = structuredClone(after);
    custom.lines.splice(b.start, 0, " /* custom before */");
    const updated = mergeLegacyEntrypoint(custom, {
      ...entry,
      code: entry.code.replace(entry.source, entry.source + "\n/* next */"),
    });
    assert.ok(updated.lines.includes(" /* custom before */"));
    assert.ok(updated.lines.includes(" keep this block"));
  }
});
test("unknown blocks, duplicate blocks, foreign pages and malformed markers cannot be replaced", () => {
  for (const entry of entries) {
    const cases = [
      { ...original(entry), title: "other" },
      { title: entry.page, lines: [entry.page, "code:" + entry.block, " personal modification"] },
      {
        ...original(entry),
        lines: [...original(entry).lines, "code:" + entry.block, " duplicate"],
      },
      {
        title: entry.page,
        lines: [entry.page, "code:" + entry.block, " " + entry.start, " malformed"],
      },
    ];
    for (const page of cases) assert.throws(() => mergeLegacyEntrypoint(page, entry));
  }
});
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
function server({ unknown = false, concurrent = false, finishStatus = 204 } = {}) {
  const pages = new Map(entries.map((e) => [e.page, original(e)])),
    reads = new Map();
  const posts = [];
  let stale = false;
  if (unknown) pages.get("kame").lines.splice(3, 0, " custom script");
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url),
      p = decodeURIComponent(u.pathname);
    assert.equal(u.origin, "https://scrapbox.io");
    assert.equal(init.redirect, "error");
    if (p === "/api/users/me") return json({ id: "member" });
    if (p.startsWith("/api/pages/kamelayout/")) {
      const title = p.split("/").at(-1);
      if (title === "kame-layout:delivery") return json(pkg.pages[0]);
      const n = (reads.get(title) ?? 0) + 1;
      reads.set(title, n);
      if (concurrent && n === 2) pages.get(title).lines.splice(1, 0, "concurrent note");
      return json(pages.get(title));
    }
    if (p === "/api/page-data/import/kamelayout.json") {
      assert.equal(init.headers.Cookie, "connect.sid=fake-session");
      assert.equal(init.headers.Origin, "https://scrapbox.io");
      assert.equal(init.body.get("import-file").name, "kame-layout-legacy.scrapbox.json");
      const data = JSON.parse(await init.body.get("import-file").text());
      assert.equal(data.pages.length, 1);
      assert.ok(pages.has(data.pages[0].title));
      pages.set(data.pages[0].title, data.pages[0]);
      posts.push(p);
      return json({ ok: true });
    }
    if (p === "/api/page-data/import-finish/kamelayout.json") {
      posts.push(p);
      return new Response(null, { status: finishStatus });
    }
    if (p.startsWith("/api/code/kamelayout/")) {
      const key = p.slice("/api/code/kamelayout/".length);
      const entry = entries.find((e) => key === e.page + "/" + e.block);
      const body = entry
        ? stale
          ? "old content"
          : code(pages.get(entry.page), entry)
        : files.get(key);
      assert.notEqual(body, undefined);
      return new Response(body, {
        headers: { "content-type": key.endsWith(".css") ? "text/css" : "text/javascript" },
      });
    }
    throw Error("Unexpected endpoint " + p);
  };
  return {
    fetchImpl,
    pages,
    posts,
    setStale: () => {
      stale = true;
    },
  };
}
test("legacy sync preserves concurrent prose, backs up both public pages and is idempotent", async (t) => {
  const api = server({ concurrent: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kame-legacy-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const result = await publishPackage(pkg, target, {
    sid: "fake-session",
    fetchImpl: api.fetchImpl,
    backupDirectory: dir,
  });
  assert.equal(result.verifiedLegacyEntrypoints, 2);
  assert.ok(result.legacyEntrypoints.every((e) => e.action === "updated"));
  for (const entry of entries) {
    assert.ok(api.pages.get(entry.page).lines.includes("concurrent note"));
    assert.equal(
      managedLegacyCode(code(api.pages.get(entry.page), entry), entry).code,
      entry.code.trim(),
    );
  }
  const backup = JSON.parse(fs.readFileSync(path.join(dir, "previous-legacy.scrapbox.json")));
  assert.deepEqual(
    backup.pages.map((p) => p.title),
    ["Settings", "kame"],
  );
  assert.ok(!JSON.stringify(result).includes("existing prose"));
  const count = api.posts.length;
  const second = await publishPackage(pkg, target, {
    sid: "fake-session",
    fetchImpl: api.fetchImpl,
    backupDirectory: dir,
  });
  assert.equal(api.posts.length, count);
  assert.ok(second.legacyEntrypoints.every((e) => e.action === "unchanged"));
  api.setStale();
  await assert.rejects(
    () => verifyPublished(pkg, target, { fetchImpl: api.fetchImpl, retries: 1 }),
    /verification failed/,
  );
});
test("an unrecognised legacy block prevents publication before any write", async () => {
  const api = server({ unknown: true });
  await assert.rejects(
    () => publishPackage(pkg, target, { sid: "fake-session", fetchImpl: api.fetchImpl }),
    /Unrecognised/,
  );
  assert.equal(api.posts.length, 0);
});
test("a failed legacy import completion is reported and its pre-update backup remains", async (t) => {
  const api = server({ finishStatus: 403 }),
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "kame-legacy-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  await assert.rejects(
    () =>
      publishPackage(pkg, target, {
        sid: "fake-session",
        fetchImpl: api.fetchImpl,
        backupDirectory: dir,
      }),
    /Legacy entrypoint finish: HTTP 403/,
  );
  assert.ok(fs.existsSync(path.join(dir, "previous-legacy.scrapbox.json")));
});
