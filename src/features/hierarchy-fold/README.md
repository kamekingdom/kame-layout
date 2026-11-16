# 子階層の折りたたみ

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

子階層の折りたたみと展開を切り替えます。

## 使い方

[> 見出し]・[< 見出し] の記法と行横の切り替え UI を使います。

## 構成と現在の設定

- CSS：有効
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 初期化・イベント・状態の管理 |
| [style.css](style.css) | 表示・装飾 |
| [markers.js](markers.js) | 折りたたみ記法・空行・インデントの解析 |
| [visibility.js](visibility.js) | 子階層の表示制御とMutationの判定 |
| [types.js](types.js) | 型定義（実行時の配信対象外） |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E5%AD%90%E9%9A%8E%E5%B1%A4%E3%81%AE%E6%8A%98%E3%82%8A%E3%81%9F%E3%81%9F%E3%81%BF)
- [出典・参考リンク一覧](../../../SOURCES.md)
