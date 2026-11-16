/**
 * @typedef {"o" | "v" | "x"} CheckboxState
 *
 * @typedef {Object} CosenseLine
 * @property {string} text
 *
 * @typedef {Object} CosensePage
 * @property {CosenseLine[]=} lines
 * @property {(text: string, index: number) => void} updateLine
 *
 * @typedef {Object} CosenseApi
 * @property {CosensePage} Page
 *
 * @typedef {Window & {
 *   cosense?: CosenseApi,
 *   scrapbox?: CosenseApi,
 *   __checkboxTogglePointerDown__?: EventListener,
 *   __checkboxToggleMouseDown__?: EventListener,
 *   __checkboxToggleClick__?: EventListener
 * }} ExtendedWindow
 */

export {};
