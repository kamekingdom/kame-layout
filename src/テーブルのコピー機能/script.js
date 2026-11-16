// # Author: kamekingdom (2026-08-24)

(() => {
  /** @type {string} */
  const BUTTON_CLASS = "kame-table-copy-button";

  /**
   * CSV文字列を2次元配列に変換する
   * ダブルクォート、カンマ、セル内改行に対応
   *
   * @param {string} csv
   * @returns {string[][]}
   */
  const parseCSV = (csv) => {
    /** @type {string[][]} */
    const rows = [];

    /** @type {string[]} */
    let row = [];

    /** @type {string} */
    let cell = "";

    /** @type {boolean} */
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
      /** @type {string} */
      const char = csv[i];

      /** @type {string | undefined} */
      const next = csv[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }

        continue;
      }

      if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") {
          i++;
        }

        row.push(cell);

        if (
          row.some((value) => value.length > 0)
        ) {
          rows.push(row);
        }

        row = [];
        cell = "";

        continue;
      }

      cell += char;
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell);

      if (
        row.some((value) => value.length > 0)
      ) {
        rows.push(row);
      }
    }

    return rows;
  };

  /**
   * CSV → TSV
   *
   * @param {string} csv
   * @returns {string}
   */
  const csvToTSV = (csv) => {
    /** @type {string[][]} */
    const rows = parseCSV(csv);

    return rows
      .map((row) =>
        row
          .map((cell) =>
            // TSV内で崩れないようにタブだけ空白へ
            cell.replace(/\t/g, " ")
          )
          .join("\t")
      )
      .join("\n");
  };

  /**
   * コピーアイコンSVG
   *
   * @returns {string}
   */
  const getCopyIcon = () => {
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
  const getCheckIcon = () => {
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

  /**
   * テーブルのコピーボタンを追加
   *
   * @returns {void}
   */
  const addButtons = () => {
    /** @type {NodeListOf<HTMLAnchorElement>} */
    const links = document.querySelectorAll(
      '.table-block-start a[href*="/api/table/"][href$=".csv"]'
    );

    links.forEach((link) => {
      /** @type {HTMLElement | null} */
      const parent = link.parentElement;

      if (!parent) {
        return;
      }

      if (
        parent.querySelector(`.${BUTTON_CLASS}`)
      ) {
        return;
      }

      /** @type {HTMLButtonElement} */
      const button =
        document.createElement("button");

      button.type = "button";
      button.className = BUTTON_CLASS;
      button.title = "テーブルをTSVでコピー";
      button.setAttribute(
        "aria-label",
        "テーブルをTSVでコピー"
      );

      button.innerHTML = getCopyIcon();

      button.addEventListener(
        "mousedown",
        (event) => {
          event.preventDefault();
          event.stopPropagation();
        }
      );

      button.addEventListener(
        "click",
        async (event) => {
          event.preventDefault();
          event.stopPropagation();

          try {
            /** @type {Response} */
            const response = await fetch(
              link.href,
              {
                credentials: "same-origin",
              }
            );

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}`
              );
            }

            /** @type {string} */
            const csv =
              await response.text();

            /** @type {string} */
            const tsv =
              csvToTSV(csv);

            await navigator.clipboard.writeText(
              tsv
            );

            button.innerHTML =
              getCheckIcon();

            button.classList.add(
              "copied"
            );

            window.setTimeout(() => {
              button.innerHTML =
                getCopyIcon();

              button.classList.remove(
                "copied"
              );
            }, 1000);
          } catch (error) {
            console.error(
              "[TableCopy]",
              error
            );
          }
        }
      );

      parent.appendChild(button);
    });
  };

  /**
   * CSSを追加
   *
   * @returns {void}
   */
  const addStyle = () => {
    /** @type {HTMLStyleElement} */
    const style =
      document.createElement("style");

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

  addStyle();
  addButtons();

  /** @type {MutationObserver} */
  const observer =
    new MutationObserver(() => {
      addButtons();
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
    }
  );
})();