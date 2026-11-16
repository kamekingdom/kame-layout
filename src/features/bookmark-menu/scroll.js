// Author: kamekingdom (2026-11-13)

/**
 * 要素を含むスクロールコンテナを取得する。
 * なければドキュメント全体を使用する。
 *
 * @param {HTMLElement} element
 * @returns {HTMLElement | null}
 */
export function getScrollContainer(element) {
  /** @type {HTMLElement | null} */
  let parent = element.parentElement;

  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);

    const scrollable = /^(auto|scroll|overlay)$/.test(style.overflowY);

    if (scrollable && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

/**
 * 指定した行にスムーズスクロールする。
 * 固定ヘッダーの高さを考慮する。
 *
 * @param {HTMLElement} element
 * @param {number} fixedHeaderHeight
 * @returns {void}
 */
export function scrollToBookmark(element, fixedHeaderHeight) {
  const container = getScrollContainer(element);

  const elementRect = element.getBoundingClientRect();

  if (container) {
    const containerRect = container.getBoundingClientRect();

    const targetTop = container.scrollTop + elementRect.top - containerRect.top - fixedHeaderHeight;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });

    return;
  }

  const targetTop = window.scrollY + elementRect.top - fixedHeaderHeight;

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}

/**
 * 固定ヘッダーの高さを取得する。
 *
 * @returns {number}
 */
export function getFixedHeaderHeight() {
  const navbar = document.querySelector(".navbar");

  const pageMenu = document.querySelector(".navbar-pagemenu");

  /** @type {number} */
  let navbarHeight = 0;

  if (navbar instanceof HTMLElement) {
    const position = window.getComputedStyle(navbar).position;

    if (position === "fixed") {
      navbarHeight = navbar.getBoundingClientRect().height;
    }
  }

  /** @type {number} */
  const pageMenuHeight =
    pageMenu instanceof HTMLElement ? pageMenu.getBoundingClientRect().height : 0;

  return navbarHeight + pageMenuHeight;
}
