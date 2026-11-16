# 機能一覧

<!-- config/features.json から生成。説明・設定は config 側を編集してください。 -->

機能名から各 README を開くと、使い方・ソース・出典・旧版を確認できます。CSS と JS の有効状態は個別です。

「任意・無効」は配布対象に含まれますが、初期状態では読み込みません。旧版だけの機能はアーカイブへのリンクを記載しています。

## テーマ・配色

| 機能 | 内容 | CSS | JS |
| --- | --- | --- | --- |
| [フォント設定](../src/features/fonts/README.md) | 本文と UI のフォント・一部の色を設定します。 | 有効 | — |
| [ホーム画面が水中になるuserCSS](../src/features/underwater-home/README.md) | SVG を使う水中風ホーム画面の旧 CSS です。 | — | — |
| [色管理userCSS](../src/features/colors/README.md) | 背景・文字・リンク・ボタンの色変数を設定します。 | 有効 | — |
| [ヘッダー画像を追加する](../src/features/header-image/README.md) | ページ上部に背景画像を表示します。 | 任意・無効 | — |

## レイアウト

| 機能 | 内容 | CSS | JS |
| --- | --- | --- | --- |
| [インデント見栄え変更CSS](../src/features/indent-guides/README.md) | インデントの線と余白を調整します。 | 任意・無効 | — |
| [infoboxカスタムUserCSS](../src/features/infobox/README.md) | infobox のテーブルやリンク表示を整えます。 | 有効 | — |
| [上のUI が左右に離れすぎるのを防ぐ](../src/features/header-width/README.md) | 上部 UI の横幅を制限します。 | 有効 | — |
| [グリッドとリストアイテム](../src/features/grid-layout/README.md) | ページ一覧のグリッドとカードの配置を整えます。 | 有効 | — |
| [ページのデザイン](../src/features/page-layout/README.md) | ページタイトル・本文・背景の見た目を整えます。 | 有効 | — |
| [リンクを2カラムレイアウトにする](../src/features/two-column-links/README.md) | 関連リンクの表示を2カラムに整えます。 | 有効 | — |

## 文字・記法・テーブル

| 機能 | 内容 | CSS | JS |
| --- | --- | --- | --- |
| [チェックボックスCSS](../src/features/checkbox-style/README.md) | チェックボックス記法の見た目を整えます。 | 有効 | — |
| [付箋CSS](../src/features/sticky-notes/README.md) | 付箋風の背景と枠を表示します。 | 有効 | — |
| [ブックマークのuserCSS](../src/features/bookmark-style/README.md) | 栞の装飾を表示します。 | 有効 | — |
| [ハッシュタグが可愛くなるuserCSS](../src/features/hashtags/README.md) | ハッシュタグの色と形を整えます。 | 有効 | — |
| [リンクに関するuserCSS](../src/features/link-colors/README.md) | 既存ページ・未作成ページのリンク表示を整えます。 | 有効 | — |
| [コードに行数を追加するCSS](../src/features/code-line-numbers/README.md) | コードブロックに行番号を表示します。 | 有効 | — |
| [文字揃えCSS](../src/features/text-alignment/README.md) | 装飾記法による文字の配置を調整します。 | 任意・無効 | — |
| [テーブルの見た目](../src/features/tables/README.md) | テーブルの配色・罫線・余白を整えます。 | 有効 | — |
| [電光掲示板UserCSS](../src/features/marquee/README.md) | 文字装飾を電光掲示板風に表示します。 | 任意・無効 | — |
| [インライン引用記法](../src/features/inline-quote/README.md) | インラインの引用装飾を整えます。 | 有効 | — |
| [コードブロックのuserCSS](../src/features/code-blocks/README.md) | コードブロックの配色・枠・余白を整えます。 | 有効 | — |
| [KaTeX の隙間をなくす記法](../src/features/katex-spacing/README.md) | インライン数式の余白を調整します。 | 有効 | — |
| [文字装飾記法userCSS](../src/features/text-decorations/README.md) | 独自の文字装飾を追加します。 | 有効 | — |
| [数式行にも常にバレットを表示するUserCSS](../src/features/math-bullets/README.md) | 数式を含む行のバレット表示を調整します。 | 有効 | — |
| [ダブルクオート](../src/features/double-quote/README.md) | ダブルクオートを使う装飾の見た目を整えます。 | 有効 | — |
| [数字の箇条書きをシャープにする](../src/features/numbered-lists/README.md) | 番号付きリストの数字と余白を整えます。 | 有効 | — |
| [!行を回答風にするUserCSS](../src/features/answer-lines/README.md) | ! で始まる行を回答風に表示します。 | 有効 | — |
| [文字をちょっと薄くする記法](../src/features/muted-text/README.md) | 文字を薄い色で表示する装飾を追加します。 | 有効 | — |
| [おしゃれな見出し](../src/features/headings/README.md) | 見出し装飾用の拡張ポイントです。 | 有効 | — |
| [引用記号](../src/features/quote-bar/README.md) | 行頭のパイプ記号を引用の縦棒として表示します。 | 有効 | — |
| [箇条書きのバレットをFontAwesomeにするUserCSS](../src/features/custom-bullets/README.md) | 箇条書きのバレットを Font Awesome の記号に変更します。 | 有効 | — |

