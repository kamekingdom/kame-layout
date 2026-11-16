// Author: kamekingdom (2026-10-06)

/**
 * @param {string} text
 * @returns {string}
 */
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 正規表現置換時に
 *
 * $&
 * $1
 * $2
 * $$
 *
 * などを利用可能にする。
 *
 * @param {string} template
 * @param {RegExpMatchArray} match
 * @param {string} input
 * @returns {string}
 */
export function expandReplacement(template, match, input) {
  const matchIndex = match.index ?? 0;

  return template.replace(
    /\$(\$|&|`|'|\d{1,2})/g,

    (full, token) => {
      if (token === "$") {
        return "$";
      }

      if (token === "&") {
        return match[0];
      }

      if (token === "`") {
        return input.slice(0, matchIndex);
      }

      if (token === "'") {
        return input.slice(matchIndex + match[0].length);
      }

      const index = Number(token);

      if (Number.isInteger(index) && index >= 1 && index < match.length) {
        return match[index] ?? "";
      }

      return full;
    },
  );
}
