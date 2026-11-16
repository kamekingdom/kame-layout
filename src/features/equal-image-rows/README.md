# 画像を一行に均等に配置する

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

同じ行の画像を均等な幅で並べます。

## 使い方

本文の複数画像を含む行に自動適用します。

## 構成と現在の設定

- CSS：有効
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 初期化・イベント・状態の管理 |
| [style.css](style.css) | 表示・装飾 |
| [layout.js](layout.js) | 画像枚数ごとの寸法計算とDOMへの適用 |
| [layout.css](layout.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [counts.css](counts.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [responsive.css](responsive.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [types.js](types.js) | 型定義（実行時の配信対象外） |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E7%94%BB%E5%83%8F%E3%82%92%E4%B8%80%E8%A1%8C%E3%81%AB%E5%9D%87%E7%AD%89%E3%81%AB%E9%85%8D%E7%BD%AE%E3%81%99%E3%82%8B)
- [出典・参考リンク一覧](../../../SOURCES.md)
