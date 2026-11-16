/** @typedef {import("./types.js").CosenseLine} CosenseLine */
/** @typedef {import("./types.js").CosenseAPI} CosenseAPI */

import { getFixedHeaderHeight, scrollToBookmark } from "./scroll.js";
import {
  getRenderedLineText,
  getIndentWidth,
  getHierarchyLevel,
  formatBookmarkTitle,
} from "./headings.js";

// Author: kamekingdom (2026-11-13)

(() => {
  "use strict";

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

      // [. タイトル] の見出し

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

      // 数字見出し

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

  // Bookmarksメニューの登録

  api.PageMenu.addMenu({
    title: MENU_TITLE,
    image: ICON_URL,
    onClick: rebuildBookmarks,
  });

  console.info("[Bookmarks] loaded (vanilla JavaScript)");
})();
