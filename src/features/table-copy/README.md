# テーブルのコピー機能

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

テーブルをコピーするボタンを追加します。

## 使い方

CSV を解析し、貼り付けやすい TSV へ変換します。

## 構成と現在の設定

- CSS：—
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 初期化・イベント・状態の管理 |
| [csv.js](csv.js) | CSV解析とTSV変換 |
| [icons.js](icons.js) | コピー・完了アイコンのSVG |
| [config.js](config.js) | ボタンの識別子 |
| [styles.js](styles.js) | Scriptが挿入するボタン専用CSS |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E3%82%B3%E3%83%94%E3%83%BC%E6%A9%9F%E8%83%BD)
- [出典・参考リンク一覧](../../../SOURCES.md)
