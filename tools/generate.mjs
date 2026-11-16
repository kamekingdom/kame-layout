import fs from "node:fs";
import path from "node:path";
import {
  root,
  config,
  migration,
  categories,
  defaults,
  styleState,
  scriptState,
} from "./project.mjs";
import { createPackage } from "./scrapbox-package.mjs";

const outputs = new Map();
outputs.set("dist/kame-layout.scrapbox.json", JSON.stringify(createPackage(), null, 2) + "\n");
const check = process.argv.includes("--check");
const label = "<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->";
const link = (from, target) => encodeURI(path.posix.relative(path.posix.dirname(from), target));

outputs.set(
  "style.css",
  [
    "/* Generated from config/features.json. Preserve cascade order; run npm run build. */",
    ...defaults("styles").map(({ filename }) => `@import "./${filename}";`),
    '@import "./src/theme/project.css";',
    "",
  ].join("\n"),
);

outputs.set(
  "script.js",
  [
    "// Generated from config/features.json. Preserve execution order; run npm run build.",
    ...defaults("scripts").map(({ filename }) => `import "./${filename}";`),
    "",
  ].join("\n"),
);

// Compatibility for the two previously documented internal entry points.
outputs.set("src/Settings/style.css", '/* Compatibility entry. */\n@import "../../style.css";\n');
outputs.set("src/kame/script.js", '// Compatibility entry.\nimport "../../script.js";\n');

const catalog = [
  "# 機能一覧",
  "",
  label,
  "",
  "機能名から各 README を開くと、使い方・ソース・出典・旧版を確認できます。CSS と JS の有効状態は個別です。",
  "",
  "「任意・無効」は配布対象に含まれますが、初期状態では読み込みません。旧版だけの機能はアーカイブへのリンクを記載しています。",
  "",
];
for (const [category, title] of Object.entries(categories)) {
  catalog.push(`## ${title}`, "", "| 機能 | 内容 | CSS | JS |", "| --- | --- | --- | --- |");
  for (const feature of config.features.filter((item) => item.category === category)) {
    catalog.push(
      `| [${feature.name}](../src/features/${feature.id}/README.md) | ${feature.description} | ${styleState(feature)} | ${scriptState(feature)} |`,
    );
  }
  catalog.push("");
}
outputs.set("docs/features.md", catalog.join("\n"));

for (const feature of config.features) {
  const filename = `src/features/${feature.id}/README.md`;
  const lines = [
    `# ${feature.name}`,
    "",
    label,
    "",
    feature.description,
    "",
    "## 使い方",
    "",
    feature.usage,
    "",
    "## 構成と現在の設定",
    "",
    `- CSS：${styleState(feature)}`,
    `- UserScript：${scriptState(feature)}`,
    "",
    "| ファイル | 役割 |",
    "| --- | --- |",
  ];
  const entries = { ...feature.files };
  for (const name of feature.dataFiles ?? []) entries[name] = `src/features/${feature.id}/${name}`;
  for (const [name, target] of Object.entries(entries)) {
    const role = name.endsWith(".css")
      ? "表示・装飾"
      : name === "script.js"
        ? "機能の処理・初期化"
        : "設定データ・補助モジュール";
    lines.push(`| [${name}](${link(filename, target)}) | ${role} |`);
  }
  if (!Object.keys(entries).length)
    lines.push("| — | 現行の配布コードはありません。元コードは下の旧版に保管しています。 |");
  lines.push(
    "",
    "有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。",
    "",
  );
  if (feature.notes?.length)
    lines.push("## 補足", "", ...feature.notes.map((note) => `- ${note}`), "");
  const archived = migration.files.filter(
    (item) => item.kind === "archive" && item.originalPath.startsWith(`src/${feature.name}/`),
  );
  if (archived.length)
    lines.push(
      "## 旧版・元の試作",
      "",
      ...archived.map(
        (item) => `- [${path.posix.basename(item.path)}](${link(filename, item.path)})`,
      ),
      "",
      "これらは初期状態で読み込みません。元の構文上の問題も含めて保存しています。",
      "",
    );
  lines.push(
    "## 出典",
    "",
    `- [元の Scrapbox ページ](${feature.sourceUrl})`,
    "- [出典・参考リンク一覧](../../../SOURCES.md)",
    "",
  );
  outputs.set(filename, lines.join("\n"));
}

const loadOrder = [
  "# 読み込み順",
  "",
  label,
  "",
  "順序は元の Settings/style.css と kame/script.js を引き継いでいます。CSS は後の宣言が前の宣言を上書きすることがあり、JS の初期化順もこの配列に従います。",
  "",
];
for (const kind of ["styles", "scripts"]) {
  loadOrder.push(kind === "styles" ? "## CSS" : "## UserScript", "");
  defaults(kind).forEach(({ feature, filename }, index) =>
    loadOrder.push(`${index + 1}. [${feature.name}](../${encodeURI(filename)})`),
  );
  if (kind === "styles")
    loadOrder.push(
      `${config.defaults.styles.length + 1}. [プロジェクト共通変数](../src/theme/project.css)`,
    );
  loadOrder.push("");
}
loadOrder.push(
  "グラフビューの専用 CSS は元と同様にグラフ Script が読み込みます。元の入口で 404 だった CSS を新たに有効にはしていません。",
  "",
);
outputs.set("docs/load-order.md", loadOrder.join("\n"));

const outdated = [];
for (const [filename, content] of outputs) {
  const target = path.join(root, filename);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content)
      outdated.push(filename);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}
if (outdated.length) {
  console.error(`Run npm run build. Outdated generated files:\n${outdated.join("\n")}`);
  process.exitCode = 1;
} else
  console.log(
    `${check ? "Checked" : "Generated"} ${outputs.size} files (${config.features.length} feature READMEs).`,
  );
