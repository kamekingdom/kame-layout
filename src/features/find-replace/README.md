# テキスト置換機能

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

ページ内の検索・置換 UI を追加します。

## 使い方

Script 内の検索・置換 UI から使います。対象や正規表現などのオプションを持ちます。

## 構成と現在の設定

- CSS：有効
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 機能の処理・初期化 |
| [style.css](style.css) | 表示・装飾 |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 旧版・元の試作

- [not-used-script.js](../../../archive/scrapbox/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E7%BD%AE%E6%8F%9B%E6%A9%9F%E8%83%BD/not-used-script.js)

これらは初期状態で読み込みません。元の構文上の問題も含めて保存しています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E7%BD%AE%E6%8F%9B%E6%A9%9F%E8%83%BD)
- [出典・参考リンク一覧](../../../SOURCES.md)
