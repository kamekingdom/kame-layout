# kame-layout

Scrapbox / Cosense の見た目と編集機能を拡張する UserCSS・UserScript 集です。配色、ページ一覧、文字装飾、チェックボックス、検索・置換、表計算、グラフ表示などを管理しています。

**何ができるかは [72機能の一覧](docs/features.md) から確認できます。** 各機能の README に、使い方・有効状態・CSS/JS の役割・ソース・出典をまとめています。

ピン留めタイトルは、長い場合も1行に収めて末尾を「…」で省略します。[変更前後の比較と確認方法](docs/pinned-titles.md)

![ピン留めタイトルの表示例](docs/images/pinned-titles-after.png)

## Scrapbox で使う

GitHub をコードの管理元とし、生成した [Scrapbox 用 JSON](dist/kame-layout.scrapbox.json) をコード配置用のプロジェクトへ取り込みます。Scrapbox の CSP は GitHub / jsDelivr の直接 import を許可していないため、利用時は同じ `scrapbox.io` の `/api/code/` から読み込みます。

1. `dist/kame-layout.scrapbox.json` をダウンロードします。
2. コード配置先のプロジェクトの Settings → Page Data → Import Pages で取り込みます。管理者権限が必要です。[公式のインポート手順](https://scrapbox.io/help-jp/Import_Pages_%2F_Export_Pages)
3. 以下の `YOUR_CODE_PROJECT` を、そのプロジェクト名に置き換えます。

JSON に含まれるのは **`kame-layout:delivery` の1ページだけ**です。機能ごとのコードと補助モジュールを同じページに配置します。Settings・ユーザーページ・既存の機能ページは含みません。利用者側で npm をインストールする必要はありません。iPhone・iPadでも通常のUserCSS／UserScriptから利用できます。

### UserCSS：見た目を変える

プロジェクト全体に適用する場合は `Settings` ページ、自分だけに適用する場合は自分のユーザーページに記載します。

```text
code:style.css
 @import url("/api/code/YOUR_CODE_PROJECT/kame-layout%3Adelivery/style.css");
```

### UserScript：操作や機能を追加する

プロフィール設定で UserScript を Enabled にし、自分のユーザーページに記載します。

```text
code:script.js
 import "/api/code/YOUR_CODE_PROJECT/kame-layout%3Adelivery/script.js";
```

既存の読み込みブロックを置き換え、ブラウザを再読み込みします。同じ機能を二重に import すると、イベントやメニューが二重登録される場合があります。

自動同期を有効にすると、`main` への push → 検証 → この1ページの更新 → 公開コードの照合、の順に実行します。Scrapboxで既に開いている画面の実行中コードは置き換えず、**ブラウザを再読み込みしたときに新しい版を読み込みます**。

URL中の `%3A` はページ名の `:` をURLエンコードした表記です。配信キャッシュに古いコードが残ると、再読み込み後も反映が遅れる場合があります。同期完了と通常URLでの表示反映は、別々に確認してください。

初回の認証設定と有効化は [自動同期の設定](docs/auto-sync.md) を参照してください。認証未設定・同期無効の間はGitHubへのpushだけではScrapboxは更新されません。生成したJSONを手動で取り込むこともできます。

## 構成

```text
style.css / script.js     公開入口。既存の import URL を維持
config/features.json      機能の説明、有効・無効、読み込み順
config/scrapbox-sync.json  同期先プロジェクトと配信用ページ
src/features/<機能ID>/    機能ごとの CSS・JS・設定データ・README
src/theme/project.css     プロジェクト共通変数
src/templates/            抽出したテンプレート本文
archive/scrapbox/          無効な旧版・試作・元の読み込み入口
docs/                     機能一覧、構成の理由、開発手順
migration/                元コードの出典・ハッシュ・移動先
tools/                    入口とドキュメントの生成、検証
tests/                    初回コミットとの回帰比較
dist/                     Scrapbox へ取り込む生成済み JSON
.github/workflows/         検証とmainへのpush後の自動同期
```

機能単位に CSS・JS・説明をまとめ、[設定ファイル](config/features.json) から入口と機能一覧を生成します。実行時に設定 JSON を取得する処理や、新しい UI フレームワークは加えていません。CSS の優先順位と Script の実行順は元の構成を維持しています。

変換ルールは [replacements.js](src/features/auto-replace/replacements.js)、テンプレートの定義は [templates.js](src/features/templates/templates.js) のように、処理本体と分けています。

大きなCSSは `cells.css`・`header.css` など表示部分ごとに分け、機能の `style.css` で順序を管理します。配信時には機能ごとに結合します。Scriptは `script.js` に初期化・イベント・状態を残し、計算・解析・DOM部品を補助モジュールへ分けています。例えば表計算の [engine.js](src/features/spreadsheet/engine.js) は画面なしで検証できます。各READMEの表からファイルの役割を確認できます。

- [機能一覧・各 README](docs/features.md)
- [読み込み順](docs/load-order.md)
- [構成の理由と維持するルール](docs/architecture.md)
- [編集・検証の手順](docs/development.md)
- [自動同期・認証・復旧の手順](docs/auto-sync.md)
- [出典・参考リンク](SOURCES.md)

## 開発する

Issue・作業ブランチ・PR・検証・マージの進め方は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

Node.js 22.13 以降と Python 3 を使用します。Python は元 JSON の再抽出時だけ必要です。

```sh
npm ci
npm run build
npm run check
npm test
```

`npm run build` は公開入口・機能 README・Scrapbox 用 JSON を更新します。`src/features/` のコードは生成物ではないため直接編集できます。機能の説明や初期設定を変える場合は `config/features.json` を編集してください。

## 元コードと既存の依存関係

元 JSON から抽出した CSS 82・JS 37・テンプレート12の計131ファイルは、現行コードまたはアーカイブへ対応付けています。変更前は [初回コミット](https://github.com/kamekingdom/kame-layout/tree/68d00aaefdcc5504d59727c23cbe457e38cff19d)、出典は [manifest.json](migration/manifest.json)、移動先は [paths.json](migration/paths.json) で追えます。ユーザー情報を含む元 JSON は公開していません。

元の CSS 入口にあった3件の参照切れは、効果のない import として現行入口から除きました。別の装飾を代わりに有効にすることはしていません。グラフの CSS は従来通り Script が読み込みます。

テンプレートの取得先、アイコン・画像・フォント・外部モジュールへの参照は各 README に記載しています。特にテンプレートは動作維持のため、従来の `kamelayout` の API から取得する構成です。取得先の変更は [templates.js](src/features/templates/templates.js) で行えます。

## 参考

- [Scrapbox UserCSS](https://scrapbox.io/help-jp/UserCSS)
- [Scrapbox UserScript](https://scrapbox.io/help-jp/UserScript)
- [jsDelivr の GitHub 配信](https://github.com/jsdelivr/jsdelivr#github)
