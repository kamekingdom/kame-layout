import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium, webkit } from "@playwright/test";
import { compileStyles } from "./styles.mjs";
const safari = process.argv.includes("--webkit"),
  live = process.argv.includes("--live");
const engine = safari ? "webkit" : "chromium";
const out = `.cache/code-blocks/${engine}${live ? "-live" : ""}`;
fs.mkdirSync(out, { recursive: true });
const copyBaseline = process.argv.includes("--copy-baseline");
const headerBaseline = process.argv.includes("--header-baseline");
const widthBaseline = process.argv.includes("--width-baseline");
const baseline = copyBaseline
  ? "e26781125d4c5f41c0b76d9125fb59a035f9f925"
  : widthBaseline
    ? "2ed01b21a35dae4963d114c5f48fa013d68b7a0a"
    : headerBaseline
      ? "b596a99c9c44a90464567b115e75813066b4a468"
      : "1aeafc15e8ed55cc0306cb7d1fe628c127f2b10a";
const before = compileStyles("style.css", (f) =>
  execFileSync("git", ["show", `${baseline}:${f}`], {
    encoding: "utf8",
  }),
);
const after = compileStyles("style.css");
let liveStyles;
if (live) {
  const base = "https://scrapbox.io/api/code/kamelayout/kame-layout%3Adelivery/";
  const response = await fetch(base + "loader.js?reload=" + crypto.randomUUID(), {
    cache: "no-store",
  });
  assert.ok(response.ok, "Published loader is available");
  const revision = (await response.text()).match(/const version = "([a-f0-9]{64})"/)?.[1];
  assert.ok(revision, "Published loader exposes its revision");
  liveStyles = base + "style.css?v=" + revision;
}
const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const line = (text, level = 0, start = false) =>
  `<div class="line"><span class="text code-block${start ? " start" : ""}"><span class="indent-mark" style="width:${level * 1.5}em"></span><span class="indent" style="margin-left:${level * 1.5}em">${start ? `<code class="code-start"><span class="code-block-start"><span title="json"><a href="#">${escape(text)}</a></span><span class="tool-buttons"><span title="Copy" class="button copy"><i class="far fa-copy"></i></span></span></span></code>` : `<code class="code-body highlight"><span>${text}</span></code>`}</span></span></div>`;
const block = (name = "JSON", level = 0) =>
  line(name, level, true) +
  [
    "{",
    '  <span class="hljs-attr">"alg"</span>: <span class="hljs-string">"RS256"</span>,',
    '  <span class="hljs-attr">"typ"</span>: <span class="hljs-string">"JWT"</span>',
    "}",
  ]
    .map((s) => line(s, level + 1))
    .join("");
const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://scrapbox.io/assets/css/app.css"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"><style>body{padding:24px;background:white}.lines{position:relative;margin:0}.fixture{margin:0 auto 30px;max-width:880px}.line{position:relative}.outside{margin:12px 0}</style><main>${["sample", "wide", "nested", "adjacent", "empty", "long"].map((id) => `<section class="fixture lines" id="${id}">${id === "sample" ? block() : id === "wide" ? line("bash", 0, true) + line(escape('cd /d "C:\\sample\\' + "long-folder-name-".repeat(24) + '"'), 1) : id === "nested" ? block("nested.json", 2) : id === "adjacent" ? block() + block("next.json") : id === "empty" ? line("empty.json", 0, true) : block("very-long-code-block-file-name-without-spaces.json")}</section>`).join("")}<p class="outside">通常の本文</p></main>`;
const browser = await (safari
  ? webkit.launch()
  : chromium.launch(process.env.CI ? {} : { channel: "chrome" }));
