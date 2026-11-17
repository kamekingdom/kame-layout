import assert from "node:assert/strict";
import test from "node:test";
import { read } from "../tools/project.mjs";
import { createPackage, packageFiles, entryPage } from "../tools/scrapbox-package.mjs";
const version = (files) =>
  files.get(`${entryPage}/loader.js`).match(/const version = "([a-f0-9]{64})"/)[1];
test("delivery revision covers nested CSS, helper modules and loader; unchanged inputs are deterministic", () => {
  const initial = packageFiles(createPackage());
  const id = version(initial);
  assert.equal(version(packageFiles(createPackage())), id);
  for (const changed of [
    "src/features/code-blocks/rounded-panel.css",
    "src/features/graph-view/colors.js",
    "tools/delivery-loader.js",
  ]) {
    const next = packageFiles(
      createPackage((f) => read(f) + (f === changed ? "\n/* revision test */" : "")),
    );
    assert.notEqual(version(next), id, changed);
  }
  for (const [name, body] of initial) {
    if (!name.endsWith(".js") && !name.endsWith("/style.css")) continue;
    for (const match of body.matchAll(/(?:import |from |new URL\()["'](\.\/[^"']+)["']/g))
      assert.equal(
        new URL(match[1], "https://scrapbox.io/api/code/kamelayout/" + name).searchParams.get("v"),
        id,
        `${name}: ${match[1]}`,
      );
  }
});
