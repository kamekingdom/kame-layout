/** @typedef {import("./types.js").KameWindow} KameWindow */

import {
  collectTables,
  createMatrix,
  renderFormulaCell,
  clearFormulaCell,
  isOwnMutation,
} from "./table-dom.js";
import { evaluateTable, formatResult } from "./engine.js";

// Author: kamekingdom (2026-09-29)

(() => {
  // Initialization

  /** @type {KameWindow} */
  const kameWindow = /** @type {KameWindow} */ (window);

  if (kameWindow.__kameSpreadsheetController) {
    kameWindow.__kameSpreadsheetController.abort();
  }

  /** @type {AbortController} */
  const controller = new AbortController();

  /** @type {AbortSignal} */
  const signal = controller.signal;

  kameWindow.__kameSpreadsheetController = controller;

  // State

  /** @type {number | null} */
  let refreshFrame = null;

  /** @type {MutationObserver | null} */
  let observer = null;

  // Refresh

  /**
   * @returns {void}
   */
  function refresh() {
    /** @type {Set<HTMLElement>} */
    const activeFormulaCells = new Set();

    const tables = collectTables();

    for (const rows of tables) {
      const matrix = createMatrix(rows);

      const results = evaluateTable(matrix);

      for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
          const cell = matrix[row][col];

          const source = cell.source.trim();

          if (!source.startsWith("=")) {
            clearFormulaCell(cell.element);

            continue;
          }

          activeFormulaCells.add(cell.element);

          const key = `${row}:${col}`;

          const result = results.get(key);

          if (!result) {
            continue;
          }

          renderFormulaCell(cell.element, source, formatResult(result));
        }
      }
    }

    /*
     * tableから削除されたセルなどをcleanup。
     */
    document.querySelectorAll(".kame-sheet-formula-cell").forEach((element) => {
      if (element instanceof HTMLElement && !activeFormulaCells.has(element)) {
        clearFormulaCell(element);
      }
    });
  }

  /**
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

  // Observer

  observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => !isOwnMutation(mutation));

    if (relevant) {
      queueRefresh();
    }
  });

  observer.observe(document.body, {
    childList: true,

    subtree: true,

    characterData: true,
  });

  // Input

  document.addEventListener(
    "input",

    queueRefresh,

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

      document.querySelectorAll(".kame-sheet-formula-cell").forEach((element) => {
        if (element instanceof HTMLElement) {
          clearFormulaCell(element);
        }
      });
    },
  );

  // Initial

  refresh();

  window.requestAnimationFrame(refresh);

  window.setTimeout(refresh, 300);

  console.log("[Kame Spreadsheet] loaded");
})();
