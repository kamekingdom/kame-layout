/** @typedef {import("./types.js").SheetCell} SheetCell */

// Author: kamekingdom (2026-09-29)

/**
 * 計算結果表示用spanを除外して
 * 元々のセル文字列を取得。
 *
 * @param {HTMLElement} cell
 * @returns {string}
 */
export function getCellSource(cell) {
  /** @type {HTMLElement} */
  const clone = /** @type {HTMLElement} */ (cell.cloneNode(true));

  clone.querySelectorAll(".kame-sheet-result").forEach((element) => {
    element.remove();
  });

  return (clone.textContent || "").trim();
}

/**
 * 連続しているtable行を
 * 1つのSpreadsheetとしてまとめる。
 *
 * @returns {HTMLElement[][]}
 */
export function collectTables() {
  /** @type {HTMLElement[]} */
  const lines = Array.from(document.querySelectorAll(".lines > .line"));

  /** @type {HTMLElement[][]} */
  const tables = [];

  /** @type {HTMLElement[]} */
  let current = [];

  for (const line of lines) {
    /** @type {HTMLElement | null} */
    const tableBlock = /** @type {HTMLElement | null} */ (line.querySelector(".table-block"));

    const cells = tableBlock ? Array.from(tableBlock.querySelectorAll(".cell")) : [];

    /*
     * table row
     */
    if (tableBlock && cells.length > 0) {
      current.push(line);

      continue;
    }

    /*
     * table終了。
     */
    if (current.length > 0) {
      tables.push(current);

      current = [];
    }
  }

  if (current.length > 0) {
    tables.push(current);
  }

  return tables;
}

/**
 * table DOMをmatrix化。
 *
 * @param {HTMLElement[]} rows
 * @returns {SheetCell[][]}
 */
export function createMatrix(rows) {
  return rows.map((line, row) => {
    /** @type {HTMLElement[]} */
    const cells = Array.from(line.querySelectorAll(".table-block .cell"));

    return cells.map((element, col) => {
      return {
        element,

        source: getCellSource(element),

        row,

        col,
      };
    });
  });
}

/**
 * @param {HTMLElement} cell
 * @param {string} formula
 * @param {string} result
 * @returns {void}
 */
export function renderFormulaCell(cell, formula, result) {
  cell.classList.add("kame-sheet-formula-cell");

  cell.dataset.kameSheetFormula = formula;

  /** @type {HTMLSpanElement | null} */
  let resultElement = cell.querySelector(":scope > .kame-sheet-result");

  if (!resultElement) {
    resultElement = document.createElement("span");

    resultElement.className = "kame-sheet-result";

    resultElement.setAttribute("aria-hidden", "true");

    cell.appendChild(resultElement);
  }

  if (resultElement.textContent !== result) {
    resultElement.textContent = result;
  }

  cell.title = formula;
}

/**
 * @param {HTMLElement} cell
 * @returns {void}
 */
export function clearFormulaCell(cell) {
  cell.classList.remove("kame-sheet-formula-cell");

  delete cell.dataset.kameSheetFormula;

  cell.querySelector(":scope > .kame-sheet-result")?.remove();

  if (cell.title.startsWith("=")) {
    cell.removeAttribute("title");
  }
}

/**
 * 自分で追加した計算結果による
 * DOM変更か判定。
 *
 * @param {MutationRecord} mutation
 * @returns {boolean}
 */
export function isOwnMutation(mutation) {
  const target = mutation.target;

  if (target instanceof Element && target.closest(".kame-sheet-result")) {
    return true;
  }

  if (target.parentElement?.closest(".kame-sheet-result")) {
    return true;
  }

  const nodes = [...mutation.addedNodes, ...mutation.removedNodes];

  if (nodes.length === 0) {
    return false;
  }

  return nodes.every(
    (node) => node instanceof HTMLElement && node.classList.contains("kame-sheet-result"),
  );
}
