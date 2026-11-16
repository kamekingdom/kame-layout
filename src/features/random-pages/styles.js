// # Author: kamekingdom (2026-05-01)
import { ROOT_ID, STYLE_ID } from "./config.js";
/**
 * @returns {void}
 */
export const injectStyle = () => {
  const oldStyle = document.getElementById(STYLE_ID);
  oldStyle?.remove();

  const style = document.createElement("style");
  style.id = STYLE_ID;

  style.textContent = `
      #${ROOT_ID} {
        --rpc-card-width: 153.42px;
        --rpc-card-height: 168.96px;
        --rpc-card-gap: 14px;
        --rpc-card-columns: 7;

        width: 100% !important;
        max-width: none !important;
        margin: 18px 0 28px 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }

      #${ROOT_ID} .random-page-cards-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin: 0 0 14px 0 !important;
        padding: 0 !important;
        font-weight: 500 !important;
        font-size: 18px !important;
        color: #4a4a4a !important;
        box-sizing: border-box !important;
      }

      #${ROOT_ID} .random-page-cards-refresh {
        all: unset;
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        min-height: 36px !important;
        max-width: 36px !important;
        max-height: 36px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 999px !important;
        background: rgba(0, 0, 0, 0.055) !important;
        color: #5f6368 !important;
        cursor: pointer !important;
        transition:
          background 0.15s ease,
          transform 0.15s ease,
          box-shadow 0.15s ease !important;
        flex: 0 0 auto !important;
      }

      #${ROOT_ID} .random-page-cards-refresh:hover {
        background: rgba(0, 0, 0, 0.09) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08) !important;
      }

      #${ROOT_ID} .random-page-cards-refresh:active {
        transform: translateY(0) scale(0.96) !important;
        box-shadow: none !important;
      }

      #${ROOT_ID} .random-page-cards-refresh svg {
        width: 16px !important;
        height: 16px !important;
        display: block !important;
        stroke: currentColor !important;
      }

      #${ROOT_ID} .random-page-cards-grid {
        display: grid !important;
        grid-template-columns: repeat(var(--rpc-card-columns), minmax(0, 1fr)) !important;
        column-gap: var(--rpc-card-gap) !important;
        row-gap: var(--rpc-card-gap) !important;
        align-items: flex-start !important;
        overflow: visible !important;
        padding: 0 0 4px 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
      }

      #${ROOT_ID} .random-page-card {
        all: unset;
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
        height: var(--rpc-card-height) !important;
        min-height: var(--rpc-card-height) !important;
        max-height: var(--rpc-card-height) !important;
        padding: 18px !important;
        border-radius: 4px !important;
        background: linear-gradient(135deg, #fffdf7 0%, #f2f7ff 100%) !important;
        border: 1px solid rgba(120, 140, 180, 0.16) !important;
        color: inherit !important;
        text-decoration: none !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        cursor: pointer !important;
      }

      #${ROOT_ID} .random-page-card:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08) !important;
      }

      #${ROOT_ID} .random-page-card-title {
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
        margin: 0 0 10px 0 !important;
        padding: 0 !important;
        font-weight: 700 !important;
        font-size: clamp(11px, calc(var(--rpc-card-width) * 0.078), 14px) !important;
        line-height: 1.45 !important;
        color: #333 !important;
        word-break: break-word !important;
      }

      #${ROOT_ID} .random-page-card-description {
        display: -webkit-box !important;
        -webkit-line-clamp: 5 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        font-weight: 400 !important;
        font-size: clamp(10px, calc(var(--rpc-card-width) * 0.07), 12px) !important;
        line-height: 1.55 !important;
        color: #666 !important;
        opacity: 0.85 !important;
        word-break: break-word !important;
      }

      @media (max-width: 900px) {
        #${ROOT_ID} .random-page-cards-header {
          font-size: 18px !important;
          margin-bottom: 14px !important;
        }

        #${ROOT_ID} .random-page-card {
          padding: 16px !important;
        }
      }
    `;

  document.head.appendChild(style);
};
