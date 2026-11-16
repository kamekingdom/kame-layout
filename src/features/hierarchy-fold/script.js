// Author: kamekingdom (2026-09-29)

(() => {
  /* =========================================================
     Types
     ========================================================= */

  /**
   * @typedef {'collapsed'|'expanded'} FoldState
   */

  /**
   * @typedef {{
   *   id?: string,
   *   text?: string
   * }} CosenseLine
   */

  /**
   * @typedef {{
   *   state: FoldState
   * }} FoldMarker
   */

  /**
   * @typedef {{
   *   element: HTMLElement,
   *   indent: number,
   *   blank: boolean,
   *   marker: FoldMarker | null,
   *   hasChildren: boolean
   * }} FoldLineInfo
   */

  /**
   * @typedef {{
   *   indent: number
   * }} ActiveFold
   */

  /**
   * @typedef {
   *   Window
   *   & typeof globalThis
   *   & {
   *     __kameHierarchyFoldController?: AbortController
   *   }
   * } KameWindow
   */

  /* =========================================================
     Initialization
     ========================================================= */

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

  /* =========================================================
     Cleanup
     ========================================================= */

  document.querySelectorAll(".kame-fold-toggle").forEach((element) => {
    element.remove();
  });

  document.querySelectorAll(".kame-fold-hidden, .kame-fold-parent-collapsed").forEach((element) => {
    element.classList.remove("kame-fold-hidden", "kame-fold-parent-collapsed");
  });

  /* =========================================================
     State
     ========================================================= */

  /** @type {number | null} */
  let refreshFrame = null;

  /** @type {MutationObserver | null} */
  let observer = null;

  /* =========================================================
     DOM Fold Marker
     ========================================================= */

  /**
   * Cosenseが生成したDOMから
   * > / < の装飾を探す。
   *
   * 対応例:
   *
   * [> メール]
   * [>. メール]
   * [.> メール]
   * [.*> メール]
   *
   * [< メール]
   * [<. メール]
   * [.< メール]
   * [.*< メール]
   *
   * @param {HTMLElement} line
   * @returns {FoldMarker | null}
   */
  function getFoldMarkerFromDom(line) {
    /** @type {NodeListOf<HTMLElement>} */
    const elements = line.querySelectorAll("[class]");

    for (const element of elements) {
      /*
       * >
       *
       * collapsed
       */
      if (element.classList.contains("deco->")) {
        return {
          state: "collapsed",
        };
      }

      /*
       * <
       *
       * expanded
       */
      if (element.classList.contains("deco-<")) {
        return {
          state: "expanded",
        };
      }
    }

    return null;
  }

  /* =========================================================
     Raw Fold Marker
     ========================================================= */

  /**
   * 生テキストの文字装飾部分から
   * > / < を切り替える。
   *
   * 装飾順序には依存しない。
   *
   * 例:
   *
   * [> メール]
   *   ↓
   * [< メール]
   *
   * [>. メール]
   *   ↓
   * [<. メール]
   *
   * [.> メール]
   *   ↓
   * [.< メール]
   *
   * [.*> メール]
   *   ↓
   * [.*< メール]
   *
   * @param {string} text
   * @returns {string | null}
   */
  function toggleFoldMarkerText(text) {
    /*
     * 行頭indent + [文字装飾
     *
     * を取得。
     *
     * 例:
     *
     *     [.> メール]
     *
     * indent      = "    "
     * decorations = ".>"
     */
    const match = text.match(/^([\t \u3000]*)\[([^\]\t \u3000]+)(?=[\t \u3000])/u);

    if (!match) {
      return null;
    }

    /** @type {string} */
    const indent = match[1];

    /** @type {string} */
    const decorations = match[2];

    /* =======================================================
       > → <
       ======================================================= */

    if (decorations.includes(">")) {
      /** @type {string} */
      const updatedDecorations = decorations.replace(">", "<");

      return text.replace(
        /^([\t \u3000]*)\[([^\]\t \u3000]+)(?=[\t \u3000])/u,

        () => `${indent}[${updatedDecorations}`,
      );
    }

    /* =======================================================
       < → >
       ======================================================= */

    if (decorations.includes("<")) {
      /** @type {string} */
      const updatedDecorations = decorations.replace("<", ">");

      return text.replace(
        /^([\t \u3000]*)\[([^\]\t \u3000]+)(?=[\t \u3000])/u,

        () => `${indent}[${updatedDecorations}`,
      );
    }

    return null;
  }

  /* =========================================================
     Blank Line
     ========================================================= */

  /**
   * 空行か判定。
   *
   * @param {HTMLElement} line
   * @returns {boolean}
   */
  function isBlankLine(line) {
    /** @type {HTMLElement | null} */
    const text = /** @type {HTMLElement | null} */ (line.querySelector(".text"));

    if (!text) {
      return true;
    }

    /** @type {string} */
    const content = (text.textContent || "").replace(/\u200B/g, "").trim();

    return content === "";
  }

  /* =========================================================
     Indent
     ========================================================= */

  /**
   * DOMからindent階層を取得。
   *
   * @param {HTMLElement} line
   * @returns {number}
   */
  function getIndentLevel(line) {
    /** @type {NodeListOf<HTMLElement>} */
    const pads = line.querySelectorAll(".indent-mark .pad");

    /*
     * 通常はこちら。
     */
    if (pads.length > 0) {
      return pads.length;
    }

    /*
     * fallback。
     */
    /** @type {HTMLElement | null} */
    const indentMark = /** @type {HTMLElement | null} */ (line.querySelector(".indent-mark"));

    if (!indentMark) {
      return 0;
    }

    /** @type {string} */
    const width = indentMark.style.width;

    const match = width.match(/^([\d.]+)em$/);

    if (!match) {
      return 0;
    }

    /*
     * Cosenseでは通常
     * 1階層 ≒ 1.5em。
     */
    return Math.round(Number(match[1]) / 1.5);
  }

  /* =========================================================
     Collect Lines
     ========================================================= */

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

    /* =======================================================
       Child Detection
       ======================================================= */

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

  /* =========================================================
     Page Lines
     ========================================================= */

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

    /* =======================================================
       ID Match
       ======================================================= */

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

    /* =======================================================
       Fallback
       ======================================================= */

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

  /* =========================================================
     Update Fold
     ========================================================= */

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

  /* =========================================================
     Toggle Button
     ========================================================= */

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

    /* =======================================================
       Create
       ======================================================= */

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

    /* =======================================================
       Appearance
       ======================================================= */

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

  /* =========================================================
     Visibility
     ========================================================= */

  /**
   * Fold状態を反映。
   *
   * Fold範囲:
   *
   * ・親より深いindentが続く間
   * ・空行まで
   *
   * 空行自体は絶対に隠さない。
   *
   * @param {FoldLineInfo[]} infos
   * @returns {void}
   */
  function applyVisibility(infos) {
    /** @type {ActiveFold[]} */
    const activeFolds = [];

    for (const info of infos) {
      const { element, indent, blank, marker, hasChildren } = info;

      /* =====================================================
         Blank
         ===================================================== */

      if (blank) {
        /*
         * 空行は表示。
         */
        element.classList.remove("kame-fold-hidden");

        /*
         * 空行でFold blockを終了。
         */
        activeFolds.length = 0;

        continue;
      }

      /* =====================================================
         End Fold
         ===================================================== */

      /*
       * 同じ階層または
       * 浅い階層へ戻ったらFold終了。
       */
      while (activeFolds.length > 0) {
        const latest = activeFolds[activeFolds.length - 1];

        if (indent > latest.indent) {
          break;
        }

        activeFolds.pop();
      }

      /* =====================================================
         Hidden
         ===================================================== */

      /** @type {boolean} */
      const hidden = activeFolds.length > 0;

      element.classList.toggle("kame-fold-hidden", hidden);

      /*
       * 親に隠れている場合は
       * 子のFoldを開始しない。
       */
      if (hidden) {
        continue;
      }

      /* =====================================================
         Start Fold
         ===================================================== */

      if (marker?.state === "collapsed" && hasChildren) {
        activeFolds.push({
          indent,
        });
      }
    }
  }

  /* =========================================================
     Refresh
     ========================================================= */

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

  /* =========================================================
     Mutation Helper
     ========================================================= */

  /**
   * Toggle自身によるDOM変更か。
   *
   * @param {MutationRecord} mutation
   * @returns {boolean}
   */
  function isOwnToggleMutation(mutation) {
    const target = mutation.target;

    /*
     * Toggle内部。
     */
    if (target instanceof Element && target.closest(".kame-fold-toggle")) {
      return true;
    }

    if (target.parentElement?.closest(".kame-fold-toggle")) {
      return true;
    }

    /*
     * Toggleそのものの追加・削除。
     */
    const nodes = [...mutation.addedNodes, ...mutation.removedNodes];

    if (nodes.length === 0) {
      return false;
    }

    return nodes.every((node) => {
      return node instanceof HTMLElement && node.classList.contains("kame-fold-toggle");
    });
  }

  /* =========================================================
     Mutation Observer
     ========================================================= */

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

  /* =========================================================
     Editor Input
     ========================================================= */

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

  /* =========================================================
     Navigation
     ========================================================= */

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

  /* =========================================================
     Cleanup
     ========================================================= */

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

  /* =========================================================
     Initial
     ========================================================= */

  refresh();

  /*
   * Cosenseの初期描画タイミング対策。
   */
  window.requestAnimationFrame(refresh);

  window.setTimeout(refresh, 300);

  console.log("[Hierarchy Fold] loaded");
})();
