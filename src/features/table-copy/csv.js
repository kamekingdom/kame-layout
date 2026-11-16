// # Author: kamekingdom (2026-08-24)

/**
 * CSV文字列を2次元配列に変換する
 * ダブルクォート、カンマ、セル内改行に対応
 *
 * @param {string} csv
 * @returns {string[][]}
 */
export const parseCSV = (csv) => {
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

      if (row.some((value) => value.length > 0)) {
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

    if (row.some((value) => value.length > 0)) {
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
export const csvToTSV = (csv) => {
  /** @type {string[][]} */
  const rows = parseCSV(csv);

  return rows
    .map((row) =>
      row
        .map((cell) =>
          // TSV内で崩れないようにタブだけ空白へ
          cell.replace(/\t/g, " "),
        )
        .join("\t"),
    )
    .join("\n");
};
