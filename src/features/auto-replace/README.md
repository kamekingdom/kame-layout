# 自動文字置き換え

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

入力した記号列を矢印・数学記号などへ変換します。

## 使い方

例：-> を → に変換します。変換表は replacements.js にあります。

## 構成と現在の設定

- CSS：—
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 機能の処理・初期化 |
| [replacements.js](replacements.js) | 設定データ・補助モジュール |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E8%87%AA%E5%8B%95%E6%96%87%E5%AD%97%E7%BD%AE%E3%81%8D%E6%8F%9B%E3%81%88)
- [出典・参考リンク一覧](../../../SOURCES.md)
