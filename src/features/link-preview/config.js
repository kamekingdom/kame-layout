// Author: kamekingdom (2026-09-08)

/**
 * Hover → Preview表示。
 *
 * @type {number}
 */
export const SHOW_DELAY = 280;

/**
 * Hover解除 → Preview非表示。
 *
 * @type {number}
 */
export const HIDE_DELAY = 220;

/**
 * 本文最大表示行数。
 *
 * @type {number}
 */
export const MAX_LINES = 14;

/**
 * 1-hop最大表示数。
 *
 * @type {number}
 */
export const MAX_1HOP_PAGES = 6;

/**
 * 2-hopのHeadWord最大数。
 *
 * @type {number}
 */
export const MAX_2HOP_GROUPS = 4;

/**
 * HeadWordごとの
 * 2-hopページ最大数。
 *
 * @type {number}
 */
export const MAX_2HOP_PAGES_PER_GROUP = 5;

/**
 * Groupを特定できなかった
 * 2-hopページの最大表示数。
 *
 * @type {number}
 */
export const MAX_UNGROUPED_2HOP_PAGES = 5;

/**
 * PreviewとLinkの距離。
 *
 * @type {number}
 */
export const PREVIEW_GAP = 12;

/**
 * Viewport端との距離。
 *
 * @type {number}
 */
export const VIEWPORT_PADDING = 12;

/**
 * 長すぎる1行を短縮。
 *
 * @type {number}
 */
export const MAX_LINE_LENGTH = 220;
