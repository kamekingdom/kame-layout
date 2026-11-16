import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { parse } from "acorn";
import postcss from "postcss";
import prettier from "prettier";
import { execFileSync } from "node:child_process";
import { restoreFeatureModules } from "./support/refactor.mjs";
import { root, read, config, migration } from "../tools/project.mjs";
import {
  packageFiles,
  entryPage,
  deployedName,
  sourceFiles,
  managedMarker,
} from "../tools/scrapbox-package.mjs";

const baseline = JSON.parse(read("migration/manifest.json"));
const mapping = new Map(migration.files.map((file) => [file.originalPath, file]));
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
const ast = (text) => parse(text, { ecmaVersion: "latest", sourceType: "module", ranges: true });
const originals = new Map();
const originalText = (originalPath) => {
  if (!originals.has(originalPath))
    originals.set(
      originalPath,
      execFileSync("git", ["show", `${migration.baseline}:${originalPath}`], {
        cwd: root,
        encoding: "utf8",
      }),
    );
  return originals.get(originalPath);
};

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
      .filter(([key]) => !["start", "end", "loc", "raw", "range"].includes(key))
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

test("all 131 original files are accounted for; archived code and templates are byte-identical", () => {
  assert.equal(mapping.size, baseline.files.length);
  assert.equal(new Set([...mapping.values()].map((entry) => entry.path)).size, mapping.size);
  for (const entry of baseline.files) {
    const destination = mapping.get(entry.path);
    assert.ok(destination, entry.path);
    const current = read(destination.path);
    if (destination.kind === "archive" || !/\.(?:js|css)$/.test(entry.path)) {
      assert.equal(hash(current), entry.sha256, destination.path);
    }
  }
});

