// # Author: kamekingdom (2026-08-24)
import { BUTTON_CLASS } from "./config.js";
/**
 * CSSを追加
 *
 * @returns {void}
 */
export const addStyle = () => {
  /** @type {HTMLStyleElement} */
  const style = document.createElement("style");

  style.textContent = `
      .${BUTTON_CLASS} {
        display: inline-flex;
        align-items: center;
        justify-content: center;

        width: 26px;
        height: 26px;

        margin-left: 6px;
        padding: 0;

        border: none;
        border-radius: 5px;

        background: transparent;
        color: currentColor;

        cursor: pointer;

        opacity: 0.55;

        vertical-align: middle;

        transition:
          opacity 0.15s ease,
          background-color 0.15s ease,
          transform 0.1s ease;
      }

      .${BUTTON_CLASS}:hover {
        opacity: 1;
        background-color:
          rgba(128, 128, 128, 0.15);
      }

      .${BUTTON_CLASS}:active {
        transform: scale(0.9);
      }

      .${BUTTON_CLASS}.copied {
        opacity: 1;
      }

      .${BUTTON_CLASS} svg {
        display: block;
        pointer-events: none;
      }
    `;

  document.head.appendChild(style);
};
