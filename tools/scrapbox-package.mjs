import path from "node:path";
import { parse } from "acorn";
import { generate } from "astring";
import { config, defaults, read } from "./project.mjs";
import { compileStyles } from "./styles.mjs";

export const entryPage = "kame-layout:delivery";
export const managedMarker = "kame-layout managed delivery v1";
export const deployedName = (id, name) => `${id}.${name}`;

export function sourceFiles() {
  return config.features.flatMap((feature) => [
    ...Object.entries(feature.files).map(([name, filename]) => ({ feature, name, filename })),
    ...(feature.dataFiles ?? []).map((name) => ({
      feature,
      name,
      filename: `src/features/${feature.id}/${name}`,
    })),
  ]);
}

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value === "object") walk(value, visit);
  }
}

// Only module/asset URLs change. Statements, data, module boundaries and evaluation
// order stay intact; whitespace-only minification keeps the page below 10,000 lines.
export function compileModule(source, filename, names) {
  const ast = parse(source, { ecmaVersion: "latest", sourceType: "module" });
  const add = (literal) => {
    if (typeof literal?.value !== "string" || !literal.value.startsWith(".")) return;
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(filename), literal.value),
    );
    const name = names.get(target);
    if (!name) throw new Error(`Unresolved deployment dependency: ${filename} -> ${literal.value}`);
    literal.value = `./${name}`;
    delete literal.raw;
  };
  walk(ast, (node) => {
    if (["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(node.type))
      add(node.source);
    if (node.type === "ImportExpression") add(node.source);
    if (node.type === "NewExpression" && node.callee.name === "URL") {
      const base = node.arguments[1];
      if (
        base?.type === "MemberExpression" &&
        base.object?.type === "MetaProperty" &&
        base.property.name === "url"
      )
        add(node.arguments[0]);
    }
  });
  return generate(ast, { indent: "", lineEnd: "" }) + "\n";
}

export function codeBlock(name, source) {
  return [`code:${name}`, ...source.split("\n").map((line) => ` ${line}`)];
}

export function createPackage() {
  const sources = sourceFiles();
  const names = new Map(
    sources.map(({ feature, name, filename }) => [filename, deployedName(feature.id, name)]),
  );
  const styles = defaults("styles").map(
    ({ feature }) => `@import "./${deployedName(feature.id, "style.css")}";`,
  );
  const scripts = defaults("scripts").map(
    ({ feature }) => `import "./${deployedName(feature.id, "script.js")}";`,
  );
  for (const feature of config.features) {
    if (feature.files["style.css"] && !config.defaults.styles.includes(feature.id)) {
      styles.push(
        `/* ${feature.name}${feature.styleLoading === "script" ? "：Scriptが自動読込" : "：無効"} */`,
      );
      styles.push(`/* @import "./${deployedName(feature.id, "style.css")}"; */`);
    }
    if (feature.files["script.js"] && !config.defaults.scripts.includes(feature.id)) {
      scripts.push(`// ${feature.name}：無効`);
      scripts.push(`// import "./${deployedName(feature.id, "script.js")}";`);
    }
  }
  styles.push('@import "./project.css";');
  const lines = [
    entryPage,
    managedMarker,
    "このページはGitHubから生成・同期する配信用ページです。手動編集は次の同期で置き換わります。",
    "[使い方・概要 https://github.com/kamekingdom/kame-layout/blob/main/README.md]",
    "[機能一覧 https://github.com/kamekingdom/kame-layout/blob/main/docs/features.md]",
    "",
    ...codeBlock("style.css", styles.join("\n")),
    "",
    ...codeBlock("script.js", scripts.join("\n")),
    "",
    ...codeBlock("project.css", read("src/theme/project.css")),
    "",
  ];
  for (const { feature, name, filename } of sources) {
    let source = name.endsWith(".css") ? compileStyles(filename) : read(filename);
    if (name.endsWith(".js")) source = compileModule(source, filename, names);
    lines.push(
      `説明：${feature.name} / ${name}`,
      ...codeBlock(deployedName(feature.id, name), source),
      "",
    );
  }
  if (lines.length >= 10000)
    throw new Error(`Scrapbox page must have fewer than 10000 lines: ${lines.length}`);
  if (lines.some((line) => /[\r\n\u2028\u2029]/.test(line)))
    throw new Error("Invalid line-feed character in a Scrapbox line");
  return { pages: [{ title: entryPage, lines }] };
}

export function packageFiles(pkg) {
  const files = new Map();
  for (const page of pkg.pages) {
    for (let index = 0; index < page.lines.length; index++) {
      const match = /^code:([\w.-]+)$/.exec(page.lines[index]);
      if (!match) continue;
      const body = [];
      while (index + 1 < page.lines.length && page.lines[index + 1].startsWith(" "))
        body.push(page.lines[++index].slice(1));
      const key = `${page.title}/${match[1]}`;
      if (files.has(key)) throw new Error(`Duplicate code block: ${key}`);
      files.set(key, body.join("\n"));
    }
  }
  return files;
}
