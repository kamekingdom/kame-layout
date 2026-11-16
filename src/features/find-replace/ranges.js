// Author: kamekingdom (2026-10-06)

/**
 * @param {HTMLElement} line
 * @returns {{
 *   text: string,
 *   segments: {
 *     node: Text,
 *     start: number,
 *     end: number
 *   }[]
 * }}
 */
export function collectTextSegments(line) {
  const root = /** @type {HTMLElement | null} */ (line.querySelector(".text"));

  if (!root) {
    return {
      text: "",
      segments: [],
    };
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  /** @type {{
   *   node: Text,
   *   start: number,
   *   end: number
   * }[]}
   */
  const segments = [];

  let text = "";

  /** @type {Text | null} */
  let node = /** @type {Text | null} */ (walker.nextNode());

  while (node) {
    const parent = node.parentElement;

    if (parent && !parent.closest(".kame-replace-extra")) {
      const value = node.data;

      const start = text.length;

      text += value;

      segments.push({
        node,
        start,
        end: start + value.length,
      });
    }

    node = /** @type {Text | null} */ (walker.nextNode());
  }

  return {
    text,
    segments,
  };
}

/**
 * @param {{
 *   node: Text,
 *   start: number,
 *   end: number
 * }[]} segments
 * @param {number} index
 * @param {boolean} endBoundary
 * @returns {{node: Text, offset: number} | null}
 */
export function findBoundary(segments, index, endBoundary) {
  for (const segment of segments) {
    if (!endBoundary && index >= segment.start && index < segment.end) {
      return {
        node: segment.node,

        offset: index - segment.start,
      };
    }

    if (endBoundary && index > segment.start && index <= segment.end) {
      return {
        node: segment.node,

        offset: index - segment.start,
      };
    }
  }

  return null;
}

/**
 * @param {{
 *   node: Text,
 *   start: number,
 *   end: number
 * }[]} segments
 * @param {number} start
 * @param {number} end
 * @returns {Range | null}
 */
export function makeRange(segments, start, end) {
  if (end <= start) {
    return null;
  }

  const startPoint = findBoundary(segments, start, false);

  const endPoint = findBoundary(segments, end, true);

  if (!startPoint || !endPoint) {
    return null;
  }

  const range = document.createRange();

  range.setStart(startPoint.node, startPoint.offset);

  range.setEnd(endPoint.node, endPoint.offset);

  return range;
}
