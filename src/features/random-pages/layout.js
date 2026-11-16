/** @typedef {import("./types.js").CardMetrics} CardMetrics */

// # Author: kamekingdom (2026-05-01)

import { ROOT_ID, DEFAULT_CARD_COUNT } from "./config.js";

/**
 * @returns {HTMLElement | null}
 */
export const findPageList = () => {
  const pageList = document.querySelector(".page-list");
  return pageList instanceof HTMLElement ? pageList : null;
};

/**
 * @returns {HTMLElement | null}
 */
export const findNormalGrid = () => {
  const pageList = findPageList();

  if (pageList === null) {
    return null;
  }

  const grid = pageList.querySelector("ul.grid");
  return grid instanceof HTMLElement ? grid : null;
};

/**
 * @returns {{ element: HTMLElement, rect: DOMRect }[]}
 */
export const getNormalCardCandidates = () => {
  const grid = findNormalGrid();

  if (grid === null) {
    return [];
  }

  return Array.from(grid.querySelectorAll("li.page-list-item.grid-style-item"))
    .filter((element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      if (element.closest(`#${ROOT_ID}`)) {
        return false;
      }

      const rect = element.getBoundingClientRect();

      return rect.width >= 80 && rect.height >= 80;
    })
    .map((element) => ({
      element,
      rect: element.getBoundingClientRect(),
    }))
    .sort((a, b) => {
      if (Math.abs(a.rect.top - b.rect.top) > 4) {
        return a.rect.top - b.rect.top;
      }

      return a.rect.left - b.rect.left;
    });
};

/**
 * @returns {HTMLElement | null}
 */
export const findNormalCardElement = () => {
  const candidates = getNormalCardCandidates();
  return candidates[0]?.element ?? null;
};

/**
 * @returns {number}
 */
export const getNormalColumnCount = () => {
  const cards = getNormalCardCandidates();
  const firstCard = cards[0];

  if (firstCard === undefined) {
    return DEFAULT_CARD_COUNT;
  }

  const sameRowCards = cards.filter(({ rect }) => {
    return Math.abs(rect.top - firstCard.rect.top) <= 4;
  });

  return Math.max(1, sameRowCards.length);
};

/**
 * @returns {CardMetrics}
 */
export const getNormalCardMetrics = () => {
  const cards = getNormalCardCandidates();
  const firstCard = cards[0];

  if (firstCard === undefined) {
    return {
      width: 153.42,
      height: 168.96,
      gap: 14,
      columnCount: DEFAULT_CARD_COUNT,
    };
  }

  const sameRowCards = cards.filter(({ rect }) => {
    return Math.abs(rect.top - firstCard.rect.top) <= 4;
  });

  const secondCard = sameRowCards[1];

  const measuredGap = secondCard === undefined ? 14 : secondCard.rect.left - firstCard.rect.right;

  return {
    width: Math.round(firstCard.rect.width * 100) / 100,
    height: Math.round(firstCard.rect.height * 100) / 100,
    gap: Math.max(4, Math.round(measuredGap * 100) / 100),
    columnCount: Math.max(1, sameRowCards.length),
  };
};

/**
 * @returns {void}
 */
export const syncCardMetrics = () => {
  const root = document.getElementById(ROOT_ID);

  if (root === null) {
    return;
  }

  const metrics = getNormalCardMetrics();

  root.style.setProperty("--rpc-card-width", `${metrics.width}px`);
  root.style.setProperty("--rpc-card-height", `${metrics.height}px`);
  root.style.setProperty("--rpc-card-gap", `${metrics.gap}px`);
  root.style.setProperty("--rpc-card-columns", `${metrics.columnCount}`);
};
