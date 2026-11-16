# リンクホバー詳細プレビュー

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

リンク先の内容をホバーでプレビューします。

## 使い方

ページリンクにポインターを重ねて使います。

## 構成と現在の設定

- CSS：有効
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 初期化・イベント・状態の管理 |
| [style.css](style.css) | 表示・装飾 |
| [config.js](config.js) | 表示件数・遅延・余白の設定 |
| [model.js](model.js) | 本文の解析と関連ページの分類 |
| [panel.css](panel.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [content.css](content.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [footer.css](footer.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [related-pages.css](related-pages.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [types.js](types.js) | 型定義（実行時の配信対象外） |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%83%AA%E3%83%B3%E3%82%AF%E3%83%9B%E3%83%90%E3%83%BC%E8%A9%B3%E7%B4%B0%E3%83%97%E3%83%AC%E3%83%93%E3%83%A5%E3%83%BC)
- [出典・参考リンク一覧](../../../SOURCES.md)
