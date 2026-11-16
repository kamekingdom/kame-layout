import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const read = (filename) => fs.readFileSync(path.join(root, filename), "utf8");
export const config = JSON.parse(read("config/features.json"));
export const migration = JSON.parse(read("migration/paths.json"));
export const features = new Map(config.features.map((feature) => [feature.id, feature]));
export const categories = {
  theme: "テーマ・配色",
  layout: "レイアウト",
  formatting: "文字・記法・テーブル",
  navigation: "ページ一覧・ナビゲーション",
  editing: "編集支援",
  media: "画像・音声・ファイル",
};

export function defaults(kind) {
  const filename = kind === "styles" ? "style.css" : "script.js";
  return config.defaults[kind].map((id) => {
    const feature = features.get(id);
    if (!feature?.files[filename]) throw new Error(`Unavailable ${kind} feature: ${id}`);
    return { feature, filename: feature.files[filename] };
  });
}

export function styleState(feature) {
  if (config.defaults.styles.includes(feature.id)) return "有効";
  if (feature.styleLoading === "script") return "JSが自動読込";
  return feature.files["style.css"] ? "任意・無効" : "—";
}

export function scriptState(feature) {
  if (config.defaults.scripts.includes(feature.id)) return "有効";
  return feature.files["script.js"] ? "任意・無効" : "—";
}

export function sourceAtBaseline(originalPath) {
  return `https://github.com/kamekingdom/kame-layout/blob/${migration.baseline}/${encodeURI(originalPath)}`;
}
