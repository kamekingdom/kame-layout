/** @typedef {import("./types.js").CheckboxState} CheckboxState */

// # Author: kamekingdom (2026-07-10)

/**
 * チェックボックスの状態遷移です。
 *
 * [o] → [v]
 * [v] → [o]
 * [x] → [o]
 */
export const nextStateMap = /** @type {Readonly<Record<CheckboxState, CheckboxState>>} */ ({
  o: "v",
  v: "o",
  x: "o",
});

/**
 * 指定されたチェックボックスのみを書き換えます。
 *
 * @param {string} lineText
 * @param {number} targetOrdinal
 * @returns {string | null}
 */
export const replaceCheckbox = (lineText, targetOrdinal) => {
  let currentOrdinal = -1;
  let replaced = false;

  const updatedText = lineText.replace(/\[([ovx])\]/gi, (matchedText, rawState) => {
    currentOrdinal += 1;

    if (currentOrdinal !== targetOrdinal) {
      return matchedText;
    }

    const currentState = /** @type {CheckboxState} */ (String(rawState).toLowerCase());

    const nextState = nextStateMap[currentState];

    if (!nextState) {
      return matchedText;
    }

    replaced = true;
    return `[${nextState}]`;
  });

  return replaced ? updatedText : null;
};