## ページ一覧・ナビゲーション

| 機能 | 内容 | CSS | JS |
| --- | --- | --- | --- |
| [ページリストの大きさ変更CSS](../src/features/card-size/README.md) | ページ一覧カードの大きさを調整します。 | 任意・無効 | — |
| [scrapboxのtitleをnav barに固定するUserCSS](../src/features/navbar-title/README.md) | ページタイトルをナビゲーションバー付近に固定します。 | 有効 | — |
| [プランバッジを非表示にするuserCSS](../src/features/hide-plan-badge/README.md) | プランのバッジを非表示にします。 | 有効 | — |
| [のびのびドロップダウンUserCSS](../src/features/wide-dropdown/README.md) | ドロップダウンを広げて選択しやすくします。 | 有効 | — |
| [外部リンク左横にそのサイトのfaviconを自動表示する](../src/features/external-favicons/README.md) | 外部リンクの横にサイトの favicon を表示します。 | 有効 | 有効 |
| [空白ページ非表示CSS](../src/features/hide-untitled/README.md) | 一覧上の Untitled ページを非表示にします。 | 任意・無効 | — |
| [ソートメニューを常時展開するUserCSS](../src/features/expanded-sort-menu/README.md) | 一覧のソートメニューを展開するための旧 CSS です。 | — | — |
| [ページリストのデザイン](../src/features/page-cards/README.md) | ページ一覧のタイトル・カード・説明文を整えます。 | 有効 | — |
| [Scrapboxアイコンを絵文字に置き換えるuserCSS](../src/features/brand-icon/README.md) | ブランドアイコンの表示を置き換えます。 | 有効 | — |
| [ピンページ項目メニューJS](../src/features/pinned-menu/README.md) | ピン留めページへ移動するメニューを追加します。 | — | 任意・無効 |
| [過去のこの日機能JS](../src/features/on-this-day/README.md) | 過去の同日付に関係するページをメニューに表示します。 | — | 任意・無効 |
| [ピン留めされたアイテムの背景画像](../src/features/pinned-backgrounds/README.md) | 特定のピン留めカードに背景画像を設定します。 | 有効 | — |
| [メニュー関連](../src/features/menus/README.md) | ソートメニューなどの UI 表示を整えます。 | 有効 | — |
| [ホーム画面にランダムでページを表示させたい](../src/features/random-pages/README.md) | ホーム画面にランダムなページカードを追加します。 | — | 有効 |
| [リンクホバー詳細プレビュー](../src/features/link-preview/README.md) | リンク先の内容をホバーでプレビューします。 | 有効 | 有効 |
| [クイックラウンチメニュー](../src/features/quick-launch/README.md) | クイックラウンチの見た目を整えます。 | 任意・無効 | — |
| [ブックマークJS](../src/features/bookmark-menu/README.md) | 栞の挿入や移動を行うメニューを追加します。 | — | 有効 |
| [Obsidian風グラフビュー](../src/features/graph-view/README.md) | ページ間のリンクをグラフとして表示します。 | JSが自動読込 | 有効 |

