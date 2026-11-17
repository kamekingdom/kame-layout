# テーブルの見た目

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

テーブルの配色・罫線・余白を整えます。

## 使い方

table: のテーブルに適用します。

## 構成と現在の設定

- CSS：有効
- UserScript：—

| ファイル | 役割 |
| --- | --- |
| [style.css](style.css) | 表示・装飾 |
| [cells.css](cells.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [header.css](header.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [title.css](title.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [copy-button.css](copy-button.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 旧版・元の試作

- [v2-style.css](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E8%A6%8B%E3%81%9F%E7%9B%AE/v2-style.css)
- [v1-style.css](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E8%A6%8B%E3%81%9F%E7%9B%AE/v1-style.css)
- [not-used-style.css](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E8%A6%8B%E3%81%9F%E7%9B%AE/not-used-style.css)
- [v3-style.css](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E8%A6%8B%E3%81%9F%E7%9B%AE/v3-style.css)
- [v1style.css](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E8%A6%8B%E3%81%9F%E7%9B%AE/v1style.css)
- [slide-not-user.css](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E8%A6%8B%E3%81%9F%E7%9B%AE/slide-not-user.css)

これらは初期状態で読み込みません。元の構文上の問題も含めてGit履歴に保存しています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E8%A6%8B%E3%81%9F%E7%9B%AE)
- [出典・参考リンク一覧](../../../SOURCES.md)
