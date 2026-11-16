// # Author: kamekingdom (2026-05-01)

/**
 * Scrapbox / Cosense project home にランダムページカードを表示するUserScript
 * - ホーム画面にランダムページを7件表示
 * - 通常カードに近い 153.42px × 168.96px サイズに調整
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

(() => {
  if (window.__randomPageCardsScriptLoaded === true) {
    return;
  }

  window.__randomPageCardsScriptLoaded = true;

  /** @type {number} */
  const CARD_COUNT = 7;

  /** @type {string} */
  const ROOT_ID = "random-page-cards";

  /** @type {string} */
  const STYLE_ID = `${ROOT_ID}-style`;

  /** @type {number} */
  let renderVersion = 0;

  /**
   * 現在のURLからプロジェクト名を取得する
   *
   * @returns {string | null}
   */
  const getProjectName = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.length >= 1 ? decodeURIComponent(parts[0]) : null;
  };

  /**
   * プロジェクトトップページかどうかを判定する
   *
   * @returns {boolean}
   */
  const isProjectHome = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.length === 1;
  };

  /**
   * HTML文字列として安全に表示するためにエスケープする
   *
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
   * 0以上max未満のランダムな整数を重複なしでcount個生成する
   *
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
   * 指定したskip位置のページを1件取得する
   *
   * @param {string} projectName
   * @param {number} skip
   * @returns {Promise<ScrapboxPage | null>}
   */
  const fetchPageAt = async (projectName, skip) => {
    const url = `/api/pages/${encodeURIComponent(
      projectName
    )}?limit=1&skip=${skip}&sort=updated`;

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
   * ランダムにページを取得する
   *
   * @param {string} projectName
   * @returns {Promise<ScrapboxPage[]>}
   */
  const fetchRandomPages = async (projectName) => {
    const firstUrl = `/api/pages/${encodeURIComponent(
      projectName
    )}?limit=1&sort=updated`;

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

    const skips = getUniqueRandomIndexes(totalCount, CARD_COUNT);

    const pages = await Promise.all(
      skips.map((skip) => fetchPageAt(projectName, skip))
    );

    return pages.filter((page) => page !== null);
  };

  /**
   * ページタイトルからScrapbox内リンクを生成する
   *
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
   * CSSを注入する
   *
   * @returns {void}
   */
  const injectStyle = () => {
    const oldStyle = document.getElementById(STYLE_ID);
    oldStyle?.remove();

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #${ROOT_ID} {
        width: 100% !important;
        max-width: none !important;
        margin: 18px 0 28px 0 !important;
        padding: 0 0 0 0 !important;
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
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        gap: 16px !important;
        align-items: flex-start !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        padding: 0 0 4px 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
      }

      #${ROOT_ID} .random-page-card {
        all: unset;
        display: block !important;
        flex: 0 0 153.42px !important;
        width: 153.42px !important;
        min-width: 153.42px !important;
        max-width: 153.42px !important;
        height: 168.96px !important;
        min-height: 168.96px !important;
        max-height: 168.96px !important;
        padding: 18px 18px !important;
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
        font-size: 12px !important;
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
        font-size: 11px !important;
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
          flex-basis: 153.42px !important;
          width: 153.42px !important;
          min-width: 153.42px !important;
          max-width: 153.42px !important;
          height: 168.96px !important;
          min-height: 168.96px !important;
          max-height: 168.96px !important;
        }
      }
    `;

    document.head.appendChild(style);
  };

  /**
   * カード一覧DOMを生成する
   *
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
   * 既存のRandom Pagesをすべて削除する
   *
   * @returns {void}
   */
  const removeAllRandomPageRoots = () => {
    document.querySelectorAll(`#${ROOT_ID}`).forEach((element) => {
      element.remove();
    });
  };

  /**
   * Scrapboxの通常カード一覧を探す
   *
   * @returns {Element | null}
   */
  const findPageList = () => {
    return (
      document.querySelector(".page-list") ??
      document.querySelector(".stream") ??
      document.querySelector(".grid")
    );
  };

  /**
   * Random Pagesを描画する
   *
   * @returns {Promise<void>}
   */
  const render = async () => {
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

    const pages = await fetchRandomPages(projectName);

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

    root
      .querySelector(".random-page-cards-refresh")
      ?.addEventListener("click", () => {
        render();
      });
  };

  /**
   * URL変化を監視する
   *
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