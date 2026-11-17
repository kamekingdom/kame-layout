# ホーム画面にランダムでページを表示させたい

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

ホーム画面にランダムなページカードを追加します。

## 使い方

現在のプロジェクトからページを取得し、画面幅に合わせてカードを配置します。

## 構成と現在の設定

- CSS：—
- UserScript：有効

| ファイル | 役割 |
| --- | --- |
| [script.js](script.js) | 初期化・イベント・状態の管理 |
| [config.js](config.js) | カード数とDOM IDの設定 |
| [api.js](api.js) | プロジェクト判定とランダムページの取得 |
| [cards.js](cards.js) | カードDOMの生成・削除 |
| [layout.js](layout.js) | 既存カードの寸法測定とレイアウト同期 |
| [styles.js](styles.js) | Scriptが挿入するカード専用CSS |
| [types.js](types.js) | 型定義（実行時の配信対象外） |

有効・無効と読み込み順は [config/features.json](../../../config/features.json) で管理します。変更後に `npm run build` を実行してください。

## 旧版・元の試作

- [v3script.js](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%9B%E3%83%BC%E3%83%A0%E7%94%BB%E9%9D%A2%E3%81%AB%E3%83%A9%E3%83%B3%E3%83%80%E3%83%A0%E3%81%A7%E3%83%9A%E3%83%BC%E3%82%B8%E3%82%92%E8%A1%A8%E7%A4%BA%E3%81%95%E3%81%9B%E3%81%9F%E3%81%84/v3script.js)
- [v2script.js](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%9B%E3%83%BC%E3%83%A0%E7%94%BB%E9%9D%A2%E3%81%AB%E3%83%A9%E3%83%B3%E3%83%80%E3%83%A0%E3%81%A7%E3%83%9A%E3%83%BC%E3%82%B8%E3%82%92%E8%A1%A8%E7%A4%BA%E3%81%95%E3%81%9B%E3%81%9F%E3%81%84/v2script.js)
- [v1-script.js](https://github.com/kamekingdom/kame-layout/blob/68d00aaefdcc5504d59727c23cbe457e38cff19d/src/%E3%83%9B%E3%83%BC%E3%83%A0%E7%94%BB%E9%9D%A2%E3%81%AB%E3%83%A9%E3%83%B3%E3%83%80%E3%83%A0%E3%81%A7%E3%83%9A%E3%83%BC%E3%82%B8%E3%82%92%E8%A1%A8%E7%A4%BA%E3%81%95%E3%81%9B%E3%81%9F%E3%81%84/v1-script.js)

これらは初期状態で読み込みません。元の構文上の問題も含めてGit履歴に保存しています。

## 出典

- [元の Scrapbox ページ](https://scrapbox.io/kamelayout/%E3%83%9B%E3%83%BC%E3%83%A0%E7%94%BB%E9%9D%A2%E3%81%AB%E3%83%A9%E3%83%B3%E3%83%80%E3%83%A0%E3%81%A7%E3%83%9A%E3%83%BC%E3%82%B8%E3%82%92%E8%A1%A8%E7%A4%BA%E3%81%95%E3%81%9B%E3%81%9F%E3%81%84)
- [出典・参考リンク一覧](../../../SOURCES.md)