test("JavaScript extraction preserves statements, literals, event handlers and lexical dependencies", async () => {
  // Read originals from the immutable initial commit: this prevents a refactor and its
  // comparison baseline from accidentally changing together.
  for (const entry of baseline.files.filter((file) => file.path.endsWith(".js"))) {
    const destination = mapping.get(entry.path);
    if (destination.kind !== "feature") continue;
    const original = execFileSync("git", ["show", `${migration.baseline}:${entry.path}`], {
      cwd: root,
      encoding: "utf8",
    });
    const before = normalizeExternalImports(ast(original));
    const restored = restoreFeatureModules(
      ast(read(destination.path)),
      destination.path,
      ast(original),
    );
    const after = normalizeExternalImports(expandDataModules(restored, destination.path));
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
  return postcss.parse(text, { from: path.join(root, filename) }).nodes.flatMap((node) => {
    if (node.type === "comment") return [];
    if (node.type !== "atrule" || node.name !== "import") return [node];
    const specifier = node.params.match(/^(?:url\(\s*)?["']([^"']+)["']/)?.[1];
    assert.ok(specifier, node.params);
    if (specifier.startsWith("https://")) return [node];
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

async function canonicalCss(nodes) {
  const tree = postcss.root({ nodes });
  tree.walkComments((comment) => comment.remove());
  tree.walkRules((rule) => {
    if (!rule.nodes.length) rule.remove();
  });
  tree.walkDecls((decl) => {
    const previous = decl.prev();
    if (
      previous?.type === "decl" &&
      previous.prop === decl.prop &&
      previous.value === decl.value &&
      !!previous.important === !!decl.important
    )
      decl.remove();
  });
  const formatted = await prettier.format(tree.toString(), { parser: "css" });
  return postcss.parse(formatted).nodes.map(cssNode);
}

function customProperties(nodes) {
  const values = [];
  postcss.root({ nodes }).walkDecls(/^--/, (decl) => values.push([decl.prop, decl.value]));
  return values;
}

// This intentional UI change has its own overflow tests. Keep comparing every
// earlier declaration, including the unchanged card styles, with the baseline.
const beforePinnedTitleFix = (nodes) =>
  nodes.filter(
    (node) =>
      node.source.input.file !== path.join(root, "src/features/page-cards/pinned-titles.css"),
  );

test("existing CSS remains intact outside the scoped pinned-title layout fix", async () => {
  const fix = postcss.parse(read("src/features/page-cards/pinned-titles.css"));
  fix.walkRules((rule) =>
    assert.ok(
      rule.selector.startsWith(".grid li.pin a .header.pinned"),
      "Title overflow rules stay scoped to pinned headers",
    ),
  );
  assert.deepEqual(
    await canonicalCss(beforePinnedTitleFix(flattenCss("style.css"))),
    await canonicalCss(flattenCss("src/Settings/style.css", true)),
  );
  for (const item of migration.files.filter(
    (item) => item.path.endsWith(".css") && item.kind !== "archive",
  )) {
    assert.deepEqual(
      await canonicalCss(beforePinnedTitleFix(flattenCss(item.path))),
      await canonicalCss(flattenCss(item.originalPath, true)),
      item.path,
    );
    assert.deepEqual(
      customProperties(flattenCss(item.path)),
      customProperties(flattenCss(item.originalPath, true)),
      `${item.path}: custom-property tokens`,
    );
  }
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

test("single-page package inlines stylesheet fragments and relocates only JS module/asset URLs", async () => {
  const pkg = JSON.parse(read("dist/kame-layout.scrapbox.json"));
  assert.equal(pkg.pages.length, 1);
  assert.equal(new Set(pkg.pages.map((page) => page.title)).size, pkg.pages.length);
  for (const page of pkg.pages) {
    assert.equal(page.lines[0], page.title);
    assert.equal(page.lines[1], managedMarker);
    assert.ok(page.lines.length < 10000);
    assert.ok(page.lines.every((line) => typeof line === "string"));
  }
  const files = packageFiles(pkg);
  const sources = sourceFiles();
  const names = new Map(
    sources.map(({ feature, name, filename }) => [filename, deployedName(feature.id, name)]),
  );
  assert.equal(files.size, sources.length + 3);
  for (const { feature, name, filename } of sources) {
    const deployed = files.get(`${entryPage}/${deployedName(feature.id, name)}`);
    assert.equal(typeof deployed, "string", filename);
    if (name.endsWith(".css")) {
      assert.deepEqual(
        await canonicalCss(postcss.parse(deployed).nodes),
        await canonicalCss(flattenCss(filename)),
        filename,
      );
      continue;
    }
    const before = ast(read(filename));
    const rewrite = (literal) => {
      if (typeof literal?.value !== "string" || !literal.value.startsWith(".")) return;
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(filename), literal.value),
      );
      assert.ok(names.has(target), target);
      literal.value = `./${names.get(target)}`;
    };
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (
        [
          "ImportDeclaration",
          "ExportNamedDeclaration",
          "ExportAllDeclaration",
          "ImportExpression",
        ].includes(node.type)
      )
        rewrite(node.source);
      if (
        node.type === "NewExpression" &&
        node.callee.name === "URL" &&
        node.arguments[1]?.object?.type === "MetaProperty"
      )
        rewrite(node.arguments[0]);
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
    };
    visit(before);
    assert.deepEqual(canonical(ast(deployed)), canonical(before), filename);
  }
  for (const kind of ["styles", "scripts"]) {
    const extension = kind === "styles" ? "css" : "js";
    const entry = files.get(`${entryPage}/${kind === "styles" ? "style" : "script"}.${extension}`);
    for (const match of entry.matchAll(/(?:@import|import) "([^"]+)"/g)) {
      const target = path.posix.normalize(path.posix.join(entryPage, match[1]));
      assert.ok(files.has(target), target);
    }
  }
  const graph = files.get(`${entryPage}/graph-view.script.js`);
  assert.match(graph, /new URL\(["']\.\/graph-view\.style\.css["'],\s*import\.meta\.url\)/);
});
