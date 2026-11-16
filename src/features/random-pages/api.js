/** @typedef {import("./types.js").ScrapboxPage} ScrapboxPage */
/** @typedef {import("./types.js").PagesApiResponse} PagesApiResponse */

// # Author: kamekingdom (2026-05-01)

/**
 * @returns {string | null}
 */
export const getProjectName = () => {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.length >= 1 ? decodeURIComponent(parts[0]) : null;
};

/**
 * @returns {boolean}
 */
export const isProjectHome = () => {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.length === 1;
};

/**
 * @param {number} max
 * @param {number} count
 * @returns {number[]}
 */
export const getUniqueRandomIndexes = (max, count) => {
  /** @type {Set<number>} */
  const result = new Set();
  const actualCount = Math.min(max, count);

  while (result.size < actualCount) {
    result.add(Math.floor(Math.random() * max));
  }

  return Array.from(result);
};

/**
 * @param {string} projectName
 * @param {number} skip
 * @returns {Promise<ScrapboxPage | null>}
 */
export const fetchPageAt = async (projectName, skip) => {
  const url = `/api/pages/${encodeURIComponent(projectName)}?limit=1&skip=${skip}&sort=updated`;

  const response = await fetch(url);

  if (!response.ok) {
    console.warn("[Random Pages] Failed to fetch page:", response.status);
    return null;
  }

  /** @type {PagesApiResponse} */
  const data = await response.json();

  return data.pages?.[0] ?? null;
};

/**
 * @param {string} projectName
 * @param {number} count
 * @returns {Promise<ScrapboxPage[]>}
 */
export const fetchRandomPages = async (projectName, count) => {
  const firstUrl = `/api/pages/${encodeURIComponent(projectName)}?limit=1&sort=updated`;

  const response = await fetch(firstUrl);

  if (!response.ok) {
    console.warn("[Random Pages] Failed to fetch page count:", response.status);
    return [];
  }

  /** @type {PagesApiResponse} */
  const firstData = await response.json();

  const totalCount = firstData.count ?? 0;

  if (totalCount === 0) {
    return [];
  }

  const skips = getUniqueRandomIndexes(totalCount, count);

  const pages = await Promise.all(skips.map((skip) => fetchPageAt(projectName, skip)));

  return pages.filter((page) => page !== null);
};
