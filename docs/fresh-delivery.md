# 再読み込みで最新版を読み込む

`main`へpushし、GitHub Actionsの配信が成功した後にScrapboxを再読み込みすると、配信済みの最新CSSとScriptを読み込みます。ハードリロード・キャッシュ削除・毎回のimport書き換えは不要です。配信中の再読み込みは、直前の配信済みの版を読み込みます。

## 初回だけ変更する設定

標準UserScriptを有効にしたうえで、ユーザーページの既存の配信用 `script.js` importを次の1行へ置き換えます。両方を同時に書くと、機能を二重に起動する可能性があります。

```text
code:script.js
 import(`/api/code/kamelayout/kame-layout%3Adelivery/loader.js?reload=${crypto.randomUUID()}`).catch(console.error);
```

必要なら標準の「UserScriptを読み込む」を押し、再読み込みします。別の配置先では `kamelayout` を変更してください。PC・iPhone・iPadでも各端末の標準UserScriptを有効にします。拡張機能やGitHubへの直接アクセスは不要です。

利用側で切り替えた読み込み入口：

![Scrapbox標準UserScriptに設定した最新版の入口](images/fresh-delivery-entry.jpg)

2026年11月17日、実際のScrapboxで撮影。コードブロック部分だけを掲載しています。固定URLの旧CSSではヘッダー16px・背景 `#e9e9e9` だった画面が、再読み込み後に12px・`#f3f4f5` へ変わることを確認しました。再度の再読み込みでも配信ハッシュが一致し、グラフボタンが重複せず、Settingsの独自CSSが残ることを確認しています。

Settingsにある従来のCSS importと独自CSSは保存したままにできます。ローダーは、新しいCSSの読み込みに成功してから、その画面のCSSOMにある旧配信importだけを除外します。Settingsの保存内容は変更せず、独自のCSS宣言と優先順位も保ちます。UserScriptを無効にした環境では固定UserCSSの表示へ戻るため、従来通りキャッシュ更新を待つ場合があります。

## 仕組み

1. 毎回異なるクエリ付きURLで `loader.js` を取得し、古い入口のキャッシュを避けます。
2. ローダーに埋め込まれた配信ハッシュを、CSS入口・JS入口・CSS import・JSの補助モジュール・JSが読むCSSに付けます。
3. 全依存が同じ配信ハッシュを使うため、入口だけ新しく、補助ファイルが古い組み合わせを避けます。
4. 新しいCSSは既存のユーザーCSSより前へ置き、読み込み成功後に旧importをその画面から除外して、標準と同じ順序でScriptを起動します。
5. 同じ画面で入口が二度importされても、イベントやメニューを重複登録しません。

ハッシュは設定・機能CSS・JS・補助ファイル・共通テーマ・ローダーの内容から生成します。コードに変更がなければ同じ値になり、更新時だけ依存ファイルのURLが変わります。GitHub側の構成・有効な機能・順序は変えません。配信用ページは引き続き1ページです。

## 検証

```sh
npm test
node tools/delivery-check.mjs
node tools/delivery-check.mjs --webkit
npm run test:browser -- --loader
npm run test:browser -- --loader --webkit
```

`delivery-check`は確認用ページで、バージョンなしURLが旧版を返し続ける状態と2回の配信を再現します。再読み込みで入れ子のJS・CSSが新しい版になること、Settingsの独自CSS、二重起動の防止、入口CSSの読み込み失敗時に旧CSSが残ることを確認します。取得URLの記録は `.cache/delivery-<engine>/requests.json` です。

`test:browser --loader`はScrapboxの公開ページと実際のCSPで、現行機能・見た目・文字数カウンター・グラフ操作を確認します。配信後は `--live --loader` で応答を差し替えずに確認できます。Chrome・WebKitでの確認はiPhone・iPad実機での検証とは区別します。

## 復旧

読み込みが失敗するとコンソールへエラーを記録します。入口CSSが失敗した場合は保存済みSettingsの旧CSSを残します。ネットワークが復旧してから再読み込みしてください。CSSを取得してもScriptが失敗した場合は、その画面で途中まで起動した処理が残る可能性があるため、再読み込みでやり直します。

以前の構成へ戻す場合は、ユーザーページを `import "/api/code/kamelayout/kame-layout%3Adelivery/script.js";` へ戻して再読み込みします。この場合は固定URLのキャッシュ待ちが復活します。

- [Issue #12](https://github.com/kamekingdom/kame-layout/issues/12)
- [自動配信の設定・バックアップ](auto-sync.md)
