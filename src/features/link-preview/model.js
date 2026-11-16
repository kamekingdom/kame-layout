/** @typedef {import("./types.js").CosenseRelatedPage} CosenseRelatedPage */
/** @typedef {import("./types.js").CosensePage} CosensePage */
/** @typedef {import("./types.js").PreviewLineType} PreviewLineType */
/** @typedef {import("./types.js").ParsedPreviewLine} ParsedPreviewLine */
/** @typedef {import("./types.js").TwoHopGroup} TwoHopGroup */

// Author: kamekingdom (2026-09-08)

import { MAX_LINE_LENGTH, MAX_2HOP_GROUPS } from "./config.js";

/**
 * ScrapboxのtitleLc比較用。
 *
 * @param {string} title
 * @returns {string}
 */
export function normalizeTitle(title) {
  return title.trim().replace(/ /g, "_").toLowerCase();
}

/**
 * tab       = 1階層
 * 全角space = 1階層
 * 半角2個   = 1階層
 *
 * @param {string} source
 * @returns {number}
 */
export function getIndentLevel(source) {
  /** @type {RegExpMatchArray | null} */
  const match = source.match(/^[\t \u3000]*/);

  if (!match) {
    return 0;
  }

  /** @type {string} */
  const indent = match[0];

  /** @type {number} */
  let level = 0;

  /** @type {number} */
  let halfSpaces = 0;

  for (const character of indent) {
    if (character === "\t") {
      level += 1;

      continue;
    }

    if (character === "\u3000") {
      level += 1;

      continue;
    }

    if (character === " ") {
      halfSpaces += 1;

      if (halfSpaces === 2) {
        level += 1;

        halfSpaces = 0;
      }
    }
  }

  if (halfSpaces > 0) {
    level += 0.5;
  }

  return Math.min(level, 8);
}

/**
 * @param {string} source
 * @returns {string}
 */
export function cleanPreviewText(source) {
  /** @type {string} */
  let text = source.trim();

  /*
   * [. title]
   */
  text = text.replace(/^\[\.\s+(.+)\]$/, "$1");

  /*
   * [* title]
   */
  text = text.replace(/^\[\*+\s+(.+)\]$/, "$1");

  /*
   * [Page]
   */
  text = text.replace(/\[([^\[\]]+)\]/g, "$1");

  /*
   * `inline code`
   */
  text = text.replace(/`([^`]+)`/g, "$1");

  if (text.length > MAX_LINE_LENGTH) {
    text = `${text.slice(0, MAX_LINE_LENGTH)}…`;
  }

  return text;
}

/**
 * @param {string} raw
 * @returns {ParsedPreviewLine}
 */
export function parsePreviewLine(raw) {
  /** @type {number} */
  const indent = getIndentLevel(raw);

  /** @type {string} */
  const content = raw.replace(/^[\t \u3000]*/, "");

  /** @type {string} */
  const trimmed = content.trim();

  if (trimmed === "") {
    return {
      text: "",
      indent,
      type: "blank",
    };
  }

  /** @type {PreviewLineType} */
  let type = "normal";

  if (/^\[\.\s+.+\]$/.test(trimmed)) {
    type = "section";
  } else if (/^\[\*+\s+.+\]$/.test(trimmed)) {
    type = "strong";
  } else if (/^\d+[.．]\s*/.test(trimmed)) {
    type = "number";
  } else if (/^code:/.test(trimmed)) {
    type = "code";
  } else if (/^table:/.test(trimmed)) {
    type = "table";
  }

  return {
    text: cleanPreviewText(content),

    indent,

    type,
  };
}

/**
 * titleで重複除去。
 *
 * @param {CosenseRelatedPage[]} pages
 * @returns {CosenseRelatedPage[]}
 */
export function uniqueRelatedPages(pages) {
  /** @type {Set<string>} */
  const used = new Set();

  /** @type {CosenseRelatedPage[]} */
  const result = [];

  for (const page of pages) {
    /** @type {string} */
    const key = normalizeTitle(page.title);

    if (used.has(key)) {
      continue;
    }

    used.add(key);

    result.push(page);
  }

  return result;
}

/**
 * 2-hopをScrapbox下部と同じように
 * HeadWord単位にまとめる。
 *
 * Current Page
 *   ↓
 * HeadWord
 *   ↓
 * Related Page
 *
 * @param {CosensePage} page
 * @returns {{
 *   groups: TwoHopGroup[],
 *   ungrouped: CosenseRelatedPage[]
 * }}
 */
export function createTwoHopGroups(page) {
  /** @type {CosenseRelatedPage[]} */
  const links2hop = uniqueRelatedPages(page.relatedPages?.links2hop || []);

  /** @type {string[]} */
  const directLinks = Array.isArray(page.links) ? page.links : [];

  /** @type {Set<string>} */
  const hiddenHeadwords = new Set((page.relatedPages?.hiddenHeadwordsLc || []).map(normalizeTitle));

  /**
   * normalizeされたHeadWord
   * → 元のタイトル
   *
   * @type {Map<string, string>}
   */
  const headwords = new Map();

  for (const title of directLinks) {
    /** @type {string} */
    const normalized = normalizeTitle(title);

    if (hiddenHeadwords.has(normalized)) {
      continue;
    }

    if (!headwords.has(normalized)) {
      headwords.set(normalized, title);
    }
  }

  /**
   * HeadWord
   * → 2-hop pages
   *
   * @type {Map<string, CosenseRelatedPage[]>}
   */
  const groupMap = new Map();

  /** @type {CosenseRelatedPage[]} */
  const ungrouped = [];

  for (const relatedPage of links2hop) {
    /** @type {Set<string>} */
    const relatedLinks = new Set((relatedPage.linksLc || []).map(normalizeTitle));

    /** @type {string | null} */
    let foundHeadword = null;

    /*
     * page.linksの順番を維持する。
     */
    for (const normalizedHeadword of headwords.keys()) {
      if (relatedLinks.has(normalizedHeadword)) {
        foundHeadword = normalizedHeadword;

        break;
      }
    }

    /*
     * HeadWordを推測できない
     * 2-hop Page。
     */
    if (!foundHeadword) {
      ungrouped.push(relatedPage);

      continue;
    }

    if (!groupMap.has(foundHeadword)) {
      groupMap.set(foundHeadword, []);
    }

    groupMap.get(foundHeadword)?.push(relatedPage);
  }

  /** @type {TwoHopGroup[]} */
  const groups = [];

  for (const [normalizedHeadword, pages] of groupMap) {
    /** @type {string} */
    const title = headwords.get(normalizedHeadword) || normalizedHeadword;

    groups.push({
      title,

      pages: uniqueRelatedPages(pages),
    });

    if (groups.length >= MAX_2HOP_GROUPS) {
      break;
    }
  }

  return {
    groups,

    ungrouped: uniqueRelatedPages(ungrouped),
  };
}
