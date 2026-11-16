# 音声ファイルを再生可能にする

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

本文内の音声リンクにプレイヤーを表示します。

## 使い方

対応する音声ファイルのリンクを個別ページに置きます。

## 構成と現在の設定

- CSS：有効
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 初期化・イベント・状態の管理 |
| [style.css](style.css) | 表示・装飾 |
| [players.js](players.js) | 音声リンクの判定とプレイヤーDOMの管理 |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E9%9F%B3%E5%A3%B0%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%82%92%E5%86%8D%E7%94%9F%E5%8F%AF%E8%83%BD%E3%81%AB%E3%81%99%E3%82%8B)
- [出典・参考リンク一覧](../../../SOURCES.md)
