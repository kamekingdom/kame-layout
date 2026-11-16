# 外部リンク左横にそのサイトのfaviconを自動表示する

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

外部リンクの横にサイトの favicon を表示します。

## 使い方

本文やテーブル内の外部リンクに自動適用します。

## 構成と現在の設定

- CSS：有効
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 機能の処理・初期化 |
| [style.css](style.css) | 表示・装飾 |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 補足

- favicon の取得先など、既存の外部リソースへの参照を維持しています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E5%A4%96%E9%83%A8%E3%83%AA%E3%83%B3%E3%82%AF%E5%B7%A6%E6%A8%AA%E3%81%AB%E3%81%9D%E3%81%AE%E3%82%B5%E3%82%A4%E3%83%88%E3%81%AEfavicon%E3%82%92%E8%87%AA%E5%8B%95%E8%A1%A8%E7%A4%BA%E3%81%99%E3%82%8B)
- [出典・参考リンク一覧](../../../SOURCES.md)
