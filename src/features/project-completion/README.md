# 所属プロジェクトの候補表示JS

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

参加プロジェクトのリンク候補を表示する外部モジュールを使います。

## 使い方

初期状態では無効です。外部の external-completion に依存します。

## 構成と現在の設定

- CSS：—
- UserScript：任意・無効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 機能の処理・初期化 |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 補足

- 外部モジュールの URL は、GitHub 配信でも Scrapbox を指すよう絶対 URL にしています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E6%89%80%E5%B1%9E%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AE%E5%80%99%E8%A3%9C%E8%A1%A8%E7%A4%BAJS)
- [出典・参考リンク一覧](../../../SOURCES.md)
