import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium, webkit } from "@playwright/test";
import { root } from "./project.mjs";
import { compileStyles } from "./styles.mjs";

const revision = "10150857556e6b6c95c666837d3867924a1d57a7";
const safari = process.argv.includes("--webkit");
const live = process.argv.includes("--live");
const engine = safari ? "webkit" : "chromium";
const output = path.join(root, `.cache/pinned-titles/${engine}${live ? "-live" : ""}`);
fs.mkdirSync(output, { recursive: true });
const originals = new Map();
const beforeCss = compileStyles("style.css", (filename) => {
  if (!originals.has(filename))
    originals.set(
      filename,
      execFileSync("git", ["show", `${revision}:${filename}`], { cwd: root, encoding: "utf8" }),
    );
  return originals.get(filename);
});
const afterCss = compileStyles("style.css");
const titles = [
  "kame",
  "研究テーマ",
  "応用情報技術者試験",
  "GPU Workstationの管理用ページ",
  "VeryLongPinnedPageTitleWithoutAnySpaces0123456789",
];
const html = `<!doctype html><html data-hover-visible><head><meta charset="utf-8">
<link rel="stylesheet" href="https://scrapbox.io/assets/css/app.css">
<style>body {padding: 20px;} .page-list .grid {padding:0;display:flex;flex-wrap:wrap;gap:16px;} .pin-test-row {margin-bottom:24px;}</style>
</head><body>${[130, 156, 200].map((width) => `<section class="page-list pin-test-row"><ul class="grid">${[...titles, "通常カードの長いタイトルは今まで通り表示"].map((title, index) => `<li class="page-list-item grid-style-item${index < titles.length ? " pin" : ""}" data-page-title="${title}" data-test-width="${width}" style="width:${width}px;height:${width + 16}px"><a href="#" style="height:100%"><div class="hover"></div><div class="pin"></div><div class="content"><div class="header${index < titles.length ? " pinned" : ""}"><div class="title">${title}</div></div><div class="description">通常カードの説明文</div></div></a></li>`).join("")}</ul></section>`).join("")}</body></html>`;
const browser = await (safari
  ? webkit.launch({ headless: true })
  : chromium.launch({ channel: "chrome", headless: true }));
const report = [];

async function capture(version, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  // A same-origin fixture keeps Scrapbox's image embedding policy intact.
  const fixtureUrl = "https://scrapbox.io/__kame-layout-test/pinned-titles";
  await page.route(fixtureUrl, (route) => route.fulfill({ contentType: "text/html", body: html }));
  await page.goto(fixtureUrl, { waitUntil: "load" });
  if (version === "after" && live)
    await page.addStyleTag({
      url: "https://scrapbox.io/api/code/kamelayout/kame-layout:delivery/style.css",
    });
  else await page.addStyleTag({ content: version === "before" ? beforeCss : afterCss });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const cards = await page.locator("li.page-list-item").evaluateAll((elements) =>
    elements.map((card) => {
      const title = card.querySelector(".title"),
        header = card.querySelector(".header"),
        content = card.querySelector(".content");
      const style = getComputedStyle(title),
        range = document.createRange();
      range.selectNodeContents(title);
      return {
        title: card.dataset.pageTitle,
        pinned: card.classList.contains("pin"),
        width: Number(card.dataset.testWidth),
        card: card.getBoundingClientRect().toJSON(),
        header: header.getBoundingClientRect().toJSON(),
        label: title.getBoundingClientRect().toJSON(),
        clientWidth: title.clientWidth,
        scrollWidth: title.scrollWidth,
        lineRects: [...range.getClientRects()].map((r) => r.toJSON()),
        whiteSpace: style.whiteSpace,
        overflow: style.overflow,
        textOverflow: style.textOverflow,
        lineHeight: parseFloat(style.lineHeight),
        decoration: Object.fromEntries(
          [
            "font-family",
            "font-size",
            "font-weight",
            "font-style",
            "letter-spacing",
            "background-image",
            "color",
          ].map((p) => [p, style.getPropertyValue(p)]),
        ),
        background: getComputedStyle(content).backgroundImage,
        normalStyles: card.classList.contains("pin")
          ? null
          : [card, header, title, content, card.querySelector(".description")].map((e) => {
              const s = getComputedStyle(e);
              return Object.fromEntries([...s].map((p) => [p, s.getPropertyValue(p)]));
            }),
      };
    }),
  );
  await page.screenshot({
    path: path.join(output, `${version}-${viewport.width}.png`),
    fullPage: true,
    animations: "disabled",
  });
  if (version === "after" && viewport.width === 1440) {
    const samples = cards.filter(
      (card) =>
        card.width === 156 &&
        ["研究テーマ", "応用情報技術者試験", "GPU Workstationの管理用ページ"].includes(card.title),
    );
    const x = Math.floor(Math.min(...samples.map((card) => card.card.x)));
    const y = Math.floor(Math.min(...samples.map((card) => card.card.y)));
    const right = Math.ceil(Math.max(...samples.map((card) => card.card.right)));
    const bottom = Math.ceil(Math.max(...samples.map((card) => card.card.bottom)));
    await page.screenshot({
      path: path.join(output, "preview.png"),
      clip: { x, y, width: right - x, height: bottom - y },
      animations: "disabled",
    });
  }
  await context.close();
  return cards;
}

try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 834, height: 1194 },
    { width: 390, height: 844 },
  ]) {
    const before = await capture("before", viewport),
      after = await capture("after", viewport);
    assert.ok(
      before.some((card) => card.title === "応用情報技術者試験" && card.lineRects.length > 1),
      "Original wrapping issue is reproduced",
    );
    for (const [index, card] of after.entries()) {
      const previous = before[index];
      assert.equal(card.title, previous.title);
      assert.deepEqual(card.card, previous.card, "Card dimensions and positions remain unchanged");
      if (!card.pinned) {
        assert.deepEqual(
          card.normalStyles,
          previous.normalStyles,
          "Normal card styles stay unchanged",
        );
        continue;
      }
      assert.deepEqual(
        card.decoration,
        previous.decoration,
        "Title font, gradient and spacing stay unchanged",
      );
      assert.equal(card.background, previous.background, "Pinned images stay unchanged");
      assert.equal(card.whiteSpace, "nowrap");
      assert.equal(card.overflow, "hidden");
      assert.equal(card.textOverflow, "ellipsis");
      assert.ok(
        card.header.x >= card.card.x - 0.1 && card.header.right <= card.card.right + 0.1,
        "Header fits inside card",
      );
      assert.ok(
        card.label.x >= card.header.x && card.label.right <= card.header.right + 0.1,
        "Title fits inside header",
      );
      assert.ok(card.label.height <= card.lineHeight + 0.5, "Title occupies one line");
      if (["kame", "研究テーマ"].includes(card.title))
        assert.ok(card.scrollWidth <= card.clientWidth + 1, "Short titles remain complete");
      else if (card.width <= 156 || card.title.startsWith("VeryLong"))
        assert.ok(card.scrollWidth > card.clientWidth, "Overlong titles are clipped for ellipsis");
    }
    report.push({
      engine,
      viewport,
      cards: after.length,
      oneLineEllipsis: true,
      shortTitlesComplete: true,
      normalCardsUnchanged: true,
      fontsAndImagesUnchanged: true,
      source: live ? "published Scrapbox API" : "generated CSS",
    });
    console.log(
      `PASS ${engine} ${viewport.width}px: one-line pinned titles at 130/156/200px; normal cards unchanged.`,
    );
  }
} finally {
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
