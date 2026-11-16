# 編集と検証

## コードを探す

まず [機能一覧](features.md) から該当する README を開きます。

- 見た目を変える：その機能の `style.css`。
- 操作を変える：その機能の `script.js`。
- 矢印などの変換表を変える：`src/features/auto-replace/replacements.js`。
- テンプレートの表示名や取得先を変える：`src/features/templates/templates.js`。
- 機能の説明・有効状態・読み込み順を変える：`config/features.json`。
- 配色を変える：`src/features/colors/style.css`。

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

## ブラウザで比較する

Google Chrome をインストールした環境で実行します。

```sh
npm run test:browser
```

公開の Scrapbox テストページを、認証情報を持たないブラウザで開き、変更前と変更後の CSS・JS をそれぞれ適用します。通常モードは生成 JSON の応答をテスト用に返します。実際に配信用ページを更新した後は、下の `--live` モードで**公開済みのAPI応答を差し替えず**に読み込みます。CSP は変更しません。デスクトップとモバイル幅で表示・機能 UI を比較します。Scrapbox への書き込みは行いません。

```sh
npm run sync:verify
npm run test:browser -- --live
npm run test:browser -- --live --webkit
```

WebKitモードには `npx playwright install webkit` でテスト用ブラウザを準備します。WebKitはSafari系エンジンでの検証であり、実物のiPhone・iPadでの動作確認を意味しません。出力は `.cache/browser-<engine>-live/` です。

これは公開ページでの比較です。ログイン後の本文編集、IME 入力、貼り付け、ページ削除など、アカウント権限や入力機器に依存する操作は別途実機で確認します。

## 公開する

公開入口・生成したドキュメント・Scrapbox 用 JSON も一緒にコミットします。[自動同期](auto-sync.md) が設定済みなら `main` へのpush後に配信ページを更新します。手動で確認する場合は `npm run sync:plan` がネットワーク接続・書き込みなしで対象とハッシュを表示します。

セッションを環境変数に設定した環境での `npm run sync:publish` は書き込み操作です。更新対象は `config/scrapbox-sync.json` の配信ページ1件に限定します。

Scrapbox のページ構造が変更されたときは、その変更に関係する機能のセレクターや DOM 処理を確認してください。

## JSON を再抽出する

元 JSON を再確認するときは、新しい出力先に取り出します。

```sh
python3 tools/extract.py /path/to/kamelayout.json /path/to/new-output
```

抽出ツールは元のページ別構成を出力します。現行の機能別構成へ自動上書きする用途ではありません。