## 編集支援

| 機能 | 内容 | CSS | JS |
| --- | --- | --- | --- |
| [空白ページ消去提案JS](../src/features/untitled-prompt/README.md) | Untitled ページへの移動時に削除ボタンを開きます。 | — | 有効 |
| [文字列カウントJS](../src/features/legacy-character-count/README.md) | 外部の文字カウント用モジュールを読み込む旧 Script です。 | — | 任意・無効 |
| [所属プロジェクトの候補表示JS](../src/features/project-completion/README.md) | 参加プロジェクトのリンク候補を表示する外部モジュールを使います。 | — | 任意・無効 |
| [テンプレートCSS](../src/features/template-style/README.md) | テンプレート関連の表示を装飾します。 | 任意・無効 | — |
| [新規ページ作成ショートカット](../src/features/new-page-shortcut/README.md) | Ctrl+Enter で新規ページへ移動します。 | — | 有効 |
| [テキスト置換機能](../src/features/find-replace/README.md) | ページ内の検索・置換 UI を追加します。 | 有効 | 有効 |
| [見える文字数カウンター](../src/features/character-counter/README.md) | 表示されている本文の文字数と詳細を表示します。 | 有効 | 有効 |
| [チェックボックス](../src/features/checkbox-toggle/README.md) | チェックボックス記法の状態をクリックで切り替えます。 | — | 有効 |
| [自動文字置き換え](../src/features/auto-replace/README.md) | 入力した記号列を矢印・数学記号などへ変換します。 | — | 有効 |
| [テーブルのコピー機能](../src/features/table-copy/README.md) | テーブルをコピーするボタンを追加します。 | — | 有効 |
| [子階層の折りたたみ](../src/features/hierarchy-fold/README.md) | 子階層の折りたたみと展開を切り替えます。 | 有効 | 有効 |
| [表計算スクリプト](../src/features/spreadsheet/README.md) | テーブル内の数式を計算し、結果を表示します。 | 有効 | 有効 |
| [ステータス切替アイコン](../src/features/status-icons/README.md) | 進捗を表すアイコンの状態を切り替えます。 | 有効 | 有効 |
| [アイコン自動補完JS](../src/features/icon-menu/README.md) | よく使うアイコンを挿入するメニューを追加します。 | — | 有効 |
| [テンプレートJS](../src/features/templates/README.md) | 空のページにテンプレートを挿入するメニューを追加します。 | — | 有効 |
| [選択行をソート](../src/features/sort-lines/README.md) | 選択した行を子階層ごとにソートします。 | — | 有効 |

## 画像・音声・ファイル

| 機能 | 内容 | CSS | JS |
| --- | --- | --- | --- |
| [画像サイズCSS](../src/features/image-size/README.md) | 本文画像の表示サイズを調整します。 | 任意・無効 | — |
| [画像中心CSS](../src/features/image-center/README.md) | 本文画像を中央に配置します。 | 任意・無効 | — |
| [画像を並べるUserCSS](../src/features/image-gallery/README.md) | 複数画像を並べるためのレイアウトを適用します。 | 任意・無効 | — |
| [音声ファイルを再生可能にする](../src/features/audio-player/README.md) | 本文内の音声リンクにプレイヤーを表示します。 | 有効 | 有効 |
| [画像を一行に均等に配置する](../src/features/equal-image-rows/README.md) | 同じ行の画像を均等な幅で並べます。 | 有効 | 有効 |
| [アップロードしたファイルリンクのデザインをボタンにするUserCSS](../src/features/file-buttons/README.md) | 添付ファイルへのリンクをボタン風に表示します。 | 任意・無効 | — |
| [画像に連番を振るUserCSS](../src/features/figure-numbers/README.md) | 画像へ連番を付ける装飾を追加します。 | 任意・無効 | — |
