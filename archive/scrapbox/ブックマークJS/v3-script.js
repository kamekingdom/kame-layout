// Author: kamekingdom (2026-09-07)

/**
 * [. タイトル] のセレクタ
 *
 * @type {string}
 */
const __bkmClass = '.deco-\\.';


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
 * 数字見出し。
 *
 * 対応例:
 *
 * 1. Title
 * 2. Title
 *   1. Sub title
 *     1. Sub sub title
 *
 * @type {RegExp}
 */
const __numberHeadingPattern =
  /^([ \t\u3000]*)(\d+)[.．]\s+(.+?)\s*$/;


/**
 * 行頭のインデントを数値化する。
 *
 * 半角space = 1
 * 全角space = 2
 * tab = 4
 *
 * 絶対値そのものではなく、
 * 「前の数字見出しより深いか浅いか」の判定に使う。
 *
 * @param {string} indent
 * @returns {number}
 */
function __getIndentWidth(indent) {
  /** @type {number} */
  let width = 0;

  for (const char of indent) {
    if (char === '\t') {
      width += 4;
    } else if (char === '\u3000') {
      width += 2;
    } else {
      width += 1;
    }
  }

  return width;
}


/**
 * インデント量から論理的な階層を求める。
 *
 * 例:
 *
 * indent 1 → level 0
 * indent 4 → level 1
 * indent 8 → level 2
 * indent 4 → level 1
 * indent 1 → level 0
 *
 * @param {number} indentWidth
 * @param {number[]} stack
 * @returns {number}
 */
function __getHierarchyLevel(
  indentWidth,
  stack
) {
  /*
   * 最初の数字見出し。
   */
  if (stack.length === 0) {
    stack.push(indentWidth);
    return 0;
  }


  /*
   * 現在より浅い位置に戻ってきた場合、
   * stackを巻き戻す。
   */
  while (
    stack.length > 0 &&
    indentWidth < stack[stack.length - 1]
  ) {
    stack.pop();
  }


  /*
   * 全階層よりさらに左に来た場合。
   */
  if (stack.length === 0) {
    stack.push(indentWidth);
    return 0;
  }


  /*
   * 同じインデントなら同階層。
   */
  if (
    indentWidth ===
    stack[stack.length - 1]
  ) {
    return stack.length - 1;
  }


  /*
   * 現在より深いインデントなら
   * 新しい階層。
   */
  stack.push(indentWidth);

  return stack.length - 1;
}


/**
 * Scrapboxの表示上の行テキストを取得する。
 *
 * [L4] などはDOM上では
 * L4 として表示されるため、
 * Bookmarkも画面表示に近い文字列になる。
 *
 * @param {HTMLElement} element
 * @returns {string}
 */
function __getRenderedLineText(element) {
  return $(element)
    .text()
    .replace(/\u00a0/g, ' ')
    .trim();
}


/**
 * Bookmarkの階層を視覚的に表現する。
 *
 * level 0:
 * 1. AAA
 *
 * level 1:
 * 　↳ 1. BBB
 *
 * level 2:
 * 　　↳ 1. CCC
 *
 * @param {string} title
 * @param {number} level
 * @returns {string}
 */
function __formatBookmarkTitle(
  title,
  level
) {
  if (level <= 0) {
    return title;
  }

  return (
    '　'.repeat(level) +
    '↳ ' +
    title
  );
}


/**
 * 指定した行へスクロールする。
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

  /** @type {JQuery.Coordinates | undefined} */
  const offset = $element.offset();

  /** @type {JQuery.Coordinates | undefined} */
  const bodyOffset = $('body').offset();

  if (!offset || !bodyOffset) {
    return;
  }

  $('html, body').animate(
    {
      scrollTop:
        offset.top -
        bodyOffset.top -
        fixedHeaderHeight
    },
    150
  );
}


/* =========================================================
   Bookmark Menu
   ========================================================= */

