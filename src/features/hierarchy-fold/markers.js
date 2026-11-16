/** @typedef {import("./types.js").FoldMarker} FoldMarker */

// Author: kamekingdom (2026-09-29)

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
export function getFoldMarkerFromDom(line) {
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
export function toggleFoldMarkerText(text) {
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

  // > → <

  if (decorations.includes(">")) {
    /** @type {string} */
    const updatedDecorations = decorations.replace(">", "<");

    return text.replace(
      /^([\t \u3000]*)\[([^\]\t \u3000]+)(?=[\t \u3000])/u,

      () => `${indent}[${updatedDecorations}`,
    );
  }

  // < → >

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

/**
 * 空行か判定。
 *
 * @param {HTMLElement} line
 * @returns {boolean}
 */
export function isBlankLine(line) {
  /** @type {HTMLElement | null} */
  const text = /** @type {HTMLElement | null} */ (line.querySelector(".text"));

  if (!text) {
    return true;
  }

  /** @type {string} */
  const content = (text.textContent || "").replace(/\u200B/g, "").trim();

  return content === "";
}

/**
 * DOMからindent階層を取得。
 *
 * @param {HTMLElement} line
 * @returns {number}
 */
export function getIndentLevel(line) {
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
