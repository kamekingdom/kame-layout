// Author: kamekingdom (2026-11-13)

(() => {
  "use strict";

  /**
   * @typedef {{id: string | number, text?: string}} CosenseLine
   * @typedef {{
   *   lines?: CosenseLine[]
   * }} CosensePage
   * @typedef {{
   *   addItem: (item: {title: string, onClick: () => void}) => void,
   *   removeAllItems: () => void
   * }} CosenseMenu
   * @typedef {{
   *   Page?: CosensePage,
   *   PageMenu: ((
   *     title: string
   *   ) => CosenseMenu) & {
   *     addMenu: (item: {
   *       title: string,
   *       image: string,
   *       onClick: () => void
   *     }) => void
   *   }
   * }} CosenseAPI
   */

  /** @type {string} */
  const HEADING_SELECTOR = ".deco-\\.";

  /** @type {string} */
  const MENU_TITLE = "Bookmarks";

  /** @type {string} */
  const ICON_URL = "https://scrapbox.io/files/6629f6817393d100238acf00.png";

  /** @type {RegExp} */
  const NUMBER_HEADING_PATTERN = /^([ \t\u3000]*)(\d+)[.．]\s+(.+?)\s*$/;

  /** @type {CosenseAPI | undefined} */
  const api = /** @type {any} */ (window).scrapbox ?? /** @type {any} */ (window).cosense;

  if (!api || typeof api.PageMenu?.addMenu !== "function") {
    console.warn("[Bookmarks] Cosense PageMenu API is unavailable.");
    return;
  }

  /**
   * インデント幅を数値化する。
   *
   * 半角スペース = 1
   * 全角スペース = 2
   * タブ = 4
   *
   * @param {string} indent
   * @returns {number}
   */
  function getIndentWidth(indent) {
    /** @type {number} */
    let width = 0;

    for (const char of indent) {
      if (char === "\t") {
        width += 4;
      } else if (char === "\u3000") {
        width += 2;
      } else {
        width += 1;
      }
    }

    return width;
  }

  /**
   * インデントから数字見出しの階層を判定する。
   *
   * @param {number} indentWidth
   * @param {number[]} stack
   * @returns {number}
   */
  function getHierarchyLevel(indentWidth, stack) {
    if (stack.length === 0) {
      stack.push(indentWidth);
      return 0;
    }

    while (stack.length > 0 && indentWidth < stack[stack.length - 1]) {
      stack.pop();
    }

    if (stack.length === 0) {
      stack.push(indentWidth);
      return 0;
    }

    if (indentWidth === stack[stack.length - 1]) {
      return stack.length - 1;
    }

    stack.push(indentWidth);
    return stack.length - 1;
  }

  /**
   * Cosenseの画面上に表示される行テキストを取得する。
   *
   * @param {HTMLElement} element
   * @returns {string}
   */
  function getRenderedLineText(element) {
    return (element.textContent ?? "").replace(/\u00a0/g, " ").trim();
  }

  /**
   * 数字見出しの階層をメニューに表現する。
   *
   * @param {string} title
   * @param {number} level
   * @returns {string}
   */
  function formatBookmarkTitle(title, level) {
    if (level <= 0) {
      return title;
    }

    return "　".repeat(level) + "↳ " + title;
  }

  /**
   * 要素を含むスクロールコンテナを取得する。
   * なければドキュメント全体を使用する。
   *
   * @param {HTMLElement} element
   * @returns {HTMLElement | null}
   */
  function getScrollContainer(element) {
    /** @type {HTMLElement | null} */
    let parent = element.parentElement;

    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);

      const scrollable = /^(auto|scroll|overlay)$/.test(style.overflowY);

      if (scrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }

      parent = parent.parentElement;
    }

    return null;
  }

  /**
   * 指定した行にスムーズスクロールする。
   * 固定ヘッダーの高さを考慮する。
   *
   * @param {HTMLElement} element
   * @param {number} fixedHeaderHeight
   * @returns {void}
   */
  function scrollToBookmark(element, fixedHeaderHeight) {
    const container = getScrollContainer(element);

    const elementRect = element.getBoundingClientRect();

    if (container) {
      const containerRect = container.getBoundingClientRect();

      const targetTop =
        container.scrollTop + elementRect.top - containerRect.top - fixedHeaderHeight;

      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });

      return;
    }

    const targetTop = window.scrollY + elementRect.top - fixedHeaderHeight;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }

  /**
   * 固定ヘッダーの高さを取得する。
   *
   * @returns {number}
   */
  function getFixedHeaderHeight() {
    const navbar = document.querySelector(".navbar");

    const pageMenu = document.querySelector(".navbar-pagemenu");

    /** @type {number} */
    let navbarHeight = 0;

    if (navbar instanceof HTMLElement) {
      const position = window.getComputedStyle(navbar).position;

      if (position === "fixed") {
        navbarHeight = navbar.getBoundingClientRect().height;
      }
    }

    /** @type {number} */
    const pageMenuHeight =
      pageMenu instanceof HTMLElement ? pageMenu.getBoundingClientRect().height : 0;

    return navbarHeight + pageMenuHeight;
  }

  /**
   * ページの行情報からBookmarksを作成する。
   *
   * @returns {void}
   */
  function rebuildBookmarks() {
    const menu = api.PageMenu(MENU_TITLE);

    menu.removeAllItems();

    const fixedHeaderHeight = getFixedHeaderHeight();

    /** @type {number[]} */
    let indentStack = [];

    /** @type {boolean} */
    let hasSectionTitle = false;

    /** @type {CosenseLine[]} */
    const pageLines = api.Page?.lines ?? [];

    for (const line of pageLines) {
      const element = document.getElementById("L" + line.id);

      if (!(element instanceof HTMLElement)) {
        continue;
      }

      /* =============================================
         [. タイトル] の見出し
         ============================================= */

      const heading = element.querySelector(HEADING_SELECTOR);

      if (heading) {
        const headingTitle = (heading.textContent ?? "").trim();

        if (headingTitle !== "") {
          menu.addItem({
            title: headingTitle,
            onClick: () => {
              scrollToBookmark(element, fixedHeaderHeight);
            },
          });
        }

        // セクションが変わったので階層をリセット
        indentStack = [];
        hasSectionTitle = true;

        continue;
      }

      /* =============================================
         数字見出し
         ============================================= */

      const rawText = typeof line.text === "string" ? line.text : getRenderedLineText(element);

      const match = rawText.match(NUMBER_HEADING_PATTERN);

      if (!match) {
        continue;
      }

      /** @type {string} */
      const indentText = match[1];

      /** @type {number} */
      const indentWidth = getIndentWidth(indentText);

      /** @type {number} */
      const numberLevel = getHierarchyLevel(indentWidth, indentStack);

      /** @type {number} */
      const displayLevel = numberLevel + (hasSectionTitle ? 1 : 0);

      /** @type {string} */
      const renderedText = getRenderedLineText(element);

      /** @type {string} */
      const menuTitle = formatBookmarkTitle(renderedText, displayLevel);

      menu.addItem({
        title: menuTitle,
        onClick: () => {
          scrollToBookmark(element, fixedHeaderHeight);
        },
      });
    }
  }

  /* ===============================================
     Bookmarksメニューの登録
     =============================================== */

  api.PageMenu.addMenu({
    title: MENU_TITLE,
    image: ICON_URL,
    onClick: rebuildBookmarks,
  });

  console.info("[Bookmarks] loaded (vanilla JavaScript)");
})();
