/** @typedef {import("./types.js").FoldLineInfo} FoldLineInfo */
/** @typedef {import("./types.js").ActiveFold} ActiveFold */

// Author: kamekingdom (2026-09-29)

/**
 * Fold状態を反映。
 *
 * Fold範囲:
 *
 * ・親より深いindentが続く間
 * ・空行まで
 *
 * 空行自体は絶対に隠さない。
 *
 * @param {FoldLineInfo[]} infos
 * @returns {void}
 */
export function applyVisibility(infos) {
  /** @type {ActiveFold[]} */
  const activeFolds = [];

  for (const info of infos) {
    const { element, indent, blank, marker, hasChildren } = info;

    // Blank

    if (blank) {
      /*
       * 空行は表示。
       */
      element.classList.remove("kame-fold-hidden");

      /*
       * 空行でFold blockを終了。
       */
      activeFolds.length = 0;

      continue;
    }

    // End Fold

    /*
     * 同じ階層または
     * 浅い階層へ戻ったらFold終了。
     */
    while (activeFolds.length > 0) {
      const latest = activeFolds[activeFolds.length - 1];

      if (indent > latest.indent) {
        break;
      }

      activeFolds.pop();
    }

    // Hidden

    /** @type {boolean} */
    const hidden = activeFolds.length > 0;

    element.classList.toggle("kame-fold-hidden", hidden);

    /*
     * 親に隠れている場合は
     * 子のFoldを開始しない。
     */
    if (hidden) {
      continue;
    }

    // Start Fold

    if (marker?.state === "collapsed" && hasChildren) {
      activeFolds.push({
        indent,
      });
    }
  }
}

/**
 * Toggle自身によるDOM変更か。
 *
 * @param {MutationRecord} mutation
 * @returns {boolean}
 */
export function isOwnToggleMutation(mutation) {
  const target = mutation.target;

  /*
   * Toggle内部。
   */
  if (target instanceof Element && target.closest(".kame-fold-toggle")) {
    return true;
  }

  if (target.parentElement?.closest(".kame-fold-toggle")) {
    return true;
  }

  /*
   * Toggleそのものの追加・削除。
   */
  const nodes = [...mutation.addedNodes, ...mutation.removedNodes];

  if (nodes.length === 0) {
    return false;
  }

  return nodes.every((node) => {
    return node instanceof HTMLElement && node.classList.contains("kame-fold-toggle");
  });
}
