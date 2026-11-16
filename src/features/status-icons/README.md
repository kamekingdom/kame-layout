# ステータス切替アイコン

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

進捗を表すアイコンの状態を切り替えます。

## 使い方

AC・NWJ・WJ・WA・RE・TLE のアイコンを使います。

## 構成と現在の設定

- CSS：有効
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 機能の処理・初期化 |
| [style.css](style.css) | 表示・装飾 |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%82%B9%E3%83%86%E3%83%BC%E3%82%BF%E3%82%B9%E5%88%87%E6%9B%BF%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3)
- [出典・参考リンク一覧](../../../SOURCES.md)
