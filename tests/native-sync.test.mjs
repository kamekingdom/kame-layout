import assert from "node:assert/strict";
import test from "node:test";
import { publishPackage } from "../tools/sync-scrapbox.mjs";
import { createPackage, packageFiles } from "../tools/scrapbox-package.mjs";
import { compileNativeStyle, mergeNativeStyle } from "../tools/native-usercss.mjs";
const pkg = createPackage(),
  files = packageFiles(pkg),
  style = compileNativeStyle(pkg);
const target = {
  project: "kamelayout",
  page: "kame-layout:delivery",
  usercss: { project: "private-project", page: "Settings" },
};
const original = {
  title: "Settings",
  lines: [
    "Settings",
    "PRIVATE-CUSTOM",
    "code:style.css",
    ' @import "/api/code/kamelayout/kame-layout%3Adelivery/style.css";',
    " .local {color:red}",
  ],
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
function server({
  page = structuredClone(original),
  concurrent = false,
  stale = false,
  denied = false,
} = {}) {
  let stored = page,
    reads = 0;
  const posts = [];
  const fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname;
    if (path === "/api/users/me") return json({ id: "test-user" });
    if (path.startsWith("/api/pages/private-project/")) {
      if (denied) return json({ secret: "PRIVATE-DATA" }, 403);
      reads++;
      if (concurrent && reads === 2)
        stored = {
          ...stored,
          lines: [...stored.lines.slice(0, 1), "PRIVATE-NEW-LINE", ...stored.lines.slice(1)],
        };
      return json(stored);
    }
    if (path.startsWith("/api/pages/kamelayout/")) return json(pkg.pages[0]);
    if (path === "/api/page-data/import/private-project.json") {
      assert.equal(init.headers.Cookie, "connect.sid=test-session");
      assert.equal(init.headers.Referer, "https://scrapbox.io/private-project/");
      const data = JSON.parse(await init.body.get("import-file").text());
      assert.equal(data.pages.length, 1);
      assert.equal(data.pages[0].title, "Settings");
      stored = data.pages[0];
      posts.push(path);
      return json({ ok: true });
    }
    if (path === "/api/page-data/import-finish/private-project.json") {
      posts.push(path);
      return new Response(null, { status: 204 });
    }
    if (path.startsWith("/api/code/private-project/")) {
      const start = stored.lines.indexOf("code:style.css") + 1;
      const body = stored.lines
        .slice(start)
        .map((l) => l.slice(1))
        .join("\n");
      return new Response(stale ? "old CSS" : body, { headers: { "content-type": "text/css" } });
    }
    if (path.startsWith("/api/code/kamelayout/")) {
      const key = decodeURIComponent(path.slice("/api/code/kamelayout/".length)),
        body = files.get(key);
      assert.notEqual(body, undefined);
      return new Response(body, {
        headers: { "content-type": key.endsWith(".css") ? "text/css" : "text/javascript" },
      });
    }
    throw new Error("Unexpected test endpoint");
  };
  return {
    fetchImpl,
    posts,
    get page() {
      return stored;
    },
  };
}
test("native publication preserves custom content, uses latest preflight and does not expose private data", async () => {
  const api = server({ concurrent: true });
  const result = await publishPackage(pkg, target, {
    sid: "test-session",
    fetchImpl: api.fetchImpl,
  });
  assert.equal(result.nativeUsercss.verified, true);
  assert.equal(result.nativeUsercss.action, "updated");
  assert.ok(api.page.lines.includes("PRIVATE-CUSTOM"));
  assert.ok(api.page.lines.includes("PRIVATE-NEW-LINE"));
  assert.ok(api.page.lines.includes(" .local {color:red}"));
  assert.ok(!JSON.stringify(result).includes("PRIVATE-CUSTOM"));
  assert.ok(!JSON.stringify(pkg).includes("PRIVATE-CUSTOM"));
  assert.deepEqual(api.posts, [
    "/api/page-data/import/private-project.json",
    "/api/page-data/import-finish/private-project.json",
  ]);
});
test("native publication verifies without writes if the managed CSS is already current", async () => {
  const api = server({
    page: mergeNativeStyle(original, target.usercss, target.project, style.css),
  });
  const result = await publishPackage(pkg, target, {
    sid: "test-session",
    fetchImpl: api.fetchImpl,
  });
  assert.equal(result.nativeUsercss.action, "unchanged");
  assert.equal(api.posts.length, 0);
});
test("unrecognised or inaccessible consumer prevents any write", async () => {
  for (const opts of [
    { denied: true },
    { page: { ...original, lines: ["Settings", "code:style.css", " .manual {}"] } },
  ]) {
    const api = server(opts);
    await assert.rejects(() =>
      publishPackage(pkg, target, { sid: "test-session", fetchImpl: api.fetchImpl }),
    );
    assert.equal(api.posts.length, 0);
  }
});
test("a stale native CSS response cannot be reported as successful", async () => {
  const api = server({ stale: true });
  await assert.rejects(
    () => publishPackage(pkg, target, { sid: "test-session", fetchImpl: api.fetchImpl }),
    /markers|match/,
  );
});
