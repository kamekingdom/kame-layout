import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium, webkit } from "@playwright/test";
import { root, read, migration } from "./project.mjs";
import { packageFiles, entryPage } from "./scrapbox-package.mjs";

const live = process.argv.includes("--live");
const safari = process.argv.includes("--webkit");
const engine = safari ? "webkit" : "chromium";
const output = path.join(root, `.cache/browser-${engine}${live ? "-live" : ""}`);
fs.mkdirSync(output, { recursive: true });
const baseline = new Map();
for (const filename of [
  "style.css",
  "script.js",
  ...migration.files.map((item) => item.originalPath),
]) {
  baseline.set(
    filename,
    execFileSync("git", ["show", `${migration.baseline}:${filename}`], { cwd: root }),
  );
}
const browser = await (safari
  ? webkit.launch({ headless: true })
  : chromium.launch({ channel: "chrome", headless: true }));
const report = [];
const packaged = packageFiles(JSON.parse(read("dist/kame-layout.scrapbox.json")));

async function capture(version, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const errors = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isBaseline = url.pathname.startsWith("/__kame-layout-test/baseline/");
    const isPackage = url.pathname.startsWith(`/api/code/kamelayout/${entryPage}/`);
    if (isPackage && live) return route.continue();
    if (url.hostname === "scrapbox.io" && (isBaseline || isPackage)) {
      const pathname = decodeURIComponent(url.pathname);
      const filename = pathname.slice(
        isBaseline ? "/__kame-layout-test/baseline/".length : "/api/code/kamelayout/".length,
      );
      const body = isBaseline ? baseline.get(filename) : packaged.get(filename);
      const contentType = filename.endsWith(".css")
        ? "text/css"
        : filename.endsWith(".js")
          ? "text/javascript"
          : "text/plain";
      return route.fulfill({
        status: body !== undefined ? 200 : 404,
        body: body ?? "Missing source",
        contentType,
        headers: { "access-control-allow-origin": "*" },
      });
    }
    // This is a public-page comparison, with no account cookies or remote writes.
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("https://scrapbox.io/kamelayout/テストページ", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.locator(".lines .line").first().waitFor({ timeout: 30000 });
  await page
    .locator('link[href*="/api/code/"]')
    .evaluateAll((links) => links.forEach((link) => link.remove()));
  const base =
    version === "baseline"
      ? "https://scrapbox.io/__kame-layout-test/baseline"
      : `https://scrapbox.io/api/code/kamelayout/${entryPage}`;
  await page.addStyleTag({ url: `${base}/style.css` });
  const importError = await page.evaluate(async (url) => {
    try {
      await import(url);
      return null;
    } catch (error) {
      return error.message;
    }
  }, `${base}/script.js`);
  assert.equal(importError, null, `${version} import failed`);
  await page.evaluate(() => document.fonts.ready);
  // The original character-counter waits three seconds before it initialises.
  await page.waitForTimeout(3400);
  const selectors = [
    "body",
    ".navbar",
    ".page",
    ".lines",
    ".line",
    ".line .text",
    "#__charCounter__",
    ".kgv-launch",
  ];
  const styles = await page.evaluate(
    (selectors) =>
      Object.fromEntries(
        selectors.map((selector) => [
          selector,
          [...document.querySelectorAll(selector)].slice(0, 15).map((element) => {
            const style = getComputedStyle(element);
            return Object.fromEntries(
              [...style].map((property) => [property, style.getPropertyValue(property)]),
            );
          }),
        ]),
      ),
    selectors,
  );
  const screenshot = await page.screenshot({
    path: path.join(output, `${version}-${viewport.width}.png`),
    animations: "disabled",
  });
  const controls = await page.evaluate(() => ({
    graphButtons: document.querySelectorAll(".kgv-launch").length,
    characterCounter: document.querySelector("#__charCounter__")?.textContent ?? null,
  }));
  assert.equal(controls.graphButtons, 1, `${version} graph button`);
  await page.keyboard.press("Control+Shift+g");
  await page.locator("#kame-graph-view").waitFor({ state: "visible", timeout: 10000 });
  const graphVisible = await page.locator("#kame-graph-view").isVisible();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#kame-graph-view").isVisible(), false);
  const result = {
    styles,
    controls,
    graphVisible,
    errors: [...new Set(errors)].sort(),
    screenshot,
  };
  await context.close();
  return result;
}

try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const before = await capture("baseline", viewport);
    const after = await capture("current", viewport);
    assert.deepEqual(after.styles, before.styles, `Computed styles changed at ${viewport.width}px`);
    assert.deepEqual(
      after.controls,
      before.controls,
      `Feature controls changed at ${viewport.width}px`,
    );
    assert.deepEqual(after.errors, before.errors, `New runtime errors at ${viewport.width}px`);
    assert.ok(
      after.screenshot.equals(before.screenshot),
      `Screenshot differs at ${viewport.width}px: see ${output}`,
    );
    report.push({
      viewport,
      computedStylesEqual: true,
      screenshotsEqual: true,
      controlsEqual: true,
      graphOpenClose: true,
      source: live
        ? "published Scrapbox API (not replaced)"
        : "generated package with test responses",
      engine,
      existingGuestPageErrors: before.errors,
    });
    console.log(
      `PASS ${viewport.width}px: identical screenshots/styles; Script import, counter and graph controls checked.`,
    );
  }
} finally {
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
