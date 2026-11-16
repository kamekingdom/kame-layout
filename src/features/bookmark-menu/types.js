/**
 * @typedef {{id: string | number, text?: string}} CosenseLine
 * @typedef {{
 *   lines?: CosenseLine[]
 * }} CosensePage
 * @typedef {{
 *   addItem: (item: {title: string, onClick: () => void}) => void,
 *   removeAllItems: () => void
 * }} CosenseMenu
 * @typedef {{
 *   Page?: CosensePage,
 *   PageMenu: ((
 *     title: string
 *   ) => CosenseMenu) & {
 *     addMenu: (item: {
 *       title: string,
 *       image: string,
 *       onClick: () => void
 *     }) => void
 *   }
 * }} CosenseAPI
 */

export {};
