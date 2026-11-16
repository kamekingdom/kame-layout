import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { parse } from "acorn";
import postcss from "postcss";
import { root, read, config, migration } from "../tools/project.mjs";
import { packageFiles, entryPage, featurePage } from "../tools/scrapbox-package.mjs";

const baseline = JSON.parse(read("migration/manifest.json"));
const mapping = new Map(migration.files.map((file) => [file.originalPath, file]));
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
const ast = (text) => parse(text, { ecmaVersion: "latest", sourceType: "module" });
const originalText = (originalPath) => read(mapping.get(originalPath).path);

function canonical(value) {
  // A redundant standalone semicolon has no observable behaviour; Prettier removes it.
  if (Array.isArray(value))
    return value.filter((item) => item?.type !== "EmptyStatement").map(canonical);
  if (!value || typeof value !== "object") return value;
  if (value.type === "Property" && !value.computed && value.key.type === "Identifier") {
    value = { ...value, key: { type: "Literal", value: value.key.name } };
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !["start", "end", "loc", "raw"].includes(key))
      .map(([key, item]) => [key, canonical(item)]),
  );
}

function normalizeExternalImports(tree) {
  for (const node of tree.body) {
    if (node.type === "ImportDeclaration" && node.source.value.startsWith("/api/code/")) {
      node.source.value = `https://scrapbox.io${node.source.value}`;
    }
  }
  return tree;
}

function expandDataModules(tree, filename) {
  tree.body = tree.body.flatMap((node) => {
    if (
      node.type !== "ImportDeclaration" ||
      !["./replacements.js", "./templates.js"].includes(node.source.value)
    )
      return [node];
    const moduleFile = path.posix.join(path.posix.dirname(filename), node.source.value);
    return ast(read(moduleFile))
      .body.filter((item) => item.type === "ExportNamedDeclaration")
      .map((item) => item.declaration);
  });
  return tree;
}

test("all 131 original files are accounted for; archived code, CSS and templates are byte-identical", () => {
  assert.equal(mapping.size, baseline.files.length);
  assert.equal(new Set([...mapping.values()].map((entry) => entry.path)).size, mapping.size);
  for (const entry of baseline.files) {
    const destination = mapping.get(entry.path);
    assert.ok(destination, entry.path);
    const current = read(destination.path);
    if (destination.kind === "archive" || !entry.path.endsWith(".js")) {
      assert.equal(hash(current), entry.sha256, destination.path);
    }
  }
});

test("every JavaScript module keeps its original statements, literals and event handlers", async () => {
  // Read originals from the immutable initial commit: this prevents a refactor and its
  // comparison baseline from accidentally changing together.
  const { execFileSync } = await import("node:child_process");
  for (const entry of baseline.files.filter((file) => file.path.endsWith(".js"))) {
    const destination = mapping.get(entry.path);
    if (destination.kind !== "feature") continue;
    const original = execFileSync("git", ["show", `${migration.baseline}:${entry.path}`], {
      cwd: root,
      encoding: "utf8",
    });
    const before = normalizeExternalImports(ast(original));
    const after = normalizeExternalImports(
      expandDataModules(ast(read(destination.path)), destination.path),
    );
    assert.deepEqual(canonical(after), canonical(before), destination.path);
  }
});

test("default Script execution order is unchanged", () => {
  const previous = ast(read("archive/scrapbox/kame/script.js"))
    .body.filter((node) => node.type === "ImportDeclaration")
    .map((node) => mapping.get(path.posix.normalize(`src/kame/${node.source.value}`)).path);
  const current = ast(read("script.js"))
    .body.filter((node) => node.type === "ImportDeclaration")
    .map((node) => node.source.value.replace(/^\.\//, ""));
  assert.deepEqual(current, previous);
  assert.equal(current.length, 20);
});

function cssNode(node) {
  const result = { type: node.type };
  for (const key of ["selector", "prop", "value", "important", "name", "params"]) {
    if (node[key] !== undefined) result[key] = node[key];
  }
  if (node.nodes) result.nodes = node.nodes.filter((item) => item.type !== "comment").map(cssNode);
  return result;
}

function flattenCss(filename, original = false) {
  const text = original ? originalText(filename) : read(filename);
  return postcss.parse(text).nodes.flatMap((node) => {
    if (node.type === "comment") return [];
    if (node.type !== "atrule" || node.name !== "import") return [cssNode(node)];
    const specifier = node.params.match(/^(?:url\(\s*)?["']([^"']+)["']/)?.[1];
    assert.ok(specifier, node.params);
    if (specifier.startsWith("https://")) return [cssNode(node)];
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(filename), specifier));
    if (original && !mapping.has(target)) {
      assert.ok(
        migration.missingOriginalImports.some(
          (item) => target === `src/${item.page}/${item.codeBlock}`,
        ),
        target,
      );
      return [];
    }
    return flattenCss(target, original);
  });
}

test("effective CSS selectors, values, specificity and declaration order are unchanged", () => {
  assert.deepEqual(flattenCss("style.css"), flattenCss("src/Settings/style.css", true));
  assert.equal(config.defaults.styles.length, 42);
});

test("graph stylesheet remains loaded by its Script and resolves beside that module", () => {
  const feature = config.features.find((item) => item.id === "graph-view");
  assert.equal(feature.styleLoading, "script");
  assert.ok(!config.defaults.styles.includes(feature.id));
  const source = read(feature.files["script.js"]);
  assert.match(source, /new URL\(["']\.\/style\.css["'], import\.meta\.url\)/);
  assert.ok(
    fs.existsSync(path.join(root, path.posix.dirname(feature.files["script.js"]), "style.css")),
  );
});

test("every feature and baseline source has a documentation or provenance link", () => {
  for (const feature of config.features) {
    const doc = read(`src/features/${feature.id}/README.md`);
    assert.ok(doc.includes(feature.description));
    assert.ok(doc.includes(feature.usage));
    assert.ok(doc.includes(feature.sourceUrl));
  }
  assert.equal(config.features.length, 72);
});

test("Scrapbox import package preserves every current code block and resolves entry imports on the same origin", () => {
  const pkg = JSON.parse(read("dist/kame-layout.scrapbox.json"));
  assert.equal(pkg.pages.length, 73);
  assert.equal(new Set(pkg.pages.map((page) => page.title)).size, pkg.pages.length);
  for (const page of pkg.pages) {
    assert.equal(page.lines[0], page.title);
    assert.ok(page.title.startsWith("kame-layout:"));
    assert.ok(page.lines.every((line) => typeof line === "string"));
  }
  const files = packageFiles(pkg);
  for (const feature of config.features) {
    for (const [name, filename] of Object.entries(feature.files)) {
      assert.equal(files.get(`${featurePage(feature.id)}/${name}`), read(filename));
    }
    for (const name of feature.dataFiles ?? []) {
      assert.equal(
        files.get(`${featurePage(feature.id)}/${name}`),
        read(`src/features/${feature.id}/${name}`),
      );
    }
  }
  for (const kind of ["styles", "scripts"]) {
    const extension = kind === "styles" ? "css" : "js";
    const entry = files.get(`${entryPage}/${kind === "styles" ? "style" : "script"}.${extension}`);
    for (const match of entry.matchAll(/(?:@import|import) "([^"]+)"/g)) {
      const target = path.posix.normalize(path.posix.join(entryPage, match[1]));
      assert.ok(files.has(target), target);
    }
  }
});
