// # Author: kamekingdom (2026-08-24)

/**
 * コピーアイコンSVG
 *
 * @returns {string}
 */
export const getCopyIcon = () => {
  return `
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="8"
          y="8"
          width="11"
          height="11"
          rx="2"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <path
          d="M16 8V7
             C16 5.895 15.105 5 14 5
             H7
             C5.895 5 5 5.895 5 7
             V14
             C5 15.105 5.895 16 7 16
             H8"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
};

/**
 * チェックアイコン
 *
 * @returns {string}
 */
export const getCheckIcon = () => {
  return `
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M5 12.5L10 17L19 7"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
};
