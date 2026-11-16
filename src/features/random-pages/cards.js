/** @typedef {import("./types.js").ScrapboxPage} ScrapboxPage */

// # Author: kamekingdom (2026-05-01)

import { getProjectName } from "./api.js";
import { ROOT_ID } from "./config.js";

/**
 * @param {string} text
 * @returns {string}
 */
export const escapeHtml = (text) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * @param {string} title
 * @returns {string}
 */
export const toPageUrl = (title) => {
  const projectName = getProjectName();

  if (projectName === null) {
    return "#";
  }

  return `/${encodeURIComponent(projectName)}/${encodeURIComponent(title)}`;
};

/**
 * @param {ScrapboxPage[]} pages
 * @returns {HTMLElement}
 */
export const createCardRoot = (pages) => {
  const root = document.createElement("section");
  root.id = ROOT_ID;

  const cardHtml = pages
    .map((page) => {
      const rawDescription = (page.descriptions ?? []).join(" ").slice(0, 90);

      const title = escapeHtml(page.title);
      const description = escapeHtml(rawDescription || "No description");
      const url = toPageUrl(page.title);

      return `
          <a class="random-page-card" href="${url}">
            <div class="random-page-card-title">${title}</div>
            <div class="random-page-card-description">${description}</div>
          </a>
        `;
    })
    .join("");

  root.innerHTML = `
      <div class="random-page-cards-header">
        <span>Random Pages</span>
        <button
          type="button"
          class="random-page-cards-refresh"
          aria-label="Refresh random pages"
          title="Refresh random pages"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 6v5h-5"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M19 13a7 7 0 1 1-2.05-4.95L20 11"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
      <div class="random-page-cards-grid">
        ${cardHtml}
      </div>
    `;

  return root;
};

/**
 * @returns {void}
 */
export const removeAllRandomPageRoots = () => {
  document.querySelectorAll(`#${ROOT_ID}`).forEach((element) => {
    element.remove();
  });
};
