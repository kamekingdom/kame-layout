# チェックボックス

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

チェックボックス記法の状態をクリックで切り替えます。

## 使い方

[o]・[v]・[x] の状態を切り替えます。表示用 CSS は checkbox-style にあります。

## 構成と現在の設定

- CSS：—
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 初期化・イベント・状態の管理 |
| [model.js](model.js) | チェック状態の遷移と対象トークンの置換 |
| [links.js](links.js) | チェックボックスリンクの判定とイベント抑制 |
| [types.js](types.js) | 型定義（実行時の配信対象外） |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 補足

- 表示をまとめて利用する場合は checkbox-style の CSS も有効にします。

## 旧版・元の試作

- [not-used-script.js](../../../archive/scrapbox/%E3%83%81%E3%82%A7%E3%83%83%E3%82%AF%E3%83%9C%E3%83%83%E3%82%AF%E3%82%B9/not-used-script.js)

これらは初期状態で読み込みません。元の構文上の問題も含めて保存しています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%83%81%E3%82%A7%E3%83%83%E3%82%AF%E3%83%9C%E3%83%83%E3%82%AF%E3%82%B9)
- [出典・参考リンク一覧](../../../SOURCES.md)
