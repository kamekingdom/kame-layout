/** @typedef {import("./types.js").CosenseLine} CosenseLine */
/** @typedef {import("./types.js").KameWindow} KameWindow */

import { findIconTokens, getClickedIconOrdinal, STATES, getTargetAnchor } from "./states.js";

// Author: kamekingdom (2026-10-05)

(() => {
  // API

  const api = window.cosense ?? window.scrapbox;

  if (!api?.Page) {
    console.warn("[Kame Status Icon] Cosense API not found");

    return;
  }

  // Initialization

  /** @type {KameWindow} */
  const kameWindow = /** @type {KameWindow} */ (window);

  if (kameWindow.__kameStatusIconController) {
    kameWindow.__kameStatusIconController.abort();
  }

  /** @type {AbortController} */
  const controller = new AbortController();

  /** @type {AbortSignal} */
  const signal = controller.signal;

  kameWindow.__kameStatusIconController = controller;

  // Page Lines

  /**
   * @returns {CosenseLine[]}
   */
  function getPageLines() {
    if (!Array.isArray(api.Page.lines)) {
      return [];
    }

    return /** @type {CosenseLine[]} */ (api.Page.lines);
  }

  /**
   * DOM lineとPage.linesを対応。
   *
   * @param {HTMLElement} lineElement
   * @returns {number}
   */
  function findPageLineIndex(lineElement) {
    const pageLines = getPageLines();

    const domId = lineElement.id ?? "";

    const normalizedDomId = domId.startsWith("L") ? domId.slice(1) : domId;

    // ID Match

    const idIndex = pageLines.findIndex((line) => {
      if (!line.id) {
        return false;
      }

      return line.id === domId || line.id === normalizedDomId || `L${line.id}` === domId;
    });

    if (idIndex >= 0) {
      return idIndex;
    }

    // DOM Index Fallback

    const domLines = Array.from(document.querySelectorAll(".lines > .line"));

    return domLines.indexOf(lineElement);
  }

  // Toggle

  /**
   * Status Iconを次の状態へ変更。
   *
   * AC
   * ↓
   * NWJ
   * ↓
   * WJ
   * ↓
   * WA
   * ↓
   * RE
   * ↓
   * TLE
   * ↓
   * AC
   *
   * @param {HTMLAnchorElement} anchor
   * @returns {Promise<void>}
   */
  async function toggleIcon(anchor) {
    const lineElement = anchor.closest(".line");

    if (!(lineElement instanceof HTMLElement)) {
      return;
    }

    // Page Line

    const lineIndex = findPageLineIndex(lineElement);

    if (lineIndex < 0) {
      console.warn("[Kame Status Icon] line not found");

      return;
    }

    const pageLines = getPageLines();

    const pageLine = pageLines[lineIndex];

    if (!pageLine) {
      return;
    }

    const text = pageLine.text ?? "";

    // Token

    const tokens = findIconTokens(text);

    const ordinal = getClickedIconOrdinal(lineElement, anchor);

    if (ordinal < 0 || ordinal >= tokens.length) {
      console.warn("[Kame Status Icon] source token not found");

      return;
    }

    const token = tokens[ordinal];

    const currentState = STATES[token.stateIndex];

    const nextStateIndex = (token.stateIndex + 1) % STATES.length;

    const nextState = STATES[nextStateIndex];

    // Replace

    const updatedText = text.slice(0, token.start) + nextState.source + text.slice(token.end);

    try {
      /*
       * Cosense本文を実際に変更。
       */
      api.Page.updateLine(updatedText, lineIndex);

      console.log(`[Kame Status Icon] ${currentState.name} → ${nextState.name}`);

      if (typeof api.Page.waitForSave === "function") {
        await api.Page.waitForSave();
      }
    } catch (error) {
      console.error("[Kame Status Icon] update failed", error);
    }
  }

  /**
   * Cosenseがページ遷移する前に
   * 対象Status Iconを捕まえる。
   *
   * capture phaseで実行。
   */

  // Pointer Down

  document.addEventListener(
    "pointerdown",

    (event) => {
      const anchor = getTargetAnchor(event);

      if (!anchor) {
        return;
      }

      /*
       * リンク遷移を止める。
       */
      event.preventDefault();

      /*
       * Cosense側のhandlerへ渡さない。
       */
      event.stopPropagation();
    },

    {
      signal,
      capture: true,
    },
  );

  // Mouse Down

  document.addEventListener(
    "mousedown",

    (event) => {
      const anchor = getTargetAnchor(event);

      if (!anchor) {
        return;
      }

      event.preventDefault();

      event.stopPropagation();
    },

    {
      signal,
      capture: true,
    },
  );

  // Click

  document.addEventListener(
    "click",

    (event) => {
      const anchor = getTargetAnchor(event);

      if (!anchor) {
        return;
      }

      /*
       * /kamelayout/AC
       *
       * などへの遷移を完全に停止。
       */
      event.preventDefault();

      event.stopPropagation();

      /*
       * Status変更。
       */
      void toggleIcon(anchor);
    },

    {
      signal,
      capture: true,
    },
  );

  // Drag Prevention

  /*
   * 画像をドラッグしたときの
   * リンク操作も抑制。
   */
  document.addEventListener(
    "dragstart",

    (event) => {
      const anchor = getTargetAnchor(event);

      if (!anchor) {
        return;
      }

      event.preventDefault();
    },

    {
      signal,
      capture: true,
    },
  );

  // Loaded

  console.log("[Kame Status Icon] loaded");
})();
