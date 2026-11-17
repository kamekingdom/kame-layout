# GitHubからScrapboxへの自動同期

```text
mainへpush → 構文・回帰・ブラウザテスト → 配信ページ＋標準UserCSSを更新 → 両方を照合
                                                  ↓
                                  PC・iPhone・iPadで再読み込み
```

利用側はScrapbox標準のUserCSS／UserScriptです。GitHubから実行時に直接コードを取得する方式ではありません。GitHub ActionsがコードをScrapboxへ配信するため、拡張機能や端末側の常駐処理は不要です。

## 対象

- リポジトリ：`kamekingdom/kame-layout`
- プロジェクト：`kamelayout`
- 更新するページ：`kame-layout:delivery`
- Scriptの入り口：毎回新しいURLで読む `loader.js` と、バージョン付きの補助モジュール
- 標準UserCSSの配置先：`kamekingdom/Settings` の `style.css` の管理マーカー内
- 対象設定：[config/scrapbox-sync.json](../config/scrapbox-sync.json)

Settingsは明示設定した1ページの `style.css` 管理範囲だけを更新します。初回は認識できる従来の配信importの1行だけを置き換え、その後は管理マーカー内だけを生成します。その他の独自CSS・本文・他のコードブロックは保持します。ユーザーページや以前取り込んだ73ページは自動更新・削除しません。

## 認証と有効化

Scrapboxの通常のPersonal Access TokenとService Accountは読み取り用途です。同期では、ネイティブのImport Pages画面が利用する内部APIへ、`connect.sid`のログインセッションとOrigin・Refererを使って書き込みます。現在の標準画面に合わせ、CSRFトークンは必須にせず、旧API形式で取得できた場合だけ追加します。

`connect.sid`はこの1ページ専用のキーではありません。そのユーザーがアクセスできる範囲の認証情報なので、GitHubへ預ける操作は利用者自身の判断で行ってください。認証アカウントには、コード配置先と、設定した利用先の両プロジェクトを更新できる権限が必要です。値をチャットやIssueへ貼らないでください。

1. 書き込みに使用するアカウントで、`kamelayout`と、設定した利用先`kamekingdom`の更新権限があることを確認します。
2. ブラウザの開発者ツールのApplication → Cookies → `https://scrapbox.io`で、`connect.sid`の値を確認します。
3. [GitHubのActions Secrets](https://github.com/kamekingdom/kame-layout/settings/secrets/actions) に、Repository secret **`SCRAPBOX_SID`** としてその値を登録します。
4. [Actions Variables](https://github.com/kamekingdom/kame-layout/settings/variables/actions) に、Repository variable **`SCRAPBOX_SYNC_ENABLED`** を値 **`true`** で登録します。
5. `Validate and sync Scrapbox`を`main`に対して手動実行します。以降は`main`へのpushで実行します。

認証情報の登録と有効化が済むまでは、検証だけが実行され、配信ジョブはスキップされます。セッションが失効すると同期は失敗し、Secretの更新が必要です。

## 処理の内容

`npm run sync:plan`は書き込みを行いません。`npm run sync:publish`は以下を実行します。

1. 配信対象が管理用マーカー付きの1ページで、標準UserCSSの対象が明示したSettingsだけであることを検査。
2. セッションがメンバープロフィールとして認識されることを確認。
3. 配信ページのマーカーと、利用先のCSS管理マーカーまたは認識できる旧importを確認。認識できない内容は上書きしない。
4. 同じ内容なら書き込みを省略し、公開コードを照合。
5. 更新があれば、直前の配信ページだけをバックアップ。
6. JSONインポートと、ネイティブ画面と同じインポート完了処理を実行。
7. 公開APIのコードブロックすべての本文とContent-Typeを照合。
8. 利用先Settingsを再取得して独自部分を保持したまま結合済みCSSを管理範囲へ反映し、認証付きAPIで照合。個人のSettings全文や独自CSSをログ・公開アーティファクトへ保存しない。

取得・更新先のホストは`https://scrapbox.io`に固定しています。認証情報やAPIのエラー本文はログに出しません。PRや別ブランチでは配信せず、Secretは配信ステップだけへ渡します。

## 復旧と更新確認

同期が成功しても、開いている画面の実行中JSは差し替えません。最新版ローダーへの初回切り替え後は、Scrapboxを再読み込みしてください。2か所の更新が完了する前に再読み込みした場合は、配信ジョブの成功後にもう一度再読み込みしてください。[初回の切り替えと検証方法](fresh-delivery.md)を参照してください。

以前の配信ページはActionsの`previous-delivery-page`アーティファクトに保存します。復旧する場合は自動同期を`false`にしてから、そのJSONを取り込みます。元のページ群を使うimportへ戻すこともできます。同期処理が失敗したときは、成功扱いにせずActionsを確認します。標準UserCSSの管理範囲を復旧する場合は、戻したいGitの版で再生成・同期します。Settingsの管理範囲外は復旧処理でも保持します。同期中にSettingsを編集する場合の競合を減らすため、書き込み直前にも再取得してからマージします。

`npm run sync:verify`は認証情報なしで公開配信ページのコードだけを確認します。非公開の標準UserCSSは配信ジョブ内の認証付き検証で確認します。ローカルの生成物と公開状態が違う場合は失敗します。

## 制約

内部APIは予告なく変更される可能性があります。実際のGitHub Actionsからの書き込みは、Secretを登録して初回の配信ジョブが成功するまで確認済みとは扱いません。通常のAPIキーだけで永続的な書き込み権限を発行する仕組みではありません。

## 参照

- [Scrapbox公式APIの説明](https://scrapbox.io/help-jp/API)
- [Personal Access Token](https://scrapbox.io/help-jp/Personal_Access_Token)
- [Service Account](https://scrapbox.io/help-jp/Service_Account)
- [importPagesの実装](https://github.com/takker99/scrapbox-userscript-std/blob/main/rest/page-data.ts)
- [Cookie・CSRF・Originを使った同期の実装例](https://github.com/mrsekut/cosense-publisher/blob/main/src/cosense.ts)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
