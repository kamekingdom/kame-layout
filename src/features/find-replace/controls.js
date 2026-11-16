// Author: kamekingdom (2026-10-06)

/**
 * @param {HTMLButtonElement} button
 * @param {boolean} active
 * @returns {void}
 */
export function setOptionButton(button, active) {
  button.classList.toggle("is-active", active);

  button.setAttribute("aria-pressed", active ? "true" : "false");
}

/**
 * @param {string} text
 * @param {string} title
 * @returns {HTMLButtonElement}
 */
export function createOptionButton(text, title) {
  const button = document.createElement("button");

  button.type = "button";

  button.className = "kame-replace-option";

  button.textContent = text;

  button.title = title;

  button.setAttribute("aria-pressed", "false");

  return button;
}
