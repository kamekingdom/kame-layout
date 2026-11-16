/** @typedef {import("./types.js").IconState} IconState */

// Author: kamekingdom (2026-10-05)

export const PROJECT_NAME = "kamelayout";

/** @type {IconState[]} */
export const STATES = [
  {
    name: "AC",
    source: "[/kameLayout/AC.icon]",
  },
  {
    name: "NWJ",
    source: "[/kameLayout/NWJ.icon]",
  },
  {
    name: "WJ",
    source: "[/kameLayout/WJ.icon]",
  },
  {
    name: "WA",
    source: "[/kameLayout/WA.icon]",
  },
  {
    name: "RE",
    source: "[/kameLayout/RE.icon]",
  },
  {
    name: "TLE",
    source: "[/kameLayout/TLE.icon]",
  },
];

/**
 * hrefから状態名を取得。
 *
 * 実際のリンク:
 *
 * /kamelayout/AC
 * /kamelayout/NWJ
 * ...
 *
 * @param {HTMLAnchorElement} anchor
 * @returns {number}
 */
export function getStateIndexFromAnchor(anchor) {
  /*
   * 通常の文字リンク
   *
   * [AC]
   *
   * までToggle対象にしないため、
   * 画像を含んでいるリンクだけ対象。
   */
  if (!anchor.querySelector("img")) {
    return -1;
  }

  try {
    const url = new URL(anchor.href, location.href);

    const pathParts = url.pathname
      .split("/")
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));

    /*
     * 例:
     *
     * /kamelayout/AC
     *
     * ↓
     *
     * [
     *   "kamelayout",
     *   "AC"
     * ]
     */
    if (pathParts.length < 2) {
      return -1;
    }

    const projectName = pathParts[pathParts.length - 2];

    const pageName = pathParts[pathParts.length - 1];

    if (projectName.toLowerCase() !== PROJECT_NAME.toLowerCase()) {
      return -1;
    }

    return STATES.findIndex((state) => state.name === pageName);
  } catch (error) {
    return -1;
  }
}

/**
 * 対象のStatus Iconか。
 *
 * @param {HTMLAnchorElement} anchor
 * @returns {boolean}
 */
export function isTargetAnchor(anchor) {
  return getStateIndexFromAnchor(anchor) >= 0;
}

/**
 * Eventから対象anchor取得。
 *
 * @param {Event} event
 * @returns {HTMLAnchorElement | null}
 */
export function getTargetAnchor(event) {
  const target = event.target;

  if (!(target instanceof Element)) {
    return null;
  }

  const anchor = target.closest("a[href]");

  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }

  if (!isTargetAnchor(anchor)) {
    return null;
  }

  return anchor;
}

/**
 * 行内のStatus Icon記法を全部取得。
 *
 * @param {string} text
 * @returns {{
 *   start: number,
 *   end: number,
 *   stateIndex: number
 * }[]}
 */
export function findIconTokens(text) {
  /** @type {{
   *   start: number,
   *   end: number,
   *   stateIndex: number
   * }[]}
   */
  const tokens = [];

  for (let stateIndex = 0; stateIndex < STATES.length; stateIndex++) {
    const source = STATES[stateIndex].source;

    let position = 0;

    while (true) {
      const start = text.indexOf(source, position);

      if (start < 0) {
        break;
      }

      tokens.push({
        start,

        end: start + source.length,

        stateIndex,
      });

      position = start + source.length;
    }
  }

  /*
   * 左から順番に並べる。
   */
  tokens.sort((a, b) => a.start - b.start);

  return tokens;
}

/**
 * 同じ行に複数Status Iconがある場合、
 * 何番目をクリックしたか調べる。
 *
 * @param {HTMLElement} lineElement
 * @param {HTMLAnchorElement} clickedAnchor
 * @returns {number}
 */
export function getClickedIconOrdinal(lineElement, clickedAnchor) {
  /** @type {HTMLAnchorElement[]} */
  const anchors = Array.from(lineElement.querySelectorAll("a[href]"))
    .filter((element) => element instanceof HTMLAnchorElement)
    .filter((element) => isTargetAnchor(/** @type {HTMLAnchorElement} */ (element)));

  return anchors.indexOf(clickedAnchor);
}
