# Obsidian風グラフビュー

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

ページ間のリンクをグラフとして表示します。

## 使い方

グラフ UI から開きます。専用 CSS は Script が必要時に読み込みます。

## 構成と現在の設定

- CSS：JSが自動読込
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 初期化・イベント・状態の管理 |
| [style.css](style.css) | 表示・装飾 |
| [colors.js](colors.js) | テーマ色の解析・混色・輝度計算 |
| [links.js](links.js) | ページ名の比較・省略表示・URL生成 |
| [config.js](config.js) | 取得上限・キャッシュ・描画回数の設定 |
| [api.js](api.js) | ページ一覧の取得とページ送り |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 補足

- 専用 CSS は script.js の import.meta.url を基準に取得します。元の Settings にあった stlye.css の誤字を直して全体 CSS へ追加すると適用範囲が変わるため、Script による読み込みを維持しています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/Obsidian%E9%A2%A8%E3%82%B0%E3%83%A9%E3%83%95%E3%83%93%E3%83%A5%E3%83%BC)
- [出典・参考リンク一覧](../../../SOURCES.md)