try {
  for (const width of [1440, 834, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    await page.route("https://scrapbox.io/__kame-layout-test/code-blocks", (r) =>
      r.fulfill({ contentType: "text/html", body: html }),
    );
    await page.goto("https://scrapbox.io/__kame-layout-test/code-blocks");
    const sheet = await page.addStyleTag({ content: before });
    await page.evaluate(() => document.fonts.ready);
    const original = await page.locator("main").textContent();
    await page.locator("#sample .copy").hover();
    await page.locator("#sample").screenshot({ path: `${out}/before-${width}.png` });
    const detail = async (name) => {
      const box = await page.locator("#sample .tool-buttons").boundingBox();
      await page.screenshot({
        path: `${out}/${name}-button-${width}.png`,
        clip: { x: box.x - 12, y: box.y - 12, width: box.width + 24, height: box.height + 24 },
      });
    };
    await detail("before");
    await page.locator("#wide").screenshot({ path: `${out}/wide-before-${width}.png` });
    const normal = await page
      .locator(".outside")
      .evaluate((e) => getComputedStyle(e).cssText + e.getBoundingClientRect().width);
    await sheet.evaluate((e) => e.remove());
    if (live)
      await page.addStyleTag({
        url: liveStyles,
      });
    else await page.addStyleTag({ content: after });
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page.locator("main").textContent(),
      original,
      "Code and file names stay intact",
    );
    assert.equal(
      await page
        .locator(".outside")
        .evaluate((e) => getComputedStyle(e).cssText + e.getBoundingClientRect().width),
      normal,
      "Normal text stays unchanged",
    );
    const groups = await page.locator(".fixture").evaluateAll((es) =>
      es.map((e) =>
        [...e.querySelectorAll(".code-block > .indent")].map((n) => ({
          x: n.getBoundingClientRect().x,
          right: n.getBoundingClientRect().right,
          bg: getComputedStyle(n).backgroundColor,
        })),
      ),
    );
    for (const group of groups)
      for (const row of group)
        assert.ok(
          Math.abs(row.right - group[0].right) < 1.5 && Math.abs(row.x - group[0].x) < 1.5,
          "Header and body edges align",
        );
    assert.equal(
      await page
        .locator("#sample .code-block-start")
        .evaluate((e) => getComputedStyle(e).borderTopLeftRadius),
      "24px",
    );
    assert.equal(
      await page
        .locator("#sample .line")
        .last()
        .locator(".indent")
        .evaluate((e) => getComputedStyle(e).borderBottomLeftRadius),
      "24px",
    );
    const button = await page.locator("#sample .copy").boundingBox();
    assert.ok(
      await page
        .locator("#sample .code-block-start")
        .evaluate(
          (e) =>
            parseFloat(getComputedStyle(e).fontSize) <
            parseFloat(getComputedStyle(document.querySelector("#sample .code-body")).fontSize),
        ),
      "Header typography stays smaller than code",
    );
    assert.equal(button.width, 28);
    assert.equal(button.height, 28);
    assert.ok(await page.locator("#sample .copy").isVisible());
    assert.ok(
      (await page
        .locator("#sample .hljs-string")
        .first()
        .evaluate((e) => getComputedStyle(e).color)) !==
        (await page
          .locator("#sample .code-body")
          .first()
          .evaluate((e) => getComputedStyle(e).color)),
      "Syntax colors remain",
    );
    const hitGeometry = await page.locator("#sample .copy").evaluate((e) => {
      const b = e.getBoundingClientRect(),
        icon = e.querySelector("i").getBoundingClientRect(),
        slot = e.parentElement.getBoundingClientRect();
      return {
        centerDeltaX: icon.x + icon.width / 2 - b.x - b.width / 2,
        centerDeltaY: icon.y + icon.height / 2 - b.y - b.height / 2,
        slot: slot.toJSON(),
        button: b.toJSON(),
        radius: getComputedStyle(e).borderRadius,
        hits: [
          [0.5, 0.5, true],
          [0.1, 0.5, true],
          [0.9, 0.5, true],
          [0.5, 0.1, true],
          [0.5, 0.9, true],
          [0.01, 0.01, false],
          [0.99, 0.01, false],
          [0.01, 0.99, false],
          [0.99, 0.99, false],
        ].map(([x, y, inside]) => ({
          inside,
          hit:
            document.elementFromPoint(b.x + b.width * x, b.y + b.height * y)?.closest(".copy") ===
            e,
        })),
      };
    });
    assert.deepEqual(
      hitGeometry.slot,
      hitGeometry.button,
      "Paint and pointer target use exactly the same circle",
    );
    assert.ok(
      Math.abs(hitGeometry.centerDeltaX) < 0.5 && Math.abs(hitGeometry.centerDeltaY) < 0.5,
      "Copy glyph is centered",
    );
    assert.equal(hitGeometry.radius, "50%");
    for (const point of hitGeometry.hits)
      assert.equal(point.hit, point.inside, "Only points inside the visible circle target Copy");
    await page.locator("#sample .copy").hover();
    await page.locator("#sample").screenshot({ path: `${out}/after-${width}.png` });
    await detail("after");
    const fit = await page.locator("#wide .code-body").evaluate((e) => {
      const span = e.querySelector("span"),
        range = document.createRange();
      range.selectNodeContents(span);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0),
        panel = e.closest(".indent").getBoundingClientRect();
      return {
        gap: panel.right - 12 - rects[0].right,
        rows: rects.length,
        padding: getComputedStyle(e.closest(".indent")).paddingRight,
      };
    });
    assert.ok(
      fit.rows > 1 && fit.gap >= -0.5 && fit.gap < 12,
      "Long code fills the available width before wrapping",
    );
    assert.equal(fit.padding, "12px");
    const iconGap = await page
      .locator("#sample .fa-copy")
      .evaluate(
        (e) =>
          e.closest(".code-block-start").getBoundingClientRect().right -
          e.getBoundingClientRect().right,
      );
    assert.ok(
      iconGap >= 19 && iconGap <= 22,
      `Copy circle has a balanced right inset (${iconGap})`,
    );
    await page.locator("#wide").screenshot({ path: `${out}/wide-after-${width}.png` });
    const bounds = () =>
      page
        .locator(".code-block-start, .tool-buttons, .code-body")
        .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    const normalBounds = await bounds();
    await page.locator(".tool-buttons").evaluateAll((es) =>
      es.forEach((e) => {
        e.dataset.normal = e.innerHTML;
        e.textContent = "Copied";
      }),
    );
    assert.deepEqual(
      await bounds(),
      normalBounds,
      "Copied does not move or resize headers, controls or code",
    );
    assert.equal(
      await page
        .locator("#sample .tool-buttons")
        .evaluate((e) => getComputedStyle(e, "::after").content),
      '"✓"',
    );
    await page.locator("#sample").screenshot({ path: `${out}/copied-${width}.png` });
    await detail("copied");
    await page.locator(".tool-buttons").evaluateAll((es) =>
      es.forEach((e) => {
        e.innerHTML = e.dataset.normal;
        delete e.dataset.normal;
      }),
    );
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "No page overflow",
    );
    console.log(
      `PASS ${engine} ${width}: aligned panels, adjacent/nested/empty blocks, native copy target, syntax colors and intact text`,
    );
    await page.close();
  }
  if (!safari && !live) {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    await page.goto("https://scrapbox.io/kamelayout/コードブロックのuserCSS");
    // Native buttons temporarily replace .copy with a Copied indicator. Target
    // the file explicitly so the next click never selects a different block.
    const copy = page.locator('.code-block-start:has(a[href$="/style.css"]) .copy');
    async function copiedText(point) {
      await copy.waitFor({ state: "visible" });
      await copy.scrollIntoViewIfNeeded();
      await page.evaluate(() => navigator.clipboard.writeText("kame-layout copy check"));
      if (point) {
        const box = await copy.boundingBox();

        await page.mouse.click(box.x + box.width * point[0], box.y + box.height * point[1]);
      } else await copy.click();
      for (let attempt = 0; attempt < 30; attempt++) {
        const text = await page.evaluate(() => navigator.clipboard.readText());
        if (text !== "kame-layout copy check") {
          await page
            .locator('.code-block-start:has(a[href$="/style.css"]) .tool-buttons:not(:has(.copy))')
            .waitFor({ state: "visible" });
          return text;
        }
        await page.waitForTimeout(100);
      }
      await page.screenshot({ path: out + "/native-failure.png" });
      throw new Error("Native copy did not update the clipboard: " + JSON.stringify(point));
    }
    const expected = await copiedText();
    assert.ok(expected.length > 100);
    await page.addStyleTag({ content: after });
    await copy.waitFor({ state: "visible" });
    const header = page.locator('.code-block-start:has(a[href$="/style.css"])');
    const normalSize = await header.evaluate((e) => ({
      header: e.getBoundingClientRect().toJSON(),
      control: e.querySelector(".tool-buttons").getBoundingClientRect().toJSON(),
    }));
    assert.equal(
      normalSize.control.width,
      28,
      "Native page uses the new circular width even with older styles present",
    );
    assert.equal(normalSize.control.height, 28);
    assert.equal(await copiedText(), expected, "Native copy result remains unchanged");
    const copiedSize = await header.evaluate((e) => ({
      header: e.getBoundingClientRect().toJSON(),
      control: e.querySelector(".tool-buttons").getBoundingClientRect().toJSON(),
    }));
    assert.equal(copiedSize.header.height, normalSize.header.height);
    assert.equal(copiedSize.header.width, normalSize.header.width);
    assert.equal(copiedSize.control.width, normalSize.control.width);
    assert.equal(copiedSize.control.height, normalSize.control.height);
    for (const point of [
      [0.5, 0.5],
      [0.1, 0.5],
      [0.9, 0.5],
    ])
      assert.equal(
        await copiedText(point),
        expected,
        "Circle center and sides copy the original code",
      );
    await copy.waitFor({ state: "visible" });
    const box = await copy.boundingBox();
    await page.evaluate(() => navigator.clipboard.writeText("outside-circle"));
    await page.mouse.click(box.x + 1, box.y + 1);
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      "outside-circle",
      "Outside the circle must not copy",
    );
    console.log("PASS native Scrapbox copy: circular hit target and unchanged copied code");
    await context.close();
  }
} finally {
  await browser.close();
}
