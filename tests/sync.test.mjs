import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  planSync,
  publishPackage,
  verifyPublished,
  cookieHeader,
} from "../tools/sync-scrapbox.mjs";
import { entryPage, managedMarker, packageFiles } from "../tools/scrapbox-package.mjs";

const target = { project: "kamelayout", page: entryPage };
const sid = "s%3Afake-session-for-tests";
const pkg = {
  pages: [
    {
      title: entryPage,
      lines: [
        entryPage,
        managedMarker,
        "code:style.css",
        " body { color: red; }",
        "",
        "code:script.js",
        ' console.info("test");',
        "",
      ],
    },
  ],
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function server({
  previous = null,
  guest = false,
  mismatch = false,
  importStatus = 200,
  finishStatus = 204,
} = {}) {
  const calls = [];
  let stored = previous;
  const fetchImpl = async (url, init = {}) => {
    assert.equal(new URL(url).origin, "https://scrapbox.io");
    assert.equal(init.redirect, "error");
    const pathname = new URL(url).pathname;
    const method = init.method ?? "GET";
    calls.push({ pathname, method, init });
    if (pathname === "/api/users/me")
      return json(guest ? { isGuest: true } : { id: "sync-user", csrfToken: "test-csrf" });
    if (pathname.startsWith("/api/pages/"))
      return stored
        ? json({ title: entryPage, lines: stored.pages[0].lines.map((text) => ({ text })) })
        : json({ message: "not found" }, 404);
    if (pathname === "/api/page-data/import/kamelayout.json") {
      assert.equal(method, "POST");
      assert.equal(init.headers.Cookie, `connect.sid=${sid}`);
      assert.equal(init.headers["X-CSRF-TOKEN"], "test-csrf");
      assert.equal(init.headers.Origin, "https://scrapbox.io");
      assert.equal(init.headers.Referer, "https://scrapbox.io/kamelayout/");
      assert.ok(init.body instanceof FormData);
      assert.equal(init.body.get("duplicateFileBetweenProject"), "false");
      if (importStatus !== 200) return json({ message: "denied" }, importStatus);
      const file = init.body.get("import-file");
      assert.equal(file.name, "kame-layout.scrapbox.json");
      stored = JSON.parse(await file.text());
      return json({ message: "import success! - 1 pages" });
    }
    if (pathname === "/api/page-data/import-finish/kamelayout.json")
      return new Response(null, { status: finishStatus });
    if (pathname.startsWith("/api/code/")) {
      const name = decodeURIComponent(pathname.slice("/api/code/kamelayout/".length));
      const body = stored ? packageFiles(stored).get(name) : undefined;
      return new Response(mismatch ? "wrong body" : (body ?? "missing"), {
        status: body === undefined ? 404 : 200,
        headers: {
          "content-type": name.endsWith(".css")
            ? "text/css; charset=utf-8"
            : "text/javascript; charset=utf-8",
        },
      });
    }
    throw new Error(`Unexpected test request: ${pathname}`);
  };
  return {
    calls,
    fetchImpl,
    get stored() {
      return stored;
    },
  };
}

test("sync plan is restricted to one marked delivery page and has no write side effects", () => {
  assert.equal(planSync(pkg, target).codeBlocks, 2);
  assert.throws(() =>
    planSync({ pages: [...pkg.pages, { title: "Settings", lines: ["Settings"] }] }, target),
  );
  assert.throws(() => planSync(pkg, { ...target, project: "../other" }));
  assert.throws(() => planSync(pkg, { ...target, page: "Settings" }));
  assert.throws(() => planSync({ pages: [{ ...pkg.pages[0], delete: true }] }, target));
  assert.throws(() => planSync({ ...pkg, deletedPages: ["Settings"] }, target));
});

test("session headers accept only a single cookie value", () => {
  assert.equal(cookieHeader(sid), `connect.sid=${sid}`);
  assert.equal(cookieHeader(`"${sid}"`), `connect.sid=${sid}`);
  assert.throws(() => cookieHeader(""));
  assert.throws(() => cookieHeader("token; other=value"));
  assert.throws(() => cookieHeader("token\r\nOrigin: evil"));
});

test("publication creates exactly one page, completes native import, and checks actual code responses", async () => {
  const api = server();
  const result = await publishPackage(pkg, target, { sid, fetchImpl: api.fetchImpl });
  assert.equal(result.action, "created");
  assert.equal(result.verifiedCodeBlocks, 2);
  assert.deepEqual(api.stored, pkg);
  assert.deepEqual(
    api.calls.filter((call) => call.method === "POST").map((call) => call.pathname),
    ["/api/page-data/import/kamelayout.json", "/api/page-data/import-finish/kamelayout.json"],
  );
});

test("identical published content performs no writes", async () => {
  const api = server({ previous: pkg });
  const result = await publishPackage(pkg, target, { sid, fetchImpl: api.fetchImpl });
  assert.equal(result.action, "unchanged");
  assert.equal(api.calls.filter((call) => call.method === "POST").length, 0);
});

test("an expired session cannot submit an import", async () => {
  const api = server({ guest: true });
  await assert.rejects(
    publishPackage(pkg, target, { sid, fetchImpl: api.fetchImpl }),
    /missing or expired/,
  );
  assert.equal(api.calls.length, 1);
});

test("an unmarked existing page cannot be overwritten", async () => {
  const previous = structuredClone(pkg);
  previous.pages[0].lines[1] = "My personal content";
  const api = server({ previous });
  await assert.rejects(
    publishPackage(pkg, target, { sid, fetchImpl: api.fetchImpl }),
    /Refusing to overwrite/,
  );
  assert.equal(api.calls.filter((call) => call.method === "POST").length, 0);
});

test("a managed update backs up only that page before replacing it", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kame-layout-sync-test-"));
  try {
    const previous = structuredClone(pkg);
    previous.pages[0].lines[3] = " body { color: blue; }";
    const api = server({ previous });
    const result = await publishPackage(pkg, target, {
      sid,
      fetchImpl: api.fetchImpl,
      backupDirectory: directory,
    });
    assert.equal(result.action, "updated");
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(directory, "previous.scrapbox.json"))),
      previous,
    );
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});

test("permission errors and incomplete import finish are reported as failures", async () => {
  const denied = server({ importStatus: 403 });
  await assert.rejects(
    publishPackage(pkg, target, { sid, fetchImpl: denied.fetchImpl }),
    /HTTP 403/,
  );
  assert.equal(
    denied.calls.some((call) => call.pathname.includes("import-finish")),
    false,
  );
  const unfinished = server({ finishStatus: 500 });
  await assert.rejects(
    publishPackage(pkg, target, { sid, fetchImpl: unfinished.fetchImpl }),
    /Import finish: HTTP 500/,
  );
});

test("publication verification rejects a successful HTTP response with wrong content", async () => {
  const api = server({ previous: pkg, mismatch: true });
  await assert.rejects(
    verifyPublished(pkg, target, { fetchImpl: api.fetchImpl, retries: 1 }),
    /verification failed/,
  );
});

test("transport exceptions never expose a session value", async () => {
  try {
    await publishPackage(pkg, target, {
      sid,
      fetchImpl: async () => {
        throw new Error(`sensitive: ${sid}`);
      },
    });
    assert.fail("Expected a network error");
  } catch (error) {
    assert.match(error.message, /network request failed/);
    assert.equal(error.message.includes(sid), false);
  }
});
