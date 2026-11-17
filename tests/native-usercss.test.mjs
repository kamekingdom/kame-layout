import assert from "node:assert/strict";
import test from "node:test";
import postcss from "postcss";
import { createPackage } from "../tools/scrapbox-package.mjs";
import {
  compileNativeStyle,
  mergeNativeStyle,
  styleStart,
  styleEnd,
  managedStyleFromCode,
} from "../tools/native-usercss.mjs";
const target = { project: "private-project", page: "Settings" };
const original = {
  title: "Settings",
  lines: [
    "Settings",
    "private prose",
    "code:style.css",
    '\t@import "/api/code/kamelayout/kame-layout%3Adelivery/style.css";',
    "\t.local { color: red; }",
    "",
    "code:other.txt",
    " private text",
  ],
};
test("native CSS is a self-contained stylesheet with fonts first and the delivery revision", () => {
  const { css, version } = compileNativeStyle(createPackage());
  const tree = postcss.parse(css);
  const imports = [];
  tree.walkAtRules("import", (r) => imports.push(r));
  assert.equal(imports.length, 1);
  assert.ok(imports[0].params.includes("fonts.googleapis.com"));
  assert.equal(tree.nodes[0], imports[0]);
  assert.ok(css.includes(`--kame-layout-inline-version: "${version}"`));
  assert.ok(css.includes("word-break: break-all"));
  assert.ok(css.includes("--bulletin-board"));
  assert.ok(!imports.some((r) => r.params.includes("/api/code/")));
});
test("initial migration changes only the recognised import and subsequent updates only the markers", () => {
  const first = mergeNativeStyle(original, target, "kamelayout", "body { color: blue; }");
  assert.deepEqual(first.lines.slice(0, 3), original.lines.slice(0, 3));
  assert.deepEqual(first.lines.slice(-4), original.lines.slice(4));
  assert.ok(first.lines.includes(" " + styleStart));
  assert.ok(first.lines.includes(" " + styleEnd));
  const next = mergeNativeStyle(first, target, "kamelayout", "body { color: green; }");
  assert.deepEqual(
    next.lines.filter((l) => !l.includes("body {")),
    first.lines.filter((l) => !l.includes("body {")),
  );
  assert.equal(
    managedStyleFromCode(
      next.lines
        .slice(3, 6)
        .map((l) => l.slice(1))
        .join("\n"),
    ),
    "body { color: green; }",
  );
  assert.deepEqual(
    original.lines[3],
    '\t@import "/api/code/kamelayout/kame-layout%3Adelivery/style.css";',
  );
});
test("unknown blocks, duplicate markers and other pages cannot be overwritten", () => {
  for (const page of [
    { ...original, title: "Other" },
    {
      ...original,
      lines: original.lines.map((l) => (l.includes("@import") ? "\t.manual {color:red}" : l)),
    },
    { ...original, lines: [...original.lines, "code:style.css", " .other {}"] },
    {
      ...original,
      lines: ["Settings", "code:style.css", " " + styleStart, " " + styleStart, " " + styleEnd],
    },
  ])
    assert.throws(() => mergeNativeStyle(page, target, "kamelayout", "body {}"));
  assert.throws(() =>
    mergeNativeStyle(original, { ...target, page: "Other" }, "kamelayout", "body{}"),
  );
});
