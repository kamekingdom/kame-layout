// Author: kamekingdom (2026-09-07)

/**
 * [. タイトル] のセレクタ
 *
 * @type {string}
 */
const __bkmClass = '.deco-\\.';


/**
 * サブブックマークとして認識するパターン。
 *
 * 例:
 * 1. L4とは？
 * 2. L7とは？
 * 10. その他
 *
 * 半角 "." と全角 "．" の両方に対応。
 *
 * @type {RegExp}
 */
const __subBkmPattern = /^\s*(\d+)[.．]\s*(.+?)\s*$/;


/**
 * Bookmarkメニュー名
 *
 * @type {string}
 */
const __bkmMenuTitle = 'Bookmarks';


/**
 * Bookmarkアイコン
 *
 * @type {string}
 */
const __bkmIconUrl =
  'https://scrapbox.io/files/6629f6817393d100238acf00.png';


/**
 * 指定したScrapboxの行までスクロールする。
 *
 * @param {HTMLElement} element
 * @param {number} fixedHeaderHeight
 * @returns {void}
 */
function __scrollToBookmark(
  element,
  fixedHeaderHeight
) {
  const $element = $(element);

  $('html, body').animate(
    {
      scrollTop:
        $element.offset().top
        - $('body').offset().top
        - fixedHeaderHeight
    },
    150
  );
}


/**
 * Scrapboxの1行から表示テキストを取得する。
 *
 * @param {HTMLElement} element
 * @returns {string}
 */
function __getLineText(element) {
  return $(element)
    .text()
    .replace(/\u00a0/g, ' ')
    .trim();
}


/* =========================================================
   Bookmarkメニュー作成
   ========================================================= */

scrapbox.PageMenu.addMenu({
  title: __bkmMenuTitle,
  image: __bkmIconUrl,

  onClick: function () {

    /**
     * 固定ヘッダーの高さ
     *
     * @type {number}
     */
    const __fixedHeaderHeight =
      (
        $('.navbar').css('position') === 'fixed'
          ? $('.navbar').height() || 0
          : 0
      )
      +
      (
        $('.navbar-pagemenu').height() || 0
      );


    /*
     * Bookmarkメニューを毎回作り直す。
     */
    scrapbox.PageMenu(__bkmMenuTitle).removeAllItems();


    /**
     * 現在、親見出し [. タイトル] の
     * 内部にいるかどうか。
     *
     * [. タイトル] が出現する前の
     * "1. xxx" はBookmarkに含めない。
     *
     * @type {boolean}
     */
    let __hasParentBookmark = false;


    /*
     * ページ内の全行を上から順番に確認する。
     */
    $('.line').each(
      function (
        /** @type {number} */ index,
        /** @type {HTMLElement} */ element
      ) {

        const $line = $(element);


        /*
         * ========================================
         * 親Bookmark
         *
         * [. タイトル]
         * ========================================
         */

        const $heading = $line
          .find(__bkmClass)
          .first();


        if ($heading.length > 0) {

          /**
           * 見出しテキスト
           *
           * @type {string}
           */
          const headingTitle =
            $heading.text().trim();


          if (headingTitle !== '') {

            scrapbox.PageMenu(__bkmMenuTitle).addItem({
              title: headingTitle,

              onClick: function () {
                __scrollToBookmark(
                  element,
                  __fixedHeaderHeight
                );
              }
            });


            /*
             * ここから次の [. タイトル] までは
             * この見出し配下として扱う。
             */
            __hasParentBookmark = true;
          }


          return;
        }


        /*
         * ========================================
         * 子Bookmark
         *
         * 1. title
         * 2. title
         * ...
         * ========================================
         */

        if (!__hasParentBookmark) {
          return;
        }


        /**
         * 行全体のテキスト
         *
         * @type {string}
         */
        const lineText =
          __getLineText(element);


        /**
         * "数字. タイトル" に一致するか確認
         *
         * @type {RegExpMatchArray | null}
         */
        const match =
          lineText.match(__subBkmPattern);


        if (match === null) {
          return;
        }


        /**
         * 番号
         *
         * @type {string}
         */
        const number = match[1];


        /**
         * サブタイトル
         *
         * @type {string}
         */
        const title = match[2];


        /*
         * 全角スペース + ↳ によって
         * サブBookmarkであることを視覚的に表現する。
         */
        scrapbox.PageMenu(__bkmMenuTitle).addItem({
          title: `　↳ ${number}. ${title}`,

          onClick: function () {
            __scrollToBookmark(
              element,
              __fixedHeaderHeight
            );
          }
        });
      }
    );
  }
});