# コードブロックのuserCSS

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

コードブロックの配色・枠・余白を整えます。

## 使い方

code: のコードブロックに適用します。

## 構成と現在の設定

- CSS：有効
- UserScript：—

| ファイル | 役割 |
| --- | --- |
| [style.css](style.css) | 表示・装飾 |
| [panel.css](panel.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [title.css](title.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [content.css](content.css) | 表示部分ごとのスタイル（style.cssの順序で結合） |
| [rounded-panel.css](rounded-panel.css) | 角丸グレーのパネルと右上の標準コピーボタン |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 補足

- 標準のファイル名・コピー操作・ハイライトを残し、薄いグレーの角丸パネルに整えます。ヘッダーは小さくし、Copied表示でも操作領域のサイズを固定します。折り返し切替ボタンは追加しません。
- [変更前後のスクリーンショット](../../../docs/code-blocks.md)を確認できます。

## 旧版・元の試作

- [not-used-style.css](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%82%B3%E3%83%BC%E3%83%89%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF%E3%81%AEuserCSS/not-used-style.css)

これらは初期状態で読み込みません。元の構文上の問題も含めてGit履歴に保存しています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%82%B3%E3%83%BC%E3%83%89%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF%E3%81%AEuserCSS)
- [出典・参考リンク一覧](../../../SOURCES.md)
