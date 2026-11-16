// # Author: kamekingdom (2026-05-01)

/**
 * Scrapbox / Cosense project home にランダムページカードを表示するUserScript
 * - ホーム画面にランダムページカードを表示
 * - 通常カード li.page-list-item.grid-style-item のサイズを取得
 * - 通常カードの1行あたりの枚数に合わせてランダムカード数を変更
 * - 画面サイズ変更時にカード数・サイズ・間隔を再計算
 * - renderの競合による二重表示を防止
 */

/**
 * @typedef {Object} ScrapboxPage
 * @property {string} title
 * @property {string[]=} [descriptions]
 * @property {number=} updated
 * @property {number=} views
 */

/**
 * @typedef {Object} PagesApiResponse
 * @property {number} count
 * @property {ScrapboxPage[]} pages
 */

/**
 * @typedef {Object} CardMetrics
 * @property {number} width
 * @property {number} height
 * @property {number} gap
 * @property {number} columnCount
 */

(() => {
  if (window.__randomPageCardsScriptLoaded === true) {
    return;
  }

  window.__randomPageCardsScriptLoaded = true;

  /** @type {string} */
  const ROOT_ID = "random-page-cards";

  /** @type {string} */
  const STYLE_ID = `${ROOT_ID}-style`;

  /** @type {number} */
  const DEFAULT_CARD_COUNT = 7;

  /** @type {number} */
  let renderVersion = 0;

  /** @type {ResizeObserver | null} */
  let resizeObserver = null;

  /** @type {number | null} */
  let resizeTimerId = null;

  /** @type {number} */
  let lastColumnCount = DEFAULT_CARD_COUNT;

  /**
   * @returns {string | null}
   */
  const getProjectName = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.length >= 1 ? decodeURIComponent(parts[0]) : null;
  };

  /**
   * @returns {boolean}
   */
  const isProjectHome = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.length === 1;
  };

  /**
   * @param {string} text
   * @returns {string}
   */
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  /**
   * @param {number} max
   * @param {number} count
   * @returns {number[]}
   */
  const getUniqueRandomIndexes = (max, count) => {
    /** @type {Set<number>} */
    const result = new Set();
    const actualCount = Math.min(max, count);

    while (result.size < actualCount) {
      result.add(Math.floor(Math.random() * max));
    }

    return Array.from(result);
  };

  /**
   * @param {string} projectName
   * @param {number} skip
   * @returns {Promise<ScrapboxPage | null>}
   */
  const fetchPageAt = async (projectName, skip) => {
    const url = `/api/pages/${encodeURIComponent(projectName)}?limit=1&skip=${skip}&sort=updated`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn("[Random Pages] Failed to fetch page:", response.status);
      return null;
    }

    /** @type {PagesApiResponse} */
    const data = await response.json();

    return data.pages?.[0] ?? null;
  };

  /**
   * @param {string} projectName
   * @param {number} count
   * @returns {Promise<ScrapboxPage[]>}
   */
  const fetchRandomPages = async (projectName, count) => {
    const firstUrl = `/api/pages/${encodeURIComponent(projectName)}?limit=1&sort=updated`;

    const response = await fetch(firstUrl);

    if (!response.ok) {
      console.warn("[Random Pages] Failed to fetch page count:", response.status);
      return [];
    }

    /** @type {PagesApiResponse} */
    const firstData = await response.json();

    const totalCount = firstData.count ?? 0;

    if (totalCount === 0) {
      return [];
    }

    const skips = getUniqueRandomIndexes(totalCount, count);

    const pages = await Promise.all(skips.map((skip) => fetchPageAt(projectName, skip)));

    return pages.filter((page) => page !== null);
  };

  /**
   * @param {string} title
   * @returns {string}
   */
  const toPageUrl = (title) => {
    const projectName = getProjectName();

    if (projectName === null) {
      return "#";
    }

    return `/${encodeURIComponent(projectName)}/${encodeURIComponent(title)}`;
  };

  /**
   * @returns {HTMLElement | null}
   */
  const findPageList = () => {
    const pageList = document.querySelector(".page-list");
    return pageList instanceof HTMLElement ? pageList : null;
  };

  /**
   * @returns {HTMLElement | null}
   */
  const findNormalGrid = () => {
    const pageList = findPageList();

    if (pageList === null) {
      return null;
    }

    const grid = pageList.querySelector("ul.grid");
    return grid instanceof HTMLElement ? grid : null;
  };

  /**
   * @returns {{ element: HTMLElement, rect: DOMRect }[]}
   */
  const getNormalCardCandidates = () => {
    const grid = findNormalGrid();

    if (grid === null) {
      return [];
    }

    return Array.from(grid.querySelectorAll("li.page-list-item.grid-style-item"))
      .filter((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        if (element.closest(`#${ROOT_ID}`)) {
          return false;
        }

        const rect = element.getBoundingClientRect();

        return rect.width >= 80 && rect.height >= 80;
      })
      .map((element) => ({
        element,
        rect: element.getBoundingClientRect(),
      }))
      .sort((a, b) => {
        if (Math.abs(a.rect.top - b.rect.top) > 4) {
          return a.rect.top - b.rect.top;
        }

        return a.rect.left - b.rect.left;
      });
  };

  /**
   * @returns {HTMLElement | null}
   */
  const findNormalCardElement = () => {
    const candidates = getNormalCardCandidates();
    return candidates[0]?.element ?? null;
  };

  /**
   * @returns {number}
   */
  const getNormalColumnCount = () => {
    const cards = getNormalCardCandidates();
    const firstCard = cards[0];

    if (firstCard === undefined) {
      return DEFAULT_CARD_COUNT;
    }

    const sameRowCards = cards.filter(({ rect }) => {
      return Math.abs(rect.top - firstCard.rect.top) <= 4;
    });

    return Math.max(1, sameRowCards.length);
  };

  /**
   * @returns {CardMetrics}
   */
  const getNormalCardMetrics = () => {
    const cards = getNormalCardCandidates();
    const firstCard = cards[0];

    if (firstCard === undefined) {
      return {
        width: 153.42,
        height: 168.96,
        gap: 14,
        columnCount: DEFAULT_CARD_COUNT,
      };
    }

    const sameRowCards = cards.filter(({ rect }) => {
      return Math.abs(rect.top - firstCard.rect.top) <= 4;
    });

    const secondCard = sameRowCards[1];

    const measuredGap = secondCard === undefined ? 14 : secondCard.rect.left - firstCard.rect.right;

    return {
      width: Math.round(firstCard.rect.width * 100) / 100,
      height: Math.round(firstCard.rect.height * 100) / 100,
      gap: Math.max(4, Math.round(measuredGap * 100) / 100),
      columnCount: Math.max(1, sameRowCards.length),
    };
  };

  /**
   * @returns {void}
   */
  const syncCardMetrics = () => {
    const root = document.getElementById(ROOT_ID);

    if (root === null) {
      return;
    }

    const metrics = getNormalCardMetrics();

    root.style.setProperty("--rpc-card-width", `${metrics.width}px`);
    root.style.setProperty("--rpc-card-height", `${metrics.height}px`);
    root.style.setProperty("--rpc-card-gap", `${metrics.gap}px`);
    root.style.setProperty("--rpc-card-columns", `${metrics.columnCount}`);
  };

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
   * @returns {void}
   */
  const injectStyle = () => {
    const oldStyle = document.getElementById(STYLE_ID);
    oldStyle?.remove();

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #${ROOT_ID} {
        --rpc-card-width: 153.42px;
        --rpc-card-height: 168.96px;
        --rpc-card-gap: 14px;
        --rpc-card-columns: 7;

        width: 100% !important;
        max-width: none !important;
        margin: 18px 0 28px 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }

      #${ROOT_ID} .random-page-cards-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin: 0 0 14px 0 !important;
        padding: 0 !important;
        font-weight: 500 !important;
        font-size: 18px !important;
        color: #4a4a4a !important;
        box-sizing: border-box !important;
      }

      #${ROOT_ID} .random-page-cards-refresh {
        all: unset;
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        min-height: 36px !important;
        max-width: 36px !important;
        max-height: 36px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 999px !important;
        background: rgba(0, 0, 0, 0.055) !important;
        color: #5f6368 !important;
        cursor: pointer !important;
        transition:
          background 0.15s ease,
          transform 0.15s ease,
          box-shadow 0.15s ease !important;
        flex: 0 0 auto !important;
      }

      #${ROOT_ID} .random-page-cards-refresh:hover {
        background: rgba(0, 0, 0, 0.09) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08) !important;
      }

      #${ROOT_ID} .random-page-cards-refresh:active {
        transform: translateY(0) scale(0.96) !important;
        box-shadow: none !important;
      }

      #${ROOT_ID} .random-page-cards-refresh svg {
        width: 16px !important;
        height: 16px !important;
        display: block !important;
        stroke: currentColor !important;
      }

      #${ROOT_ID} .random-page-cards-grid {
        display: grid !important;
        grid-template-columns: repeat(var(--rpc-card-columns), minmax(0, 1fr)) !important;
        column-gap: var(--rpc-card-gap) !important;
        row-gap: var(--rpc-card-gap) !important;
        align-items: flex-start !important;
        overflow: visible !important;
        padding: 0 0 4px 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
      }

      #${ROOT_ID} .random-page-card {
        all: unset;
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
        height: var(--rpc-card-height) !important;
        min-height: var(--rpc-card-height) !important;
        max-height: var(--rpc-card-height) !important;
        padding: 18px !important;
        border-radius: 4px !important;
        background: linear-gradient(135deg, #fffdf7 0%, #f2f7ff 100%) !important;
        border: 1px solid rgba(120, 140, 180, 0.16) !important;
        color: inherit !important;
        text-decoration: none !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        cursor: pointer !important;
      }

      #${ROOT_ID} .random-page-card:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08) !important;
      }

      #${ROOT_ID} .random-page-card-title {
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
        margin: 0 0 10px 0 !important;
        padding: 0 !important;
        font-weight: 700 !important;
        font-size: clamp(11px, calc(var(--rpc-card-width) * 0.078), 14px) !important;
        line-height: 1.45 !important;
        color: #333 !important;
        word-break: break-word !important;
      }

      #${ROOT_ID} .random-page-card-description {
        display: -webkit-box !important;
        -webkit-line-clamp: 5 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        font-weight: 400 !important;
        font-size: clamp(10px, calc(var(--rpc-card-width) * 0.07), 12px) !important;
        line-height: 1.55 !important;
        color: #666 !important;
        opacity: 0.85 !important;
        word-break: break-word !important;
      }

      @media (max-width: 900px) {
        #${ROOT_ID} .random-page-cards-header {
          font-size: 18px !important;
          margin-bottom: 14px !important;
        }

        #${ROOT_ID} .random-page-card {
          padding: 16px !important;
        }
      }
    `;

    document.head.appendChild(style);
  };

  /**
   * @param {ScrapboxPage[]} pages
   * @returns {HTMLElement}
   */
  const createCardRoot = (pages) => {
    const root = document.createElement("section");
    root.id = ROOT_ID;

    const cardHtml = pages
      .map((page) => {
        const rawDescription = (page.descriptions ?? []).join(" ").slice(0, 90);

        const title = escapeHtml(page.title);
        const description = escapeHtml(rawDescription || "No description");
        const url = toPageUrl(page.title);

        return `
          <a class="random-page-card" href="${url}">
            <div class="random-page-card-title">${title}</div>
            <div class="random-page-card-description">${description}</div>
          </a>
        `;
      })
      .join("");

    root.innerHTML = `
      <div class="random-page-cards-header">
        <span>Random Pages</span>
        <button
          type="button"
          class="random-page-cards-refresh"
          aria-label="Refresh random pages"
          title="Refresh random pages"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 6v5h-5"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M19 13a7 7 0 1 1-2.05-4.95L20 11"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
      <div class="random-page-cards-grid">
        ${cardHtml}
      </div>
    `;

    return root;
  };

  /**
   * @returns {void}
   */
  const removeAllRandomPageRoots = () => {
    document.querySelectorAll(`#${ROOT_ID}`).forEach((element) => {
      element.remove();
    });
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
