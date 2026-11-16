# テンプレート本文

元の `Template` ページの12個のコードブロックです。内容を変更せず抽出しています。

現在のテンプレートメニューは、動作維持のため従来の Scrapbox API から本文を取得します。ここにあるファイルの編集だけでは取得内容は変わりません。表示名と取得先は [templates.js](../features/templates/templates.js) で設定します。

このリポジトリからの取得へ切り替える場合は、テンプレート定義側で `new URL("../../templates/thesis.txt", import.meta.url).href` のように URL を解決し、取得内容と挿入操作を確認してください。
