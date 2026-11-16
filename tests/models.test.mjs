import assert from "node:assert/strict";
import test from "node:test";
import { parseCSV, csvToTSV } from "../src/features/table-copy/csv.js";
import {
  evaluateTable,
  formatResult,
  parseCellReference,
} from "../src/features/spreadsheet/engine.js";
import { escapeRegex, expandReplacement } from "../src/features/find-replace/text.js";
import { replaceCheckbox } from "../src/features/checkbox-toggle/model.js";
import { toggleFoldMarkerText } from "../src/features/hierarchy-fold/markers.js";
import {
  normalizeTitle,
  getIndentLevel,
  uniqueRelatedPages,
} from "../src/features/link-preview/model.js";
import { readRgb, blend, rgbCss, alphaCss, luminance } from "../src/features/graph-view/colors.js";

test("CSV preserves quoted commas, escaped quotes, embedded newlines and trailing empty cells", () => {
  assert.deepEqual(parseCSV('name,note,empty\r\n"a,b","say ""hello""\nnext",\r\n'), [
    ["name", "note", "empty"],
    ["a,b", 'say "hello"\nnext', ""],
  ]);
  assert.equal(csvToTSV('a,"b\tc"\n1,2'), "a\tb c\n1\t2");
  assert.deepEqual(parseCSV("\r\n\n"), []);
});

const evaluate = (rows) =>
  evaluateTable(rows.map((row, r) => row.map((source, col) => ({ source, row: r, col }))));
test("spreadsheet evaluates ranges, absolute references, dependency chains and arithmetic precedence", () => {
  const cells = evaluate([
    ["1,200", "3", "=SUM(A1:B1)"],
    ["=C1*2", "=$A$1+2*3", "=AVERAGE(A1:B1)"],
  ]);
  assert.equal(formatResult(cells.get("0:2")), "1203");
  assert.equal(formatResult(cells.get("1:0")), "2406");
  assert.equal(formatResult(cells.get("1:1")), "1206");
  assert.equal(formatResult(cells.get("1:2")), "601.5");
  assert.deepEqual(parseCellReference("$AA$12"), { row: 11, col: 26 });
});

test("spreadsheet reports cycles, invalid references, unknown functions and division by zero", () => {
  for (const [rows, key, expected] of [
    [[["=B1", "=A1"]], "0:0", "#CYCLE!"],
    [[["=Z99"]], "0:0", "#REF!"],
    [[["=1/0"]], "0:0", "#DIV/0!"],
    [[["=UNKNOWN(1)"]], "0:0", "#NAME?"],
  ])
    assert.equal(formatResult(evaluate(rows).get(key)), expected);
  assert.equal(formatResult({ ok: true, value: -0 }), "0");
  assert.equal(formatResult({ ok: true, value: 0.1 + 0.2 }), "0.3");
});

test("regular-expression replacements retain captures, dollars and surrounding text", () => {
  const input = "before abc123 after";
  const match = /([a-z]+)(\d+)/.exec(input);
  assert.equal(
    expandReplacement("$2-$1-$$-$&-$`-$'", match, input),
    "123-abc-$-abc123-before - after",
  );
  assert.equal(new RegExp(escapeRegex("[a+b]?.")).test("[a+b]?."), true);
});

test("checkbox transitions affect only the clicked ordinal and ignore ordinary links", () => {
  assert.equal(replaceCheckbox("[o] A [v] B [x] C [other]", 1), "[o] A [o] B [x] C [other]");
  assert.equal(replaceCheckbox("[O] A", 0), "[v] A");
  assert.equal(replaceCheckbox("[x] A", 0), "[o] A");
  assert.equal(replaceCheckbox("[o] A", 5), null);
});

test("folding markers keep indentation, decoration order and page content", () => {
  assert.equal(toggleFoldMarkerText("\t[.*> title] body"), "\t[.*< title] body");
  assert.equal(toggleFoldMarkerText("  [<. title]"), "  [>. title]");
  assert.equal(toggleFoldMarkerText("ordinary text [> link]"), null);
});

test("preview keys and indentation keep Unicode titles and mixed indentation", () => {
  assert.equal(normalizeTitle("  日本語 Title  "), "日本語_title");
  assert.equal(getIndentLevel("\t　  text"), 3);
  assert.equal(getIndentLevel("   text"), 1.5);
  const pages = [
    { title: "A B", id: "first" },
    { title: "a_b", id: "duplicate" },
    { title: "日本語", id: "japanese" },
  ];
  assert.deepEqual(
    uniqueRelatedPages(pages).map((p) => p.id),
    ["first", "japanese"],
  );
});

test("graph colours parse both hex lengths, retain alpha handling and clamp output", () => {
  assert.deepEqual(readRgb("#AbC"), [170, 187, 204]);
  assert.deepEqual(readRgb("rgb(10, 20, 30)"), [10, 20, 30]);
  assert.equal(readRgb("rgba(1,2,3,0)"), null);
  assert.deepEqual(blend([0, 0, 0], [255, 255, 255], 0.5), [128, 128, 128]);
  assert.equal(rgbCss([-1, 300, 20.6]), "rgb(0, 255, 21)");
  assert.equal(alphaCss([1, 2, 3], 0.5), "rgba(1, 2, 3, 0.5)");
  assert.ok(Math.abs(luminance([255, 255, 255]) - 1) < 1e-12);
});
