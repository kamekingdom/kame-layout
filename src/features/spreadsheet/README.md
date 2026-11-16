# 表計算スクリプト

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

テーブル内の数式を計算し、結果を表示します。

## 使い方

SUM など、Script に実装された関数をテーブルで使います。

## 構成と現在の設定

- CSS：有効
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 機能の処理・初期化 |
| [style.css](style.css) | 表示・装飾 |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E8%A1%A8%E8%A8%88%E7%AE%97%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%97%E3%83%88)
- [出典・参考リンク一覧](../../../SOURCES.md)
