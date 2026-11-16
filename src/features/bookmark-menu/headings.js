// Author: kamekingdom (2026-11-13)

/**
 * インデント幅を数値化する。
 *
 * 半角スペース = 1
 * 全角スペース = 2
 * タブ = 4
 *
 * @param {string} indent
 * @returns {number}
 */
export function getIndentWidth(indent) {
  /** @type {number} */
  let width = 0;

  for (const char of indent) {
    if (char === "\t") {
      width += 4;
    } else if (char === "\u3000") {
      width += 2;
    } else {
      width += 1;
    }
  }

  return width;
}

/**
 * インデントから数字見出しの階層を判定する。
 *
 * @param {number} indentWidth
 * @param {number[]} stack
 * @returns {number}
 */
export function getHierarchyLevel(indentWidth, stack) {
  if (stack.length === 0) {
    stack.push(indentWidth);
    return 0;
  }

  while (stack.length > 0 && indentWidth < stack[stack.length - 1]) {
    stack.pop();
  }

  if (stack.length === 0) {
    stack.push(indentWidth);
    return 0;
  }

  if (indentWidth === stack[stack.length - 1]) {
    return stack.length - 1;
  }

  stack.push(indentWidth);
  return stack.length - 1;
}

/**
 * Cosenseの画面上に表示される行テキストを取得する。
 *
 * @param {HTMLElement} element
 * @returns {string}
 */
export function getRenderedLineText(element) {
  return (element.textContent ?? "").replace(/\u00a0/g, " ").trim();
}

/**
 * 数字見出しの階層をメニューに表現する。
 *
 * @param {string} title
 * @param {number} level
 * @returns {string}
 */
export function formatBookmarkTitle(title, level) {
  if (level <= 0) {
    return title;
  }

  return "　".repeat(level) + "↳ " + title;
}