scrapbox.PageMenu.addMenu({
  title: __bkmMenuTitle,

  image: __bkmIconUrl,

  onClick: function () {

    /* =====================================================
       Header Height
       ===================================================== */

    /** @type {number} */
    const navbarHeight =
      $('.navbar').css('position') === 'fixed'
        ? $('.navbar').height() || 0
        : 0;


    /** @type {number} */
    const pageMenuHeight =
      $('.navbar-pagemenu').height() || 0;


    /** @type {number} */
    const fixedHeaderHeight =
      navbarHeight + pageMenuHeight;


    /* =====================================================
       Reset Menu
       ===================================================== */

    scrapbox.PageMenu(
      __bkmMenuTitle
    ).removeAllItems();


    /* =====================================================
       Hierarchy State
       ===================================================== */

    /**
     * 数字見出しのインデント階層。
     *
     * 例:
     *
     * [
     *   1,
     *   4,
     *   8
     * ]
     *
     * @type {number[]}
     */
    let indentStack = [];


    /**
     * 現在 [. タイトル] の配下にいるか。
     *
     * @type {boolean}
     */
    let hasSectionTitle = false;


    /* =====================================================
       Scan all Scrapbox lines
       ===================================================== */

    const pageLines =
      scrapbox.Page.lines || [];


    pageLines.forEach(
      /**
       * @param {{id: string | number, text?: string}} line
       * @returns {void}
       */
      function (line) {

        /** @type {HTMLElement | null} */
        const element =
          document.getElementById(
            'L' + line.id
          );


        if (!element) {
          return;
        }


        /* =================================================
           [. タイトル]
           ================================================= */

        const $heading =
          $(element)
            .find(__bkmClass)
            .first();


        if ($heading.length > 0) {

          /** @type {string} */
          const headingTitle =
            $heading
              .text()
              .trim();


          if (headingTitle !== '') {

            scrapbox.PageMenu(
              __bkmMenuTitle
            ).addItem({
              title: headingTitle,

              onClick: function () {
                __scrollToBookmark(
                  element,
                  fixedHeaderHeight
                );
              }
            });
          }


          /*
           * 新しい [. タイトル] に入ったので、
           * 数字見出しの階層をリセット。
           */
          indentStack = [];

          hasSectionTitle = true;

          return;
        }


        /* =================================================
           Number Heading
           ================================================= */

        /** @type {string} */
        const rawText =
          typeof line.text === 'string'
            ? line.text
            : __getRenderedLineText(
                element
              );


        /** @type {RegExpMatchArray | null} */
        const match =
          rawText.match(
            __numberHeadingPattern
          );


        if (!match) {
          return;
        }


        /**
         * 行頭space/tab。
         *
         * @type {string}
         */
        const indentText = match[1];


        /**
         * 行頭インデント幅。
         *
         * @type {number}
         */
        const indentWidth =
          __getIndentWidth(
            indentText
          );


        /**
         * 数字階層。
         *
         * @type {number}
         */
        const numberLevel =
          __getHierarchyLevel(
            indentWidth,
            indentStack
          );


        /**
         * [. タイトル] が存在する場合、
         * 数字見出しを1段下げる。
         *
         * [. タイトル]
         *   └ 1.
         *      └ 1.
         *
         * タイトルがない場合は
         * 数字をルートとして扱う。
         *
         * @type {number}
         */
        const displayLevel =
          numberLevel +
          (
            hasSectionTitle
              ? 1
              : 0
          );


        /**
         * Scrapbox上でレンダリングされた文字列。
         *
         * [L4] → L4
         *
         * @type {string}
         */
        const renderedText =
          __getRenderedLineText(
            element
          );


        /**
         * Menu表示文字列。
         *
         * @type {string}
         */
        const menuTitle =
          __formatBookmarkTitle(
            renderedText,
            displayLevel
          );


        scrapbox.PageMenu(
          __bkmMenuTitle
        ).addItem({
          title: menuTitle,

          onClick: function () {
            __scrollToBookmark(
              element,
              fixedHeaderHeight
            );
          }
        });
      }
    );
  }
});