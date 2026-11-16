import assert from "node:assert/strict";
import test from "node:test";
import postcss from "postcss";
import { compileStyles, formatStyles } from "../tools/styles.mjs";

const compile = (files) =>
  compileStyles("feature/style.css", (filename) => {
    assert.ok(Object.hasOwn(files, filename), filename);
    return files[filename];
  });

test("stylesheet fragments flatten recursively at the original position and preserve media conditions", () => {
  const text = compile({
    "feature/style.css": '@import "./base.css";\n@import "./responsive.css";',
    "feature/base.css": ".sample {color: red;}\n.sample {color: blue;}",
    "feature/responsive.css": "@media (max-width:600px) {.sample {width:100%;}}",
  });
  const tree = postcss.parse(text);
  assert.deepEqual(
    tree.nodes.map((n) => n.selector ?? n.params),
    [".sample", ".sample", "(max-width:600px)"],
  );
  assert.equal(tree.nodes[0].nodes[0].value, "red");
  assert.equal(tree.nodes[1].nodes[0].value, "blue");
  assert.equal(tree.nodes[2].nodes[0].nodes[0].value, "100%");
});

test("CSS import cycles and unsupported relative-import modifiers fail instead of changing the cascade", () => {
  assert.throws(
    () =>
      compile({
        "feature/style.css": '@import "./a.css";',
        "feature/a.css": '@import "./style.css";',
      }),
    /Circular stylesheet import/,
  );
  assert.throws(
    () => compile({ "feature/style.css": '@import "./a.css" screen;' }),
    /unqualified relative CSS import/,
  );
});

test("CSS formatting preserves custom-property spelling for code that reads CSS tokens", async () => {
  const text = await formatStyles(':root{--colour:#F5F5F5;--title:"CamelCase";color:#ABC;}');
  const values = {};
  postcss.parse(text).walkDecls((d) => (values[d.prop] = d.value));
  assert.equal(values["--colour"], "#F5F5F5");
  assert.equal(values["--title"], '"CamelCase"');
  assert.equal(await formatStyles(text), text);
});
