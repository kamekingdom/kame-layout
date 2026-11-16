/**
 * @typedef {'collapsed'|'expanded'} FoldState
 */

/**
 * @typedef {{
 *   id?: string,
 *   text?: string
 * }} CosenseLine
 */

/**
 * @typedef {{
 *   state: FoldState
 * }} FoldMarker
 */

/**
 * @typedef {{
 *   element: HTMLElement,
 *   indent: number,
 *   blank: boolean,
 *   marker: FoldMarker | null,
 *   hasChildren: boolean
 * }} FoldLineInfo
 */

/**
 * @typedef {{
 *   indent: number
 * }} ActiveFold
 */

/**
 * @typedef {
 *   Window
 *   & typeof globalThis
 *   & {
 *     __kameHierarchyFoldController?: AbortController
 *   }
 * } KameWindow
 */

export {};
