/** @typedef {import("./types.js").KameWindow} KameWindow */

import { processLine } from "./layout.js";

// Author: kamekingdom (2026-10-28)

(() => {
  // Initialization

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

  // Scan

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

  // Schedule Scan

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

  // Initial Scan

  /*
   * UserScript読み込み時点で
   * 既に存在している画像行を処理。
   */
  scan();

  // Mutation Observer

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
      // DOM Changes

      if (mutation.type === "childList") {
        return true;
      }

      // Class Changes

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

  // Resize

  /*
   * 画面サイズ変更時にも再適用。
   */
  window.addEventListener("resize", scheduleScan, {
    signal,
  });

  // Editing / Cursor Movement

  /*
   * Cosenseの行再描画対策。
   */
  document.addEventListener("click", scheduleScan, {
    signal,
  });

  document.addEventListener("keyup", scheduleScan, {
    signal,
  });

  // Cleanup

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

  // Loaded

  console.log("[Kame Equal Image Row] loaded");
})();
