/**
 * @typedef {{
 *   id?: string,
 *   text?: string
 * }} CosenseLine
 */

/**
 * @typedef {{
 *   caseSensitive: boolean,
 *   wholeWord: boolean,
 *   regex: boolean
 * }} SearchOptions
 */

/**
 * @typedef {{
 *   range: Range,
 *   line: HTMLElement,
 *   lineIndex: number,
 *   ordinalInLine: number,
 *   text: string
 * }} SearchMatch
 */

/**
 * @typedef {{
 *   form: HTMLElement,
 *   input: HTMLInputElement,
 *   result: HTMLElement,
 *   prevButton: HTMLButtonElement | null,
 *   nextButton: HTMLButtonElement | null,
 *   closeButton: HTMLButtonElement | null,
 *   replaceInput: HTMLInputElement,
 *   replaceButton: HTMLButtonElement,
 *   replaceAllButton: HTMLButtonElement,
 *   caseButton: HTMLButtonElement,
 *   wordButton: HTMLButtonElement,
 *   regexButton: HTMLButtonElement,
 *   status: HTMLElement,
 *   controller: AbortController
 * }} ReplaceUI
 */

/**
 * @typedef {
 *   Window
 *   & typeof globalThis
 *   & {
 *     __kameReplaceController?: AbortController
 *   }
 * } KameWindow
 */

export {};
