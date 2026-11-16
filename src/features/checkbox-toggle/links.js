/** @typedef {import("./types.js").CheckboxState} CheckboxState */

// # Author: kamekingdom (2026-07-10)

/**
 * リンクがチェックボックスか判定します。
 *
 * @param {HTMLAnchorElement} anchor
 * @returns {CheckboxState | null}
 */
export const getCheckboxState = (anchor) => {
  if (anchor.classList.contains("icon")) {
    return null;
  }

  try {
    const url = new URL(anchor.href, location.href);
    const pathParts = url.pathname.split("/").filter((part) => part.length > 0);

    const pageName = decodeURIComponent(pathParts.at(-1) ?? "").toLowerCase();

    if (pageName === "o" || pageName === "v" || pageName === "x") {
      return pageName;
    }

    return null;
  } catch (error) {
    console.error("[Checkbox Toggle] リンクの解析に失敗しました。", error);

    return null;
  }
};

/**
 * イベントが発生したチェックボックスを取得します。
 *
 * @param {Event} event
 * @returns {HTMLAnchorElement | null}
 */
export const getCheckboxAnchor = (event) => {
  if (!(event.target instanceof Element)) {
    return null;
  }

  const anchor = event.target.closest("a[href]");

  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }

  return getCheckboxState(anchor) === null ? null : anchor;
};

/**
 * 行内で何番目のチェックボックスが押されたかを取得します。
 *
 * @param {HTMLElement} lineElement
 * @param {HTMLAnchorElement} clickedAnchor
 * @returns {number}
 */
export const getCheckboxOrdinal = (lineElement, clickedAnchor) => {
  const checkboxAnchors = Array.from(lineElement.querySelectorAll("a[href]")).filter(
    (element) => element instanceof HTMLAnchorElement && getCheckboxState(element) !== null,
  );

  return checkboxAnchors.indexOf(clickedAnchor);
};

/**
 * Cosense標準のフォーカス処理を停止します。
 *
 * @param {Event} event
 * @returns {HTMLAnchorElement | null}
 */
export const suppressDefaultBehavior = (event) => {
  const anchor = getCheckboxAnchor(event);

  if (!anchor) {
    return null;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  return anchor;
};
