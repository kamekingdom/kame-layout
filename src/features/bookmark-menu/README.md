# ブックマークJS

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

栞の挿入や移動を行うメニューを追加します。

## 使い方

ブックマークの表示装飾は bookmark-style にあります。

## 構成と現在の設定

- CSS：—
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 初期化・イベント・状態の管理 |
| [headings.js](headings.js) | 見出しのインデント・階層・ラベルの解析 |
| [scroll.js](scroll.js) | 固定ヘッダーを考慮したスクロール |
| [types.js](types.js) | 型定義（実行時の配信対象外） |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 補足

- 表示をまとめて利用する場合は bookmark-style の CSS も有効にします。

## 旧版・元の試作

- [v3-script.js](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%96%E3%83%83%E3%82%AF%E3%83%9E%E3%83%BC%E3%82%AFJS/v3-script.js)
- [v2-script.js](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%96%E3%83%83%E3%82%AF%E3%83%9E%E3%83%BC%E3%82%AFJS/v2-script.js)
- [v1-script.js](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%96%E3%83%83%E3%82%AF%E3%83%9E%E3%83%BC%E3%82%AFJS/v1-script.js)

これらは初期状態で読み込みません。元の構文上の問題も含めてGit履歴に保存しています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%83%96%E3%83%83%E3%82%AF%E3%83%9E%E3%83%BC%E3%82%AFJS)
- [出典・参考リンク一覧](../../../SOURCES.md)
