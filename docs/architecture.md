# 構成の理由

このリポジトリでは、**公開入口を固定し、機能ごとにコードと説明をまとめ、読み込み順を一か所で管理する構成**を採用しています。

## 機能ごとにまとめる

CSS だけの機能、JS だけの機能、両方が組になる機能があります。`src/features/<id>/` にまとめると、ある表示や操作を直すときに、関連コードと README を同じ場所から見つけられます。元ページ名は日本語の機能名・出典として残し、配信パスには英数字の ID を使用します。

処理を全機能共通の巨大な Script にまとめることはしていません。機能固有の状態・イベント・後片付けは、その機能内に置きます。共通化は、同じ振る舞いであることを確認できる処理から行います。

## 公開入口と実装を分ける

`style.css` と `script.js` は GitHub 上の配布入口です。以前の `src/Settings/style.css` と `src/kame/script.js` も、この入口へ転送する互換ファイルとして残しています。

実ブラウザの確認では、Scrapbox の CSP により外部 CDN の CSS・ES Modules はブロックされました。そのため Scrapbox 用には `dist/kame-layout.scrapbox.json` を生成し、同一オリジンの `/api/code/プロジェクト/kame-layout:entry/` を入口にします。外部 URL の直接 import を前提にしません。CSP を無効化する設定や拡張機能も必要ありません。

JSON では1機能を1ページに対応させ、CSS・JS・補助モジュールを同じページのコードブロックに配置します。これにより、`./replacements.js` や `./style.css` の相対参照と、Script が CSS を読み込む動作を保ちます。既存の Settings・ユーザーページは生成 JSON に含めません。

JavaScript はブラウザ標準の ES Modules を使います。追加のランタイムライブラリはありません。現在の規模では独立した機能を直接 import する形にし、バンドラーによる `import.meta.url` の変化を避けています。将来通信数が問題になった場合は、専用 CSS やテンプレートの URL を含めて検証した上でバンドルを検討できます。[MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

## CSS と JS の順序を維持する

機能一覧はカテゴリ別に表示しますが、実際の読み込み順は `config/features.json` の `defaults.styles` と `defaults.scripts` に明示します。

CSS は後に書いた宣言が前の宣言を上書きする場合があります。そのため、見た目に影響する並べ替え、セレクターの統合、`!important` の一括削除、cascade layer の導入は今回の整理に含めていません。セレクター・値・宣言順は回帰比較で確認します。[MDN: CSS cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Introduction)

JS も初期化の順序を維持します。動的 import を並列化したり、全機能を新しいライフサイクル管理下へ移したりする変更は行っていません。Script 内の AbortController や MutationObserver の扱いも維持しています。

グラフビューの CSS は Script が自身の `import.meta.url` を基準に読み込みます。これを全体 CSS に追加すると、CSS だけを使う人にも新たな装飾が適用されるため、従来の読み込み範囲を保っています。

## 設定と説明を同期する

`config/features.json` は、機能名・用途・使い方・有効状態・読み込み順の情報源です。生成処理が公開入口、機能一覧、各機能の README、読み込み順を更新します。

`npm run check` は生成物の更新漏れを検出します。説明だけ更新されて実際の設定が変わらない、またはその逆になる状態を防ぎます。変換表のような機能固有のデータは、その機能内の JS モジュールへ分離します。

## 元コードを追えるようにする

旧版・試作は `archive/scrapbox/` に分け、現行入口からは読み込みません。元から構文上の問題があった未使用コードも、修正せず保管しています。元の131ファイルと現在の保存先は `migration/paths.json` で対応付けています。

回帰テストでは、CSS とアーカイブの元データ、JS の構文木、実行順、グラフの相対 URL を確認します。設定表を別ファイルに移した JS は、その宣言を展開して初回コミットと比較します。
