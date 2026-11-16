import { injectStyle } from "./styles.js";
import { DEFAULT_CARD_COUNT } from "./config.js";
import {
  getNormalColumnCount,
  syncCardMetrics,
  findNormalGrid,
  findNormalCardElement,
  getNormalCardMetrics,
  findPageList,
} from "./layout.js";
import { removeAllRandomPageRoots, createCardRoot } from "./cards.js";
import { isProjectHome, getProjectName, fetchRandomPages } from "./api.js";

// # Author: kamekingdom (2026-05-01)

/**
 * Scrapbox / Cosense project home にランダムページカードを表示するUserScript
 * - ホーム画面にランダムページカードを表示
 * - 通常カード li.page-list-item.grid-style-item のサイズを取得
 * - 通常カードの1行あたりの枚数に合わせてランダムカード数を変更
 * - 画面サイズ変更時にカード数・サイズ・間隔を再計算
 * - renderの競合による二重表示を防止
 */

(() => {
  if (window.__randomPageCardsScriptLoaded === true) {
    return;
  }

  window.__randomPageCardsScriptLoaded = true;

  /** @type {number} */
  let renderVersion = 0;

  /** @type {ResizeObserver | null} */
  let resizeObserver = null;

  /** @type {number | null} */
  let resizeTimerId = null;

  /** @type {number} */
  let lastColumnCount = DEFAULT_CARD_COUNT;

  /**
   * @returns {void}
   */
  const scheduleRenderOnResize = () => {
    if (resizeTimerId !== null) {
      window.clearTimeout(resizeTimerId);
    }

    resizeTimerId = window.setTimeout(() => {
      resizeTimerId = null;

      const currentColumnCount = getNormalColumnCount();

      if (currentColumnCount !== lastColumnCount) {
        render();
        return;
      }

      syncCardMetrics();
    }, 160);
  };

  /**
   * @returns {void}
   */
  const observeNormalCardResize = () => {
    if (resizeObserver !== null) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    const grid = findNormalGrid();

    if (grid === null) {
      return;
    }

    resizeObserver = new ResizeObserver(() => {
      scheduleRenderOnResize();
    });

    resizeObserver.observe(grid);

    const normalCard = findNormalCardElement();

    if (normalCard !== null) {
      resizeObserver.observe(normalCard);
    }

    window.removeEventListener("resize", scheduleRenderOnResize);
    window.addEventListener("resize", scheduleRenderOnResize);
  };

  /**
   * @returns {Promise<void>}
   */
  async function render() {
    const currentRenderVersion = ++renderVersion;

    removeAllRandomPageRoots();

    if (!isProjectHome()) {
      return;
    }

    const projectName = getProjectName();

    if (projectName === null) {
      return;
    }

    injectStyle();

    const metrics = getNormalCardMetrics();
    const cardCount = metrics.columnCount || DEFAULT_CARD_COUNT;
    lastColumnCount = cardCount;

    const pages = await fetchRandomPages(projectName, cardCount);

    if (currentRenderVersion !== renderVersion) {
      return;
    }

    removeAllRandomPageRoots();

    const root = createCardRoot(pages);
    const pageList = findPageList();

    if (pageList?.parentElement) {
      pageList.parentElement.insertBefore(root, pageList);
    } else {
      document.body.prepend(root);
    }

    root.style.setProperty("--rpc-card-width", `${metrics.width}px`);
    root.style.setProperty("--rpc-card-height", `${metrics.height}px`);
    root.style.setProperty("--rpc-card-gap", `${metrics.gap}px`);
    root.style.setProperty("--rpc-card-columns", `${cardCount}`);

    observeNormalCardResize();

    root.querySelector(".random-page-cards-refresh")?.addEventListener("click", () => {
      render();
    });
  }

  /**
   * @returns {void}
   */
  const observeUrlChange = () => {
    /** @type {string} */
    let currentPath = location.pathname;

    const observer = new MutationObserver(() => {
      if (location.pathname === currentPath) {
        return;
      }

      currentPath = location.pathname;
      render();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("popstate", render);
  };

  render();
  observeUrlChange();
})();
