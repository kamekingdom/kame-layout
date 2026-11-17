import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium, webkit } from "@playwright/test";
import { createPackage, packageFiles, entryPage } from "./scrapbox-package.mjs";
import { read } from "./project.mjs";
const safari = process.argv.includes("--webkit"),
  engine = safari ? "webkit" : "chromium";
const versions = [
  packageFiles(createPackage()),
  packageFiles(
    createPackage(
      (f) => read(f) + (f === "src/features/graph-view/colors.js" ? "\n/* next deployment */" : ""),
    ),
  ),
];
const hashes = versions.map(
  (files) => files.get(`${entryPage}/loader.js`).match(/const version = "([a-f0-9]{64})"/)[1],
);
const base = `https://scrapbox.io/api/code/kamelayout/${encodeURIComponent(entryPage)}/`;
const fixture = "https://scrapbox.io/__kame-layout-test/delivery";
const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${base}local.css"><p class="marker">最新バージョンの読み込み確認</p><p class="local">Settingsの独自CSS</p>`;
const browser = await (safari
  ? webkit.launch()
  : chromium.launch(process.env.CI ? {} : { channel: "chrome" }));
const context = await browser.newContext({ serviceWorkers: "block" });
const page = await context.newPage();
let revision = 0,
  fail = false;
const requests = [];
await context.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (url.href === fixture) return route.fulfill({ contentType: "text/html", body: html });
  if (!decodeURIComponent(url.pathname).startsWith(`/api/code/kamelayout/${entryPage}/`))
    return route.continue();
  const name = url.pathname.split("/").at(-1);
  requests.push({ revision, name, query: url.search });
  const hash = hashes[revision];
  let body,
    type = name.endsWith(".css") ? "text/css" : "text/javascript";
  if (name === "local.css")
    body = `@import "${base}style.css"; .local {color:rgb(123, 45, 67)} .marker {font-weight:700}`;
  else if (name === "loader.js") body = versions[revision].get(`${entryPage}/loader.js`);
  // Unversioned requests deliberately keep returning an old release forever.
  else if (!url.searchParams.has("v"))
    body = name.endsWith(".css")
      ? ".marker{color:rgb(200,0,0)}"
      : 'throw new Error("stale script");';
  else {
    assert.equal(
      url.searchParams.get("v"),
      hash,
      "Every nested request must carry the current revision",
    );
    if (fail && name === "style.css")
      return route.fulfill({ status: 503, contentType: type, body: "unavailable" });
    if (name === "style.css")
      body = `@import "./asset.css?v=${hash}"; .marker {color:rgb(0,80,${revision + 100})}`;
    else if (name === "script.js")
      body = `import {value} from './helper.js?v=${hash}'; window.installed=(window.installed||0)+1; window.release=value;`;
    else if (name === "helper.js")
      body = `import {value} from './leaf.js?v=${hash}';export {value};`;
    else if (name === "leaf.js")
      body = `const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./asset.css?v=${hash}',import.meta.url);document.head.appendChild(link);export const value=${revision};`;
    else if (name === "asset.css") body = ".marker {font-size:16px}";
  }
  assert.equal(typeof body, "string", name);
  return route.fulfill({
    contentType: type,
    body,
    headers: { "cache-control": "public, max-age=86400" },
  });
});
async function load() {
  return page.evaluate(async (base) => {
    try {
      await import(base + "loader.js?reload=" + crypto.randomUUID());
      return null;
    } catch (e) {
      return e.message;
    }
  }, base);
}
try {
  for (revision = 0; revision < 2; revision++) {
    if (revision === 0) await page.goto(fixture);
    else await page.reload();
    assert.equal(await load(), null);
    assert.equal(await load(), null);
    assert.equal(
      await page.evaluate(() => window.installed),
      1,
      "Duplicate loader imports do not install twice",
    );
    assert.equal(
      await page.evaluate(() => window.release),
      revision,
      "Reload obtains the new nested modules",
    );
    assert.equal(
      await page.locator(".marker").evaluate((e) => getComputedStyle(e).color),
      `rgb(0, 80, ${revision + 100})`,
    );
    assert.equal(
      await page.locator(".local").evaluate((e) => getComputedStyle(e).color),
      "rgb(123, 45, 67)",
    );
    assert.equal(
      await page.locator(".marker").evaluate((e) => getComputedStyle(e).fontWeight),
      "700",
      "Local Settings override stays in its original position",
    );
    assert.equal(
      await page.evaluate(
        () => document.querySelector('link[href$="local.css"]').sheet.cssRules.length,
      ),
      2,
      "Only the legacy import is removed",
    );
    console.log(
      `PASS ${engine}: release ${revision + 1}, stale cache bypass, nested CSS/JS, local CSS and duplicate guard`,
    );
  }
  revision = 1;
  fail = true;
  await page.goto(fixture);
  assert.notEqual(await load(), null);
  assert.equal(
    await page.locator(".marker").evaluate((e) => getComputedStyle(e).color),
    "rgb(200, 0, 0)",
    "Failed CSS load preserves legacy fallback",
  );
  assert.equal(await page.evaluate(() => window.installed), undefined);
  fs.mkdirSync(`.cache/delivery-${engine}`, { recursive: true });
  fs.writeFileSync(
    `.cache/delivery-${engine}/requests.json`,
    JSON.stringify(requests, null, 2) + "\n",
  );
  console.log(`PASS ${engine}: load failure preserves fallback and does not execute scripts`);
} finally {
  await browser.close();
}
