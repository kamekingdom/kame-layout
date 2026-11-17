# 編集と検証

## コードを探す

まず [機能一覧](features.md) から該当する README を開きます。

- 見た目を変える：その機能の `style.css`。
- 操作を変える：その機能の `script.js`。
- 矢印などの変換表を変える：`src/features/auto-replace/replacements.js`。
- テンプレートの表示名や取得先を変える：`src/features/templates/templates.js`。
- 機能の説明・有効状態・読み込み順を変える：`config/features.json`。
- 配色を変える：`src/features/colors/style.css`。

大きい機能では、`script.js` が初期化・状態・イベントを担当し、`engine.js`・`model.js`・`api.js` などが計算・解析・取得を担当します。CSSの入口が相対importだけの場合は、同じフォルダの表示部分ごとのCSSを編集します。各ファイルの役割はREADMEの表で確認できます。

`style.css`、`script.js`、各機能 README、`docs/features.md`、`docs/load-order.md`、`dist/kame-layout.scrapbox.json` は生成物です。直接編集せず、設定を更新して `npm run build` を実行します。

## 通常の検証

```sh
npm ci
npm run build
npm run check
npm test
```

`check` は生成物の更新漏れ、現行コードの構文、import の参照先、機能説明の不足を確認します。`test` は初回コミットとの比較で、宣言・処理・順序の意図しない変化を検出します。テストに必要な初回コミットを含む通常の Git clone を使用してください。

回帰テストは変更前の動作を固定しています。機能やデザインを意図して変更する場合は、変更する範囲のテストと根拠を更新します。今回のような構成整理では、比較対象を一括更新して差分を消さないようにします。

## 整形する

`npm run format` はJSとCSSを整形します。CSSだけなら `npm run format:css` を使います。CSS変数の色コードや文字列はScriptから参照されるため、元の表記を保持します。CSSへ直接Prettierを実行すると、変数の表記が変わる場合があります。

補助ファイルを追加したときは `config/features.json` の `dataFiles`（実行するJS）・`styleFiles`（結合するCSS）・`typeFiles`（型定義）・`fileDescriptions`（READMEの説明）を更新します。

## ブラウザで比較する

Google Chrome をインストールした環境で実行します。

```sh
npm run test:browser
```

公開の Scrapbox テストページを、認証情報を持たないブラウザで開き、変更前と変更後の CSS・JS をそれぞれ適用します。通常モードは生成 JSON の応答をテスト用に返します。実際に配信用ページを更新した後は、下の `--live` モードで**公開済みのAPI応答を差し替えず**に読み込みます。CSP は変更しません。1600px・1440px・834px・390pxで表示・機能UIを比較します。Scrapbox への書き込みは行いません。

```sh
npm run sync:verify
npm run test:browser -- --live
npm run test:browser -- --live --webkit
```

WebKitモードには `npx playwright install webkit` でテスト用ブラウザを準備します。WebKitはSafari系エンジンでの検証であり、実物のiPhone・iPadでの動作確認を意味しません。出力は `.cache/browser-<engine>-live/` です。

これは公開ページでの比較です。ログイン後の本文編集、IME 入力、貼り付け、ページ削除など、アカウント権限や入力機器に依存する操作は別途実機で確認します。

ピン留めタイトルの省略表示は `npm run test:pins` で確認します。カード幅130・156・200px、画面幅1440・834・390pxで、長いタイトルの1行表示、短いタイトルの全文表示、通常カードの維持を検査します。`-- --webkit` でWebKit、`-- --live` で公開済みCSSを使えます。実データの書き換えは行わず、Scrapboxと同じDOM構造の確認用ページを使います。

この `--live` はREADMEのimport例と同じ、ページ名をURLエンコードした通常URLを使用します。`sync:verify` はキャッシュを避けるクエリ付きURLで保存内容を照合するため、それだけでは通常URLのキャッシュ更新を確認できません。

## 公開する

公開入口・生成したドキュメント・Scrapbox 用 JSON も一緒にコミットします。[自動同期](auto-sync.md) が設定済みなら `main` へのpush後に配信ページを更新します。手動で確認する場合は `npm run sync:plan` がネットワーク接続・書き込みなしで対象とハッシュを表示します。

セッションを環境変数に設定した環境での `npm run sync:publish` は書き込み操作です。更新対象は `config/scrapbox-sync.json` の配信ページ1件と、設定済み利用先のSettings内のUserCSS管理範囲です。

Scrapbox のページ構造が変更されたときは、その変更に関係する機能のセレクターや DOM 処理を確認してください。

## 元コードを確認する

初回移行の記録は [tests/fixtures/original/](../tests/fixtures/original/README.md) にまとめています。回帰テストは固定した初回コミットから元コードを読み出すため、Git履歴を含むcloneを使用します。初回抽出専用のPythonツールは現行の開発手順から外し、[初回コミット](https://github.com/kamekingdom/kame-layout/tree/68d00aaefdcc5504d59727c23cbe457e38cff19d/tools)に残しています。
