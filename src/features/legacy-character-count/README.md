# 文字列カウントJS

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

外部の文字カウント用モジュールを読み込む旧 Script です。

## 使い方

初期状態では無効です。見える文字数カウンターとは別の実装です。

## 構成と現在の設定

- CSS：—
- UserScript：任意・無効

| ファイル | 役割 |
| --- | --- |
| [page.js](page.js) | 設定データ・補助モジュール |
| [popup.js](popup.js) | 設定データ・補助モジュール |
| [script.js](script.js) | 機能の処理・初期化 |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 補足

- 外部モジュールの URL は、GitHub 配信でも Scrapbox を指すよう絶対 URL にしています。元ページには動作保留の記録があります。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E6%96%87%E5%AD%97%E5%88%97%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88JS)
- [出典・参考リンク一覧](../../../SOURCES.md)
