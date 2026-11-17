# ページリストのデザイン

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

ページ一覧のタイトル・カード・説明文を整えます。

## 使い方

プロジェクトの一覧と関連ページのカードに適用します。

## 構成と現在の設定

- CSS：有効
- UserScript：—

| ファイル | 役割 |
| --- | --- |
| [style.css](style.css) | 表示・装飾 |
| [cards.css](cards.css) | 従来のカード・タイトル・説明文のスタイル |
| [pinned-titles.css](pinned-titles.css) | ピン留めタイトルを1行の省略表示に収めるレイアウト |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 補足

- ピン留めの長いタイトルは1行に収め、末尾を「…」で省略します。ページを開くとタイトル全文を確認できます。
- [スクリーンショットと表示仕様](../../../docs/pinned-titles.md)で変更前後を確認できます。

## 旧版・元の試作

- [non-used-style.css](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%9A%E3%83%BC%E3%82%B8%E3%83%AA%E3%82%B9%E3%83%88%E3%81%AE%E3%83%87%E3%82%B6%E3%82%A4%E3%83%B3/non-used-style.css)
- [not-used.css](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%9A%E3%83%BC%E3%82%B8%E3%83%AA%E3%82%B9%E3%83%88%E3%81%AE%E3%83%87%E3%82%B6%E3%82%A4%E3%83%B3/not-used.css)

これらは初期状態で読み込みません。元の構文上の問題も含めてGit履歴に保存しています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%83%9A%E3%83%BC%E3%82%B8%E3%83%AA%E3%82%B9%E3%83%88%E3%81%AE%E3%83%87%E3%82%B6%E3%82%A4%E3%83%B3)
- [出典・参考リンク一覧](../../../SOURCES.md)
