# kame-layout

Scrapbox / Cosense の見た目と編集機能を拡張する UserCSS・UserScript 集です。配色、ページ一覧、文字装飾、チェックボックス、検索・置換、表計算、グラフ表示などを管理しています。

**何ができるかは [72機能の一覧](docs/features.md) から確認できます。** 各機能の README に、使い方・有効状態・CSS/JS の役割・ソース・出典をまとめています。

## Scrapbox で使う

GitHub をコードの管理元とし、生成した [Scrapbox 用 JSON](dist/kame-layout.scrapbox.json) をコード配置用のプロジェクトへ取り込みます。Scrapbox の CSP は GitHub / jsDelivr の直接 import を許可していないため、利用時は同じ `scrapbox.io` の `/api/code/` から読み込みます。

1. `dist/kame-layout.scrapbox.json` をダウンロードします。
2. コード配置先のプロジェクトの Settings → Page Data → Import Pages で取り込みます。管理者権限が必要です。[公式のインポート手順](https://scrapbox.io/help-jp/Import_Pages_%2F_Export_Pages)
3. 以下の `YOUR_CODE_PROJECT` を、そのプロジェクト名に置き換えます。

JSON には `kame-layout:entry` と `kame-layout:機能ID` の73ページが含まれます。Settings やユーザーページは含みません。利用者側で npm をインストールする必要はありません。

### UserCSS：見た目を変える

プロジェクト全体に適用する場合は `Settings` ページ、自分だけに適用する場合は自分のユーザーページに記載します。

```text
code:style.css
 @import url("/api/code/YOUR_CODE_PROJECT/kame-layout:entry/style.css");
```

### UserScript：操作や機能を追加する

プロフィール設定で UserScript を Enabled にし、自分のユーザーページに記載します。

```text
code:script.js
 import "/api/code/YOUR_CODE_PROJECT/kame-layout:entry/script.js";
```

既存の読み込みブロックを置き換え、ブラウザを再読み込みします。同じ機能を二重に import すると、イベントやメニューが二重登録される場合があります。

更新時は、GitHub で編集・検証した後、生成し直した JSON をコード配置先へ取り込みます。同名の `kame-layout:` ページを更新する設定を選びます。GitHub に push しただけでは Scrapbox 側のコードは更新されません。Scrapbox 側でソースを手直しすると、次の取り込み時に生成内容へ戻るため、編集は GitHub 側で行います。

## 構成

```text
style.css / script.js     公開入口。既存の import URL を維持
config/features.json      機能の説明、有効・無効、読み込み順
src/features/<機能ID>/    機能ごとの CSS・JS・設定データ・README
src/theme/project.css     プロジェクト共通変数
src/templates/            抽出したテンプレート本文
archive/scrapbox/          無効な旧版・試作・元の読み込み入口
docs/                     機能一覧、構成の理由、開発手順
migration/                元コードの出典・ハッシュ・移動先
tools/                    入口とドキュメントの生成、検証
tests/                    初回コミットとの回帰比較
dist/                     Scrapbox へ取り込む生成済み JSON
```

機能単位に CSS・JS・説明をまとめ、[設定ファイル](config/features.json) から入口と機能一覧を生成します。実行時に設定 JSON を取得する処理や、新しい UI フレームワークは加えていません。CSS の優先順位と Script の実行順は元の構成を維持しています。

変換ルールは [replacements.js](src/features/auto-replace/replacements.js)、テンプレートの定義は [templates.js](src/features/templates/templates.js) のように、処理本体と分けています。

- [機能一覧・各 README](docs/features.md)
- [読み込み順](docs/load-order.md)
- [構成の理由と維持するルール](docs/architecture.md)
- [編集・検証の手順](docs/development.md)
- [出典・参考リンク](SOURCES.md)

## 開発する

Node.js 22 以降と Python 3 を使用します。Python は元 JSON の再抽出時だけ必要です。

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
