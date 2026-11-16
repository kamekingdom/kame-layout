/**
 * @typedef {{
 *   text?: string
 * }} CosenseLine
 */

/**
 * 関連ページAPIの1ページ分。
 *
 * @typedef {{
 *   id?: string,
 *   title: string,
 *   titleLc?: string,
 *   image?: string | null,
 *   descriptions?: string[],
 *   linksLc?: string[],
 *   linked?: number,
 *   updated?: number,
 *   accessed?: number
 * }} CosenseRelatedPage
 */

/**
 * @typedef {{
 *   links1hop?: CosenseRelatedPage[],
 *   links2hop?: CosenseRelatedPage[],
 *   hiddenHeadwordsLc?: string[],
 *   fatHeadwordsLc?: string[],
 *   hasBackLinksOrIcons?: boolean
 * }} CosenseRelatedPages
 */

/**
 * @typedef {{
 *   title?: string,
 *   image?: string | null,
 *   lines?: CosenseLine[],
 *   linesCount?: number,
 *   links?: string[],
 *   relatedPages?: CosenseRelatedPages
 * }} CosensePage
 */

/**
 * @typedef {
 *   'normal'
 *   | 'section'
 *   | 'strong'
 *   | 'number'
 *   | 'code'
 *   | 'table'
 *   | 'blank'
 * } PreviewLineType
 */

/**
 * @typedef {{
 *   text: string,
 *   indent: number,
 *   type: PreviewLineType
 * }} ParsedPreviewLine
 */

/**
 * @typedef {{
 *   title: string,
 *   pages: CosenseRelatedPage[]
 * }} TwoHopGroup
 */

/**
 * @typedef {{
 *   controller?: AbortController,
 *   preview?: HTMLElement
 * }} KameLinkPreviewState
 */

/**
 * @typedef {
 *   Window
 *   & typeof globalThis
 *   & {
 *     __kameLinkPreview?: KameLinkPreviewState
 *   }
 * } KameWindow
 */

export {};
