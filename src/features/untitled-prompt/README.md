# 空白ページ消去提案JS

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

Untitled ページへの移動時に削除ボタンを開きます。

## 使い方

page:changed 時に Untitled または Untitled_数字 のタイトルを判定します。実際の操作は既存の削除 UI に従います。

## 構成と現在の設定

- CSS：—
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 機能の処理・初期化 |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E7%A9%BA%E7%99%BD%E3%83%9A%E3%83%BC%E3%82%B8%E6%B6%88%E5%8E%BB%E6%8F%90%E6%A1%88JS)
- [出典・参考リンク一覧](../../../SOURCES.md)
