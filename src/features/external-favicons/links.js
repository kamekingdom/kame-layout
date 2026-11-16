// Author: kamekingdom (2026-10-27)

export const FAVICON_SIZE = 64;

export const IGNORED_HOSTS = ["scrapbox.io", "cosense.com"];

/**
 * @param {string} hostname
 * @returns {string}
 */
export function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/**
 * @param {string} hostname
 * @returns {boolean}
 */
export function isIgnoredHost(hostname) {
  const normalized = normalizeHostname(hostname);

  return IGNORED_HOSTS.some((ignored) => {
    const target = normalizeHostname(ignored);

    return normalized === target || normalized.endsWith(`.${target}`);
  });
}

/**
 * Cosense本文のリンクかどうか。
 *
 * 通常行・テーブル・コード等を含む。
 *
 * ヘッダーや関連ページ一覧などには
 * faviconを付けない。
 *
 * @param {HTMLAnchorElement} anchor
 * @returns {boolean}
 */
export function isContentLink(anchor) {
  /*
   * 通常本文
   */
  if (anchor.closest(".lines")) {
    return true;
  }

  /*
   * テーブルが.linesの外側に
   * 描画される環境へのFallback。
   */
  if (anchor.closest(".table-block")) {
    return true;
  }

  return false;
}

/**
 * @param {HTMLAnchorElement} anchor
 * @returns {URL | null}
 */
export function getExternalURL(anchor) {
  if (!isContentLink(anchor)) {
    return null;
  }

  try {
    const rawHref = anchor.getAttribute("href");

    if (!rawHref) {
      return null;
    }

    const url = new URL(rawHref, location.href);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    if (isIgnoredHost(url.hostname)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

/**
 * @param {URL} url
 * @returns {string}
 */
export function getGoogleFaviconURL(url) {
  return (
    "https://www.google.com/s2/favicons" +
    `?sz=${FAVICON_SIZE}` +
    `&domain_url=${encodeURIComponent(url.origin)}`
  );
}

/**
 * @param {URL} url
 * @returns {string}
 */
export function getDuckDuckGoFaviconURL(url) {
  return "https://icons.duckduckgo.com/ip3/" + `${encodeURIComponent(url.hostname)}.ico`;
}

/**
 * @param {URL} url
 * @returns {string}
 */
export function getDirectFaviconURL(url) {
  return `${url.origin}/favicon.ico`;
}
