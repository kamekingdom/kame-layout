# コードブロックの表示

薄いグレーの背景と角丸のパネルにまとめ、ヘッダー左にコード記号と標準のファイル名、右に標準のコピーボタンを表示します。ファイル名のリンク・シンタックスハイライト・既存の行番号は維持します。

参考画像の折り返し切替ボタンは追加していません。折り返しは従来のScrapboxの動作を維持します。CSSだけを変更し、本文を書き換えるScriptや疑似的な操作ボタンは追加していません。

## 変更前

![変更前](images/code-blocks-before.png)

## 変更後

![変更後](images/code-blocks-after.png)

## スマートフォン幅

![画面幅390px](images/code-blocks-mobile.png)

## ヘッダーの小型化とコピー完了表示

ラベルとアイコンを12pxに、ヘッダーの上下余白を8pxに抑えています。背景も `#f3f4f5` の薄いグレーへ変更しました。標準コピーが「Copied」の文字列に変わっても、外側の操作領域を56×28pxに固定して、ヘッダーと本文の位置が動かないようにしています。

小型化前：

![ヘッダー小型化前](images/code-header-before.png)

小型化後・コピー完了時：

![小型化後のCopied表示](images/code-header-copied.png)

2026年11月17日に同じ確認用DOMで撮影。通常表示とCopied表示のヘッダー・操作領域・本文の寸法と位置をChrome／WebKitの各画面幅で照合しています。実際のScrapboxのコピー操作でも、通常時とCopied時のヘッダー・操作領域の幅と高さが一致することを確認しました。

再撮影：`node tools/code-blocks-check.mjs --header-baseline`（小型化前との比較）。関連：[Issue #10](https://github.com/kamekingdom/kame-layout/issues/10)。

## 撮影と検証

2026年11月17日撮影。Scrapboxの標準DOMと同じ構造の確認用ページに、変更前後のCSSを適用した表示です。画像の本文はサンプルJSONであり、個人ページの本文は含みません。

Chrome・WebKitで画面幅1440・834・390pxを確認し、ヘッダーと本文の左右端、隣接・入れ子・空のブロック、長いファイル名、コピーボタンの表示、文字列とハイライトの維持を検査しました。公開のScrapboxページでも標準コピーの結果と本文が変更前後で一致することを確認しています。ログイン後の編集操作とiPhone・iPad実機は未確認です。

```sh
node tools/code-blocks-check.mjs
node tools/code-blocks-check.mjs --webkit
```

比較画像は `.cache/code-blocks/<engine>/` に出力します。`--live` は公開済みCSSを読み込みます。通常URLの配信キャッシュによって反映が遅れる場合があるため、保存内容の照合とは分けて確認します。

- [Issue #8](https://github.com/kamekingdom/kame-layout/issues/8)
- [機能の構成](../src/features/code-blocks/README.md)
