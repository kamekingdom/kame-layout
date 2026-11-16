# テンプレートJS

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

空のページにテンプレートを挿入するメニューを追加します。

## 使い方

論文メモ・授業ノート・書籍などを選択します。元と同じ kamelayout の API からテンプレートを取得します。

## 構成と現在の設定

- CSS：—
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 機能の処理・初期化 |
| [templates.js](templates.js) | 設定データ・補助モジュール |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 補足

- テンプレート本文の保存場所は src/templates/ です。動作維持のため、取得先は元と同じ Scrapbox API のままです。取得先を変更する場合は templates.js を編集します。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%83%86%E3%83%B3%E3%83%97%E3%83%AC%E3%83%BC%E3%83%88JS)
- [出典・参考リンク一覧](../../../SOURCES.md)
