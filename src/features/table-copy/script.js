import { BUTTON_CLASS } from "./config.js";
import { addStyle } from "./styles.js";
import { getCopyIcon, getCheckIcon } from "./icons.js";
import { csvToTSV } from "./csv.js";

// # Author: kamekingdom (2026-08-24)

(() => {
  /**
   * テーブルのコピーボタンを追加
   *
   * @returns {void}
   */
  const addButtons = () => {
    /** @type {NodeListOf<HTMLAnchorElement>} */
    const links = document.querySelectorAll(
      '.table-block-start a[href*="/api/table/"][href$=".csv"]',
    );

    links.forEach((link) => {
      /** @type {HTMLElement | null} */
      const parent = link.parentElement;

      if (!parent) {
        return;
      }

      if (parent.querySelector(`.${BUTTON_CLASS}`)) {
        return;
      }

      /** @type {HTMLButtonElement} */
      const button = document.createElement("button");

      button.type = "button";
      button.className = BUTTON_CLASS;
      button.title = "テーブルをTSVでコピー";
      button.setAttribute("aria-label", "テーブルをTSVでコピー");

      button.innerHTML = getCopyIcon();

      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        try {
          /** @type {Response} */
          const response = await fetch(link.href, {
            credentials: "same-origin",
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          /** @type {string} */
          const csv = await response.text();

          /** @type {string} */
          const tsv = csvToTSV(csv);

          await navigator.clipboard.writeText(tsv);

          button.innerHTML = getCheckIcon();

          button.classList.add("copied");

          window.setTimeout(() => {
            button.innerHTML = getCopyIcon();

            button.classList.remove("copied");
          }, 1000);
        } catch (error) {
          console.error("[TableCopy]", error);
        }
      });

      parent.appendChild(button);
    });
  };

  addStyle();
  addButtons();

  /** @type {MutationObserver} */
  const observer = new MutationObserver(() => {
    addButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
