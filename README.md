# kame-layout

Scrapbox / Cosense の UserCSS・UserScript を GitHub で管理するリポジトリです。

添付された `kamelayout.json`（2026-11-16 のエクスポート）から取り出したプログラムを、変更せずに保存しています。初回の移行では、不具合修正・パスの書き換え・リファクタリングを行っていません。

## Scrapbox から読み込む

公開リポジトリのファイルを jsDelivr 経由で読み込みます。ビルドや GitHub Actions は不要です。

### UserCSS

プロジェクト全体に適用する場合は `Settings` ページ、自分だけに適用する場合は自分のユーザーページに、次のコードブロックを置きます。

```text
code:style.css
 @import url("https://cdn.jsdelivr.net/gh/kamekingdom/kame-layout@main/style.css");
```

### UserScript

自分のユーザーページに次のコードブロックを置き、プロフィール設定で UserScript を Enabled にします。

```text
code:script.js
 import "https://cdn.jsdelivr.net/gh/kamekingdom/kame-layout@main/script.js";
```

既存の読み込みブロックをこの内容に置き換え、ブラウザを再読み込みしてください。既存コードと両方読み込むと、機能が二重登録される場合があります。

Scrapbox 上のユーザーページや Settings 自体は、この移行作業では編集していません。

## 構成

```text
style.css                CSS の公開入口 → src/Settings/style.css
script.js                JS の公開入口  → src/kame/script.js
src/<Scrapboxページ名>/   元のコードブロック名で保存したソース
src/Template/            テンプレートJSで使用する .txt ファイル
migration/manifest.json  抽出元ページ・コードブロック位置・SHA-256
tools/extract.py         JSON からの抽出用スクリプト
SOURCES.md               元ページに記載されていた参考リンク
```

抽出結果は CSS 82 ファイル、JavaScript 37 ファイル、テンプレート 12 ファイルの計 131 ファイルです。160 個のコードブロックを取り出しています。

同じページに同名のコードブロックが複数ある場合は、Scrapbox の `/api/code` と同様に、ページ内の順序で改行を挟んで連結しています。無効化された import、旧版のコード、既存の誤字もそのままです。

ユーザー情報やメールアドレスを含む元の JSON はコミットしていません。

## 更新する

`src/` の該当ファイルを編集し、GitHub に push します。各機能の有効・無効と順序は `src/Settings/style.css` と `src/kame/script.js` が管理しています。

jsDelivr のブランチ URL にはキャッシュがあり、`@main` の更新反映には時間がかかる場合があります。特定の版を固定する場合は、入口 URL の `@main` をコミット SHA に置き換えます。

## 初回移行時点の未修正事項

元の `Settings/style.css` には、次の参照があります。

- `../ピン止め遷移CSS/style.css`：該当コードが JSON に存在せず、元の API も 404。
- `../空白ページ消去/style.css`：該当コードが JSON に存在せず、元の API も 404。
- `../Obsidian風グラフビュー/stlye.css`：JSON の実際の名前は `style.css`。

これらは変更前の状態を残すため、そのまま保存しています。テンプレート取得先や、無効な機能に含まれる外部モジュール参照も元のままです。画像・フォント・アイコンなど、既存の外部リソースへの依存も残っています。

今回の確認範囲は、JSON からの抽出一致と公開 URL での配信です。Scrapbox の画面上での各機能の動作確認は別途必要です。

## 元 JSON から再抽出する

Python 3 の標準ライブラリだけを使用します。編集済みソースを上書きしないよう、新しいディレクトリを指定してください。

```sh
python3 tools/extract.py /path/to/kamelayout.json /path/to/new-output
```

## 参考

- [Scrapbox UserCSS](https://scrapbox.io/help-jp/UserCSS)
- [Scrapbox UserScript](https://scrapbox.io/help-jp/UserScript)
- [jsDelivr の GitHub 配信](https://github.com/jsdelivr/jsdelivr#github)
- [jsDelivr のキャッシュ仕様](https://github.com/jsdelivr/jsdelivr#caching)
