// Author: kamekingdom (2026-10-28)

(() => {
  /* =========================================================
     Types
     ========================================================= */

  /**
   * @typedef {
   *   Window
   *   & typeof globalThis
   *   & {
   *     __kameEqualImageRowController?: AbortController
   *   }
   * } KameWindow
   */

  /* =========================================================
     Initialization
     ========================================================= */

  /** @type {KameWindow} */
  const kameWindow = /** @type {KameWindow} */ (window);

  /*
   * 以前のScriptが動作中なら停止。
   */
  if (kameWindow.__kameEqualImageRowController) {
    kameWindow.__kameEqualImageRowController.abort();
  }

  const controller = new AbortController();

  const signal = controller.signal;

  kameWindow.__kameEqualImageRowController = controller;

  /** @type {number | null} */
  let frameId = null;

  /* =========================================================
     Style Helper
     ========================================================= */

  /**
   * !important付きでinline styleを設定。
   *
   * @param {HTMLElement} element
   * @param {Record<string, string>} styles
   * @returns {void}
   */
  function setStyles(element, styles) {
    for (const [property, value] of Object.entries(styles)) {
      element.style.setProperty(property, value, "important");
    }
  }

  /* =========================================================
     Image Count
     ========================================================= */

  /**
   * image-line-N のNを取得。
   *
   * image-line-3
   * ↓
   * 3
   *
   * @param {HTMLElement} line
   * @returns {number}
   */
  function getImageCount(line) {
    for (const className of line.classList) {
      const match = className.match(/^image-line-(\d+)$/);

      if (match) {
        return Number(match[1]);
      }
    }

    return 0;
  }

  /* =========================================================
     Process Line
     ========================================================= */

  /**
   * 複数画像行を
   * 同一サイズのImage Cardへ変換。
   *
   * @param {HTMLElement} line
   * @returns {void}
   */
  function processLine(line) {
    /* -------------------------------------------------------
       Image Count
       ------------------------------------------------------- */

    const imageCount = getImageCount(line);

    /*
     * 1枚画像には何もしない。
     */
    if (imageCount < 2) {
      return;
    }

    /* -------------------------------------------------------
       Text
       ------------------------------------------------------- */

    const text = line.querySelector(":scope > .text");

    if (!(text instanceof HTMLElement)) {
      return;
    }

    /* -------------------------------------------------------
       Container
       ------------------------------------------------------- */

    /*
     * Cosense DOM:
     *
     * .line.image-line-3
     *   > .text
     *     > span
     *       > span
     *         > .modal-image
     *
     *       > span
     *         > .modal-image
     *
     *       > span
     *         > .modal-image
     */

    const container = text.querySelector(":scope > span");

    if (!(container instanceof HTMLElement)) {
      return;
    }

    /* -------------------------------------------------------
       Image Items
       ------------------------------------------------------- */

    const items = Array.from(container.children).filter((child) => {
      if (!(child instanceof HTMLElement)) {
        return false;
      }

      return Boolean(child.querySelector(".modal-image img.image"));
    });

    /*
     * DOM上で2枚以上確認できた場合のみ処理。
     */
    if (items.length < 2) {
      return;
    }

    /* =======================================================
       Important:
       ここではまだ
       data-kame-equal-image-row
       を付けない。

       CSS側ではこの属性が付くまで
       visibility:hidden にしている。

       全スタイル適用後に属性を付けることで
       元レイアウトが一瞬見えるのを防ぐ。
       ======================================================= */

    /* =======================================================
       Line
       ======================================================= */

    setStyles(line, {
      width: "100%",

      "max-width": "100%",

      "box-sizing": "border-box",
    });

    /* =======================================================
       Text
       ======================================================= */

    setStyles(text, {
      display: "block",

      position: "relative",

      width: "100%",

      "min-width": "0",

      "max-width": "100%",

      "box-sizing": "border-box",
    });

    /* =======================================================
       Grid Container
       ======================================================= */

    setStyles(container, {
      display: "grid",

      /*
       * 枚数に応じて均等分割。
       *
       * 2枚 → 50% × 2
       * 3枚 → 33.3% × 3
       * 4枚 → 25% × 4
       */
      "grid-template-columns": `repeat(${items.length}, minmax(0, 1fr))`,

      "column-gap": "var(--kame-image-gap)",

      "row-gap": "var(--kame-image-gap)",

      "align-items": "stretch",

      width: "100%",

      "min-width": "0",

      "max-width": "100%",

      margin: "0",

      padding: "0",

      "box-sizing": "border-box",

      "white-space": "normal",
    });

    /* =======================================================
       Image Items
       ======================================================= */

    for (const item of items) {
      if (!(item instanceof HTMLElement)) {
        continue;
      }

      /* =====================================================
         Grid Item
         ===================================================== */

      setStyles(item, {
        display: "block",

        position: "relative",

        width: "auto",

        "min-width": "0",

        "max-width": "100%",

        /*
         * 全カードを同じ高さに固定。
         */
        height: "var(--kame-image-card-height)",

        margin: "0",

        padding: "0",

        float: "none",

        transform: "none",

        "box-sizing": "border-box",

        overflow: "hidden",

        "border-radius": "var(--kame-image-radius)",
      });

      /* =====================================================
         Empty Characters
         ===================================================== */

      /*
       * Cosenseが画像記法の前後に生成する
       * 空白用spanを非表示。
       */
      item.querySelectorAll(".empty-char-index").forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }

        setStyles(element, {
          display: "none",
        });
      });

      /* =====================================================
         Modal Image
         ===================================================== */

      const modalImage = item.querySelector(".modal-image");

      if (modalImage instanceof HTMLElement) {
        setStyles(modalImage, {
          display: "block",

          position: "static",

          float: "none",

          width: "100%",

          height: "100%",

          "min-width": "0",

          "min-height": "100%",

          "max-width": "100%",

          "max-height": "100%",

          margin: "0",

          padding: "0",

          transform: "none",

          "box-sizing": "border-box",

          overflow: "hidden",

          "border-radius": "var(--kame-image-radius)",
        });
      }

      /* =====================================================
         Image Link
         ===================================================== */

      const link = item.querySelector(".modal-image > a");

      if (link instanceof HTMLElement) {
        setStyles(link, {
          display: "block",

          position: "static",

          float: "none",

          width: "100%",

          height: "100%",

          "min-width": "0",

          "min-height": "100%",

          "max-width": "100%",

          "max-height": "100%",

          margin: "0",

          padding: "0",

          "line-height": "0",

          transform: "none",

          "box-sizing": "border-box",

          overflow: "hidden",

          "border-radius": "var(--kame-image-radius)",
        });
      }

      /* =====================================================
         Image
         ===================================================== */

      const image = item.querySelector(".modal-image img.image");

      if (image instanceof HTMLElement) {
        setStyles(image, {
          display: "block",

          position: "static",

          float: "none",

          /*
           * カードを完全に埋める。
           */
          width: "100%",

          height: "100%",

          "min-width": "0",

          "min-height": "100%",

          "max-width": "100%",

          "max-height": "100%",

          margin: "0",

          padding: "0",

          /*
           * 縦横比を維持しながら
           * 指定領域を完全に埋める。
           *
           * はみ出した部分はトリミング。
           */
          "object-fit": "cover",

          /*
           * 基本は中央基準。
           */
          "object-position": "center center",

          "box-sizing": "border-box",

          transform: "none",

          "border-radius": "var(--kame-image-radius)",
        });
      }
    }

    /* =======================================================
       Processing Complete
       ======================================================= */

    /*
     * ★ 最重要
     *
     * 全スタイル設定が完了してから
     * 表示許可用のdata属性を付ける。
     */

    line.dataset.kameEqualImageCount = String(items.length);

    line.dataset.kameEqualImageRow = "true";
  }

  /* =========================================================
     Scan
     ========================================================= */

  /**
   * ページ内の複数画像行をすべて処理。
   *
   * @returns {void}
   */
  function scan() {
    frameId = null;

    const lines = document.querySelectorAll('.lines > .line[class*="image-line-"]');

    for (const line of lines) {
      if (line instanceof HTMLElement) {
        processLine(line);
      }
    }
  }

  /* =========================================================
     Schedule Scan
     ========================================================= */

  /**
   * 同じフレーム内で何度もscanしない。
   *
   * @returns {void}
   */
  function scheduleScan() {
    if (frameId !== null) {
      return;
    }

    frameId = window.requestAnimationFrame(scan);
  }

  /* =========================================================
     Initial Scan
     ========================================================= */

  /*
   * UserScript読み込み時点で
   * 既に存在している画像行を処理。
   */
  scan();

  /* =========================================================
     Mutation Observer
     ========================================================= */

  /*
   * Cosenseは、
   *
   * ・ページ遷移
   * ・編集
   * ・カーソル移動
   * ・Undo / Redo
   *
   * などでDOMを再生成するため監視。
   */
  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => {
      /* ---------------------------------------------
                 DOM Changes
                 --------------------------------------------- */

      if (mutation.type === "childList") {
        return true;
      }

      /* ---------------------------------------------
                 Class Changes
                 --------------------------------------------- */

      if (mutation.type === "attributes" && mutation.attributeName === "class") {
        return true;
      }

      return false;
    });

    if (relevant) {
      scheduleScan();
    }
  });

  const linesContainer = document.querySelector(".lines");

  if (linesContainer) {
    observer.observe(linesContainer, {
      childList: true,

      subtree: true,

      attributes: true,

      attributeFilter: ["class"],
    });
  }

  /* =========================================================
     Resize
     ========================================================= */

  /*
   * 画面サイズ変更時にも再適用。
   */
  window.addEventListener("resize", scheduleScan, {
    signal,
  });

  /* =========================================================
     Editing / Cursor Movement
     ========================================================= */

  /*
   * Cosenseの行再描画対策。
   */
  document.addEventListener("click", scheduleScan, {
    signal,
  });

  document.addEventListener("keyup", scheduleScan, {
    signal,
  });

  /* =========================================================
     Cleanup
     ========================================================= */

  signal.addEventListener(
    "abort",

    () => {
      observer.disconnect();

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);

        frameId = null;
      }
    },
  );

  /* =========================================================
     Loaded
     ========================================================= */

  console.log("[Kame Equal Image Row] loaded");
})();
