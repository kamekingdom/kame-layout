/** @typedef {import("./types.js").CosenseLine} CosenseLine */
/** @typedef {import("./types.js").FoldLineInfo} FoldLineInfo */
/** @typedef {import("./types.js").KameWindow} KameWindow */

import {
  getIndentLevel,
  isBlankLine,
  getFoldMarkerFromDom,
  toggleFoldMarkerText,
} from "./markers.js";
import { applyVisibility, isOwnToggleMutation } from "./visibility.js";

// Author: kamekingdom (2026-09-29)

(() => {
  // Initialization

  /** @type {KameWindow} */
  const kameWindow = /** @type {KameWindow} */ (window);

  /*
   * 再実行時に旧バージョンを停止。
   */
  if (kameWindow.__kameHierarchyFoldController) {
    kameWindow.__kameHierarchyFoldController.abort();
  }

  /** @type {AbortController} */
  const controller = new AbortController();

  /** @type {AbortSignal} */
  const signal = controller.signal;

  kameWindow.__kameHierarchyFoldController = controller;

  // Cleanup

  document.querySelectorAll(".kame-fold-toggle").forEach((element) => {
    element.remove();
  });

  document.querySelectorAll(".kame-fold-hidden, .kame-fold-parent-collapsed").forEach((element) => {
    element.classList.remove("kame-fold-hidden", "kame-fold-parent-collapsed");
  });

  // State

  /** @type {number | null} */
  let refreshFrame = null;

  /** @type {MutationObserver | null} */
  let observer = null;

  // Collect Lines

  /**
   * 現在表示されている全行を取得。
   *
   * @returns {FoldLineInfo[]}
   */
  function collectLines() {
    /** @type {HTMLElement[]} */
    const lines = Array.from(document.querySelectorAll(".lines > .line"));

    /** @type {FoldLineInfo[]} */
    const infos = lines.map((element) => {
      return {
        element,

        indent: getIndentLevel(element),

        blank: isBlankLine(element),

        marker: getFoldMarkerFromDom(element),

        hasChildren: false,
      };
    });

    // Child Detection

    /*
     * 「連続している階層」のみを
     * 子として認識する。
     *
     * 空行があればそこで終了。
     */
    for (let index = 0; index < infos.length; index++) {
      const current = infos[index];

      /*
       * 空行は親にならない。
       */
      if (current.blank) {
        continue;
      }

      /*
       * 直後の行を見る。
       */
      const next = infos[index + 1];

      if (!next) {
        continue;
      }

      /*
       * 直後が空行なら
       * 子階層なし。
       */
      if (next.blank) {
        continue;
      }

      /*
       * 次行のindentが深ければ
       * 子階層あり。
       */
      current.hasChildren = next.indent > current.indent;
    }

    return infos;
  }

  // Page Lines

  /**
   * @returns {CosenseLine[]}
   */
  function getPageLines() {
    if (!Array.isArray(scrapbox.Page.lines)) {
      return [];
    }

    return /** @type {CosenseLine[]} */ (scrapbox.Page.lines);
  }

  /**
   * DOM lineと
   * scrapbox.Page.linesを対応させる。
   *
   * @param {HTMLElement} element
   * @returns {number}
   */
  function findPageLineIndex(element) {
    /** @type {CosenseLine[]} */
    const pageLines = getPageLines();

    if (pageLines.length === 0) {
      return -1;
    }

    /** @type {string} */
    const domId = element.id || "";

    /** @type {string} */
    const normalizedDomId = domId.startsWith("L") ? domId.slice(1) : domId;

    // ID Match

    /** @type {number} */
    const idIndex = pageLines.findIndex((pageLine) => {
      if (!pageLine.id) {
        return false;
      }

      return (
        pageLine.id === domId || pageLine.id === normalizedDomId || `L${pageLine.id}` === domId
      );
    });

    if (idIndex >= 0) {
      return idIndex;
    }

    // Fallback

    /*
     * ID一致しない場合のみ
     * DOM indexにfallback。
     */
    /** @type {HTMLElement[]} */
    const domLines = Array.from(document.querySelectorAll(".lines > .line"));

    /** @type {number} */
    const domIndex = domLines.indexOf(element);

    if (domIndex >= 0 && domIndex < pageLines.length) {
      return domIndex;
    }

    return -1;
  }

  // Update Fold

  /**
   * 実際のCosense本文を書き換える。
   *
   * @param {HTMLElement} element
   * @returns {Promise<void>}
   */
  async function toggleFold(element) {
    /** @type {number} */
    const pageIndex = findPageLineIndex(element);

    if (pageIndex < 0) {
      console.warn("[Hierarchy Fold] page line not found");

      return;
    }

    /** @type {CosenseLine[]} */
    const pageLines = getPageLines();

    const pageLine = pageLines[pageIndex];

    if (!pageLine) {
      return;
    }

    /** @type {string} */
    const raw = pageLine.text || "";

    /** @type {string | null} */
    const updated = toggleFoldMarkerText(raw);

    if (updated === null || updated === raw) {
      console.warn("[Hierarchy Fold] marker not found:", raw);

      return;
    }

    try {
      /*
       * 本文を書き換える。
       */
      scrapbox.Page.updateLine(updated, pageIndex);

      /*
       * DOM再描画前にもrefresh予約。
       */
      queueRefresh();

      try {
        /*
         * 保存完了を待つ。
         */
        await scrapbox.Page.waitForSave();
      } catch (error) {
        console.warn("[Hierarchy Fold] waitForSave failed", error);
      }

      /*
       * 保存後に再評価。
       */
      queueRefresh();
    } catch (error) {
      console.error("[Hierarchy Fold] update failed", error);
    }
  }

  // Toggle Button

  /**
   * ▶ / ▼ を配置。
   *
   * @param {FoldLineInfo} info
   * @returns {void}
   */
  function ensureToggle(info) {
    const { element, marker, blank, hasChildren } = info;

    /** @type {HTMLButtonElement | null} */
    let button = element.querySelector(":scope > .kame-fold-toggle");

    /*
     * Toggle表示条件。
     */
    if (blank || marker === null || !hasChildren) {
      button?.remove();

      element.classList.remove("kame-fold-parent-collapsed");

      return;
    }

    // Create

    if (!button) {
      button = document.createElement("button");

      button.type = "button";

      button.className = "kame-fold-toggle";

      button.tabIndex = -1;

      /*
       * Cosenseの編集カーソルを
       * 移動させない。
       */
      button.addEventListener(
        "mousedown",

        (event) => {
          event.preventDefault();

          event.stopPropagation();
        },

        {
          signal,
        },
      );

      /*
       * Fold切替。
       */
      button.addEventListener(
        "click",

        (event) => {
          event.preventDefault();

          event.stopPropagation();

          void toggleFold(element);
        },

        {
          signal,
        },
      );

      element.appendChild(button);
    }

    // Appearance

    /** @type {boolean} */
    const collapsed = marker.state === "collapsed";

    /*
     * >
     * ↓
     * ▶
     *
     * <
     * ↓
     * ▼
     */
    button.textContent = collapsed ? "▶" : "▼";

    button.title = collapsed ? "展開" : "折りたたむ";

    button.setAttribute("aria-expanded", collapsed ? "false" : "true");

    button.setAttribute("aria-label", collapsed ? "この階層を展開" : "この階層を折りたたむ");

    element.classList.toggle("kame-fold-parent-collapsed", collapsed);
  }

  // Refresh

  /**
   * @returns {void}
   */
  function refresh() {
    /** @type {FoldLineInfo[]} */
    const infos = collectLines();

    /*
     * 古いhiddenを解除。
     */
    document.querySelectorAll(".lines > .line.kame-fold-hidden").forEach((element) => {
      element.classList.remove("kame-fold-hidden");
    });

    /*
     * Fold適用。
     */
    applyVisibility(infos);

    /*
     * Toggle配置。
     */
    for (const info of infos) {
      ensureToggle(info);
    }
  }

  /**
   * 1frameにつき1回だけ更新。
   *
   * @returns {void}
   */
  function queueRefresh() {
    if (refreshFrame !== null) {
      return;
    }

    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = null;

      refresh();
    });
  }

  // Mutation Observer

  observer = new MutationObserver((mutations) => {
    /** @type {boolean} */
    const relevant = mutations.some((mutation) => {
      return !isOwnToggleMutation(mutation);
    });

    if (relevant) {
      queueRefresh();
    }
  });

  observer.observe(document.body, {
    childList: true,

    subtree: true,

    characterData: true,
  });

  // Editor Input

  /*
   * 手入力による変更にも追従。
   */
  document.addEventListener(
    "input",

    (event) => {
      const target = event.target;

      if (target instanceof HTMLTextAreaElement && target.id === "text-input") {
        queueRefresh();
      }
    },

    {
      signal,
      capture: true,
    },
  );

  // Navigation

  window.addEventListener(
    "popstate",

    queueRefresh,

    {
      signal,
    },
  );

  window.addEventListener(
    "hashchange",

    queueRefresh,

    {
      signal,
    },
  );

  // Cleanup

  signal.addEventListener(
    "abort",

    () => {
      observer?.disconnect();

      if (refreshFrame !== null) {
        window.cancelAnimationFrame(refreshFrame);

        refreshFrame = null;
      }

      document.querySelectorAll(".kame-fold-toggle").forEach((element) => {
        element.remove();
      });

      document
        .querySelectorAll(".kame-fold-hidden, .kame-fold-parent-collapsed")
        .forEach((element) => {
          element.classList.remove("kame-fold-hidden", "kame-fold-parent-collapsed");
        });
    },
  );

  // Initial

  refresh();

  /*
   * Cosenseの初期描画タイミング対策。
   */
  window.requestAnimationFrame(refresh);

  window.setTimeout(refresh, 300);

  console.log("[Hierarchy Fold] loaded");
})();
