/**
 * @typedef {number|string|null} SheetValue
 */

/**
 * @typedef {{
 *   ok: true,
 *   value: SheetValue
 * } | {
 *   ok: false,
 *   error: string
 * }} EvalResult
 */

/**
 * @typedef {{
 *   element: HTMLElement,
 *   source: string,
 *   row: number,
 *   col: number
 * }} SheetCell
 */

/**
 * @typedef {
 *   Window
 *   & typeof globalThis
 *   & {
 *     __kameSpreadsheetController?: AbortController
 *   }
 * } KameWindow
 */

/**
 * @typedef {{
 *   type: string,
 *   value: string
 * }} Token
 */

export {};
