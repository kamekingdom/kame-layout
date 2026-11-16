// Author: kamekingdom (2026-09-08)

(() => {

  /* =========================================================
     Types
     ========================================================= */

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


  /* =========================================================
     Initialization
     ========================================================= */

  /** @type {KameWindow} */
  const kameWindow =
    /** @type {KameWindow} */ (window);


  /*
   * UserScript再実行時、
   * 古いイベントを停止。
   */
  if (
    kameWindow.__kameLinkPreview?.controller
  ) {

    kameWindow
      .__kameLinkPreview
      .controller
      .abort();
  }


  /*
   * 古いPreview DOMを削除。
   */
  if (
    kameWindow.__kameLinkPreview?.preview
  ) {

    kameWindow
      .__kameLinkPreview
      .preview
      .remove();
  }


  /** @type {AbortController} */
  const controller =
    new AbortController();


  /** @type {AbortSignal} */
  const signal =
    controller.signal;


  /* =========================================================
     Configuration
     ========================================================= */

  /**
   * Hover → Preview表示。
   *
   * @type {number}
   */
  const SHOW_DELAY =
    280;


  /**
   * Hover解除 → Preview非表示。
   *
   * @type {number}
   */
  const HIDE_DELAY =
    220;


  /**
   * 本文最大表示行数。
   *
   * @type {number}
   */
  const MAX_LINES =
    14;


  /**
   * 1-hop最大表示数。
   *
   * @type {number}
   */
  const MAX_1HOP_PAGES =
    6;


  /**
   * 2-hopのHeadWord最大数。
   *
   * @type {number}
   */
  const MAX_2HOP_GROUPS =
    4;


  /**
   * HeadWordごとの
   * 2-hopページ最大数。
   *
   * @type {number}
   */
  const MAX_2HOP_PAGES_PER_GROUP =
    5;


  /**
   * Groupを特定できなかった
   * 2-hopページの最大表示数。
   *
   * @type {number}
   */
  const MAX_UNGROUPED_2HOP_PAGES =
    5;


  /**
   * PreviewとLinkの距離。
   *
   * @type {number}
   */
  const PREVIEW_GAP =
    12;


  /**
   * Viewport端との距離。
   *
   * @type {number}
   */
  const VIEWPORT_PADDING =
    12;


  /**
   * 長すぎる1行を短縮。
   *
   * @type {number}
   */
  const MAX_LINE_LENGTH =
    220;


  /* =========================================================
     State
     ========================================================= */

  /** @type {HTMLAnchorElement | null} */
  let currentLink =
    null;


  /** @type {string | null} */
  let currentTitle =
    null;


  /** @type {HTMLAnchorElement | null} */
  let pendingLink =
    null;


  /** @type {number | null} */
  let showTimer =
    null;


  /** @type {number | null} */
  let hideTimer =
    null;


  /** @type {number | null} */
  let positionFrame =
    null;


  /**
   * API Cache。
   *
   * @type {Map<string, Promise<CosensePage | null>>}
   */
  const pageCache =
    new Map();


  /* =========================================================
     Preview DOM
     ========================================================= */

  /** @type {HTMLElement} */
  const preview =
    document.createElement(
      'aside'
    );


  preview.id =
    'kame-link-preview';


  /* -------------------------
     Header
     ------------------------- */

  /** @type {HTMLElement} */
  const header =
    document.createElement(
      'div'
    );


  header.className =
    'kame-link-preview-header';


  /** @type {HTMLElement} */
  const titleElement =
    document.createElement(
      'div'
    );


  titleElement.className =
    'kame-link-preview-title';


  header.appendChild(
    titleElement
  );


  /* -------------------------
     Image
     ------------------------- */

  /** @type {HTMLImageElement} */
  const imageElement =
    document.createElement(
      'img'
    );


  imageElement.className =
    'kame-link-preview-image';


  imageElement.alt =
    '';


  imageElement.hidden =
    true;


  /* -------------------------
     Body
     ------------------------- */

  /** @type {HTMLElement} */
  const body =
    document.createElement(
      'div'
    );


  body.className =
    'kame-link-preview-body';


  /* -------------------------
     Footer
     ------------------------- */

  /** @type {HTMLElement} */
  const footer =
    document.createElement(
      'div'
    );


  footer.className =
    'kame-link-preview-footer';


  /** @type {HTMLElement} */
  const metaElement =
    document.createElement(
      'span'
    );


  metaElement.className =
    'kame-link-preview-meta';


  /** @type {HTMLButtonElement} */
  const openButton =
    document.createElement(
      'button'
    );


  openButton.type =
    'button';


  openButton.className =
    'kame-link-preview-open';


  openButton.textContent =
    'Open →';


  footer.appendChild(
    metaElement
  );


  footer.appendChild(
    openButton
  );


  /* -------------------------
     Assemble
     ------------------------- */

  preview.appendChild(
    header
  );


  preview.appendChild(
    imageElement
  );


  preview.appendChild(
    body
  );


  preview.appendChild(
    footer
  );


  document.body.appendChild(
    preview
  );


  kameWindow.__kameLinkPreview = {
    controller,
    preview
  };


  /* =========================================================
     Timer
     ========================================================= */

  /**
   * @param {number | null} timer
   * @returns {void}
   */
  function clearTimer(
    timer
  ) {

    if (
      timer !== null
    ) {

      window.clearTimeout(
        timer
      );
    }
  }


  /**
   * @returns {void}
   */
  function clearAllTimers() {

    clearTimer(
      showTimer
    );


    clearTimer(
      hideTimer
    );


    showTimer =
      null;


    hideTimer =
      null;


    pendingLink =
      null;
  }


  /* =========================================================
     Title Normalize
     ========================================================= */

  /**
   * ScrapboxのtitleLc比較用。
   *
   * @param {string} title
   * @returns {string}
   */
  function normalizeTitle(
    title
  ) {

    return (
      title
        .trim()
        .replace(
          / /g,
          '_'
        )
        .toLowerCase()
    );
  }


  /* =========================================================
     Link Detection
     ========================================================= */

  /**
   * @param {HTMLAnchorElement} link
   * @returns {string | null}
   */
  function getPageTitle(
    link
  ) {

    if (
      link.dataset.pageTitle
    ) {

      return (
        link.dataset.pageTitle
      );
    }


    try {

      /** @type {URL} */
      const url =
        new URL(
          link.href,
          location.origin
        );


      /** @type {string[]} */
      const parts =
        url.pathname
          .split('/')
          .filter(Boolean);


      if (
        parts.length < 2
      ) {

        return null;
      }


      return (
        decodeURIComponent(
          parts
            .slice(1)
            .join('/')
        )
      );

    } catch {

      return null;
    }
  }


  /**
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function isCurrentProjectLink(
    link
  ) {

    try {

      /** @type {URL} */
      const url =
        new URL(
          link.href,
          location.origin
        );


      /** @type {string} */
      const project =
        decodeURIComponent(
          url.pathname
            .split('/')[1] ||
          ''
        );


      return (
        project ===
        scrapbox.Project.name
      );

    } catch {

      return false;
    }
  }


  /**
   * @param {Element | null} target
   * @returns {HTMLAnchorElement | null}
   */
  function getEligibleLink(
    target
  ) {

    if (
      !target
    ) {

      return null;
    }


    /** @type {HTMLAnchorElement | null} */
    const link =
      target.closest(
        '.lines a.page-link:not(.empty-page-link)'
      );


    if (
      !link
    ) {

      return null;
    }


    if (
      !isCurrentProjectLink(
        link
      )
    ) {

      return null;
    }


    return link;
  }


  /* =========================================================
     API
     ========================================================= */

  /**
   * @param {string} title
   * @returns {Promise<CosensePage | null>}
   */
  async function fetchPage(
    title
  ) {

    if (
      pageCache.has(
        title
      )
    ) {

      const cached =
        pageCache.get(
          title
        );


      if (
        cached
      ) {

        return (
          await cached
        );
      }
    }


    /** @type {Promise<CosensePage | null>} */
    const request =
      (async () => {

        try {

          /** @type {string} */
          const endpoint =
            `/api/pages/${
              encodeURIComponent(
                scrapbox.Project.name
              )
            }/${
              encodeURIComponent(
                title
              )
            }`;


          /** @type {Response} */
          const response =
            await fetch(
              endpoint,
              {
                credentials:
                  'same-origin'
              }
            );


          if (
            !response.ok
          ) {

            console.warn(
              '[Kame Link Preview] fetch failed',
              response.status,
              title
            );


            return null;
          }


          /** @type {CosensePage} */
          const page =
            await response.json();


          return page;

        } catch (
          error
        ) {

          console.error(
            '[Kame Link Preview]',
            error
          );


          return null;
        }

      })();


    pageCache.set(
      title,
      request
    );


    return (
      await request
    );
  }


  /* =========================================================
     Indent Parser
     ========================================================= */

  /**
   * tab       = 1階層
   * 全角space = 1階層
   * 半角2個   = 1階層
   *
   * @param {string} source
   * @returns {number}
   */
  function getIndentLevel(
    source
  ) {

    /** @type {RegExpMatchArray | null} */
    const match =
      source.match(
        /^[\t \u3000]*/
      );


    if (
      !match
    ) {

      return 0;
    }


    /** @type {string} */
    const indent =
      match[0];


    /** @type {number} */
    let level =
      0;


    /** @type {number} */
    let halfSpaces =
      0;


    for (
      const character
      of indent
    ) {

      if (
        character === '\t'
      ) {

        level += 1;

        continue;
      }


      if (
        character === '\u3000'
      ) {

        level += 1;

        continue;
      }


      if (
        character === ' '
      ) {

        halfSpaces += 1;


        if (
          halfSpaces === 2
        ) {

          level += 1;

          halfSpaces =
            0;
        }
      }
    }


    if (
      halfSpaces > 0
    ) {

      level += 0.5;
    }


    return (
      Math.min(
        level,
        8
      )
    );
  }


  /* =========================================================
     Text Parser
     ========================================================= */

  /**
   * @param {string} source
   * @returns {string}
   */
  function cleanPreviewText(
    source
  ) {

    /** @type {string} */
    let text =
      source.trim();


    /*
     * [. title]
     */
    text =
      text.replace(
        /^\[\.\s+(.+)\]$/,
        '$1'
      );


    /*
     * [* title]
     */
    text =
      text.replace(
        /^\[\*+\s+(.+)\]$/,
        '$1'
      );


    /*
     * [Page]
     */
    text =
      text.replace(
        /\[([^\[\]]+)\]/g,
        '$1'
      );


    /*
     * `inline code`
     */
    text =
      text.replace(
        /`([^`]+)`/g,
        '$1'
      );


    if (
      text.length >
      MAX_LINE_LENGTH
    ) {

      text =
        `${
          text.slice(
            0,
            MAX_LINE_LENGTH
          )
        }…`;
    }


    return text;
  }


  /**
   * @param {string} raw
   * @returns {ParsedPreviewLine}
   */
  function parsePreviewLine(
    raw
  ) {

    /** @type {number} */
    const indent =
      getIndentLevel(
        raw
      );


    /** @type {string} */
    const content =
      raw.replace(
        /^[\t \u3000]*/,
        ''
      );


    /** @type {string} */
    const trimmed =
      content.trim();


    if (
      trimmed === ''
    ) {

      return {
        text: '',
        indent,
        type: 'blank'
      };
    }


    /** @type {PreviewLineType} */
    let type =
      'normal';


    if (
      /^\[\.\s+.+\]$/.test(
        trimmed
      )
    ) {

      type =
        'section';

    } else if (
      /^\[\*+\s+.+\]$/.test(
        trimmed
      )
    ) {

      type =
        'strong';

    } else if (
      /^\d+[.．]\s*/.test(
        trimmed
      )
    ) {

      type =
        'number';

    } else if (
      /^code:/.test(
        trimmed
      )
    ) {

      type =
        'code';

    } else if (
      /^table:/.test(
        trimmed
      )
    ) {

      type =
        'table';
    }


    return {
      text:
        cleanPreviewText(
          content
        ),

      indent,

      type
    };
  }


  /* =========================================================
     Related Pages Utility
     ========================================================= */

  /**
   * titleで重複除去。
   *
   * @param {CosenseRelatedPage[]} pages
   * @returns {CosenseRelatedPage[]}
   */
  function uniqueRelatedPages(
    pages
  ) {

    /** @type {Set<string>} */
    const used =
      new Set();


    /** @type {CosenseRelatedPage[]} */
    const result =
      [];


    for (
      const page
      of pages
    ) {

      /** @type {string} */
      const key =
        normalizeTitle(
          page.title
        );


      if (
        used.has(
          key
        )
      ) {

        continue;
      }


      used.add(
        key
      );


      result.push(
        page
      );
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
  function createTwoHopGroups(
    page
  ) {

    /** @type {CosenseRelatedPage[]} */
    const links2hop =
      uniqueRelatedPages(
        page
          .relatedPages
          ?.links2hop ||
        []
      );


    /** @type {string[]} */
    const directLinks =
      Array.isArray(
        page.links
      )
        ? page.links
        : [];


    /** @type {Set<string>} */
    const hiddenHeadwords =
      new Set(
        (
          page
            .relatedPages
            ?.hiddenHeadwordsLc ||
          []
        ).map(
          normalizeTitle
        )
      );


    /**
     * normalizeされたHeadWord
     * → 元のタイトル
     *
     * @type {Map<string, string>}
     */
    const headwords =
      new Map();


    for (
      const title
      of directLinks
    ) {

      /** @type {string} */
      const normalized =
        normalizeTitle(
          title
        );


      if (
        hiddenHeadwords.has(
          normalized
        )
      ) {

        continue;
      }


      if (
        !headwords.has(
          normalized
        )
      ) {

        headwords.set(
          normalized,
          title
        );
      }
    }


    /**
     * HeadWord
     * → 2-hop pages
     *
     * @type {Map<string, CosenseRelatedPage[]>}
     */
    const groupMap =
      new Map();


    /** @type {CosenseRelatedPage[]} */
    const ungrouped =
      [];


    for (
      const relatedPage
      of links2hop
    ) {

      /** @type {Set<string>} */
      const relatedLinks =
        new Set(
          (
            relatedPage.linksLc ||
            []
          ).map(
            normalizeTitle
          )
        );


      /** @type {string | null} */
      let foundHeadword =
        null;


      /*
       * page.linksの順番を維持する。
       */
      for (
        const normalizedHeadword
        of headwords.keys()
      ) {

        if (
          relatedLinks.has(
            normalizedHeadword
          )
        ) {

          foundHeadword =
            normalizedHeadword;

          break;
        }
      }


      /*
       * HeadWordを推測できない
       * 2-hop Page。
       */
      if (
        !foundHeadword
      ) {

        ungrouped.push(
          relatedPage
        );

        continue;
      }


      if (
        !groupMap.has(
          foundHeadword
        )
      ) {

        groupMap.set(
          foundHeadword,
          []
        );
      }


      groupMap
        .get(
          foundHeadword
        )
        ?.push(
          relatedPage
        );
    }


    /** @type {TwoHopGroup[]} */
    const groups =
      [];


    for (
      const [
        normalizedHeadword,
        pages
      ]
      of groupMap
    ) {

      /** @type {string} */
      const title =
        headwords.get(
          normalizedHeadword
        ) ||
        normalizedHeadword;


      groups.push({
        title,

        pages:
          uniqueRelatedPages(
            pages
          )
      });


      if (
        groups.length >=
        MAX_2HOP_GROUPS
      ) {

        break;
      }
    }


    return {
      groups,

      ungrouped:
        uniqueRelatedPages(
          ungrouped
        )
    };
  }


  /* =========================================================
     Related Link DOM
     ========================================================= */

  /**
   * Preview内で遷移可能な
   * Page Linkを生成。
   *
   * @param {string} title
   * @param {string} className
   * @returns {HTMLAnchorElement}
   */
  function createRelatedLink(
    title,
    className
  ) {

    /** @type {HTMLAnchorElement} */
    const link =
      document.createElement(
        'a'
      );


    link.className =
      className;


    link.href =
      `/${
        encodeURIComponent(
          scrapbox.Project.name
        )
      }/${
        encodeURIComponent(
          title
        )
      }`;


    link.dataset.pageTitle =
      title;


    link.textContent =
      title;


    return link;
  }


  /* =========================================================
     Related Pages Render
     ========================================================= */

  /**
   * @param {CosensePage} page
   * @returns {void}
   */
  function renderRelatedPages(
    page
  ) {

    /** @type {CosenseRelatedPages | undefined} */
    const relatedPages =
      page.relatedPages;


    if (
      !relatedPages
    ) {

      return;
    }


    /** @type {CosenseRelatedPage[]} */
    const links1hop =
      uniqueRelatedPages(
        relatedPages.links1hop ||
        []
      )
        .filter(
          (
            relatedPage
          ) => {

            return (
              normalizeTitle(
                relatedPage.title
              ) !==
              normalizeTitle(
                page.title ||
                ''
              )
            );
          }
        )
        .slice(
          0,
          MAX_1HOP_PAGES
        );


    const {
      groups,
      ungrouped
    } =
      createTwoHopGroups(
        page
      );


    if (
      links1hop.length === 0 &&
      groups.length === 0 &&
      ungrouped.length === 0
    ) {

      return;
    }


    /* -------------------------
       Container
       ------------------------- */

    /** @type {HTMLElement} */
    const related =
      document.createElement(
        'section'
      );


    related.className =
      'kame-link-preview-related';


    /* -------------------------
       Title
       ------------------------- */

    /** @type {HTMLElement} */
    const relatedHeading =
      document.createElement(
        'div'
      );


    relatedHeading.className =
      'kame-link-preview-related-heading';


    relatedHeading.textContent =
      'RELATED PAGES';


    related.appendChild(
      relatedHeading
    );


    /* =======================================================
       1-hop
       ======================================================= */

    if (
      links1hop.length > 0
    ) {

      /** @type {HTMLElement} */
      const oneHop =
        document.createElement(
          'div'
        );


      oneHop.className =
        'kame-link-preview-related-group is-1hop';


      /** @type {HTMLElement} */
      const label =
        document.createElement(
          'div'
        );


      label.className =
        'kame-link-preview-related-label';


      label.textContent =
        'Links';


      /** @type {HTMLElement} */
      const links =
        document.createElement(
          'div'
        );


      links.className =
        'kame-link-preview-related-links';


      for (
        const relatedPage
        of links1hop
      ) {

        links.appendChild(
          createRelatedLink(
            relatedPage.title,
            'kame-link-preview-related-link'
          )
        );
      }


      oneHop.appendChild(
        label
      );


      oneHop.appendChild(
        links
      );


      related.appendChild(
        oneHop
      );
    }


    /* =======================================================
       2-hop
       ======================================================= */

    for (
      const group
      of groups
    ) {

      /** @type {HTMLElement} */
      const groupElement =
        document.createElement(
          'div'
        );


      groupElement.className =
        'kame-link-preview-related-group is-2hop';


      /* -------------------------
         HeadWord
         ------------------------- */

      /** @type {HTMLElement} */
      const label =
        document.createElement(
          'div'
        );


      label.className =
        'kame-link-preview-related-label';


      /** @type {HTMLAnchorElement} */
      const headwordLink =
        createRelatedLink(
          group.title,
          'kame-link-preview-headword'
        );


      /** @type {HTMLElement} */
      const arrow =
        document.createElement(
          'span'
        );


      arrow.className =
        'kame-link-preview-related-arrow';


      arrow.textContent =
        '→';


      label.appendChild(
        headwordLink
      );


      label.appendChild(
        arrow
      );


      /* -------------------------
         Related Pages
         ------------------------- */

      /** @type {HTMLElement} */
      const links =
        document.createElement(
          'div'
        );


      links.className =
        'kame-link-preview-related-links';


      for (
        const relatedPage
        of group.pages.slice(
          0,
          MAX_2HOP_PAGES_PER_GROUP
        )
      ) {

        links.appendChild(
          createRelatedLink(
            relatedPage.title,
            'kame-link-preview-related-link'
          )
        );
      }


      groupElement.appendChild(
        label
      );


      groupElement.appendChild(
        links
      );


      related.appendChild(
        groupElement
      );
    }


    /* =======================================================
       Ungrouped 2-hop
       ======================================================= */

    if (
      ungrouped.length > 0
    ) {

      /** @type {HTMLElement} */
      const groupElement =
        document.createElement(
          'div'
        );


      groupElement.className =
        'kame-link-preview-related-group is-2hop is-ungrouped';


      /** @type {HTMLElement} */
      const label =
        document.createElement(
          'div'
        );


      label.className =
        'kame-link-preview-related-label';


      label.textContent =
        '2-hop';


      /** @type {HTMLElement} */
      const links =
        document.createElement(
          'div'
        );


      links.className =
        'kame-link-preview-related-links';


      for (
        const relatedPage
        of ungrouped.slice(
          0,
          MAX_UNGROUPED_2HOP_PAGES
        )
      ) {

        links.appendChild(
          createRelatedLink(
            relatedPage.title,
            'kame-link-preview-related-link'
          )
        );
      }


      groupElement.appendChild(
        label
      );


      groupElement.appendChild(
        links
      );


      related.appendChild(
        groupElement
      );
    }


    body.appendChild(
      related
    );
  }


  /* =========================================================
     Loading
     ========================================================= */

  /**
   * @param {string} title
   * @returns {void}
   */
  function renderLoading(
    title
  ) {

    titleElement.textContent =
      title;


    imageElement.hidden =
      true;


    imageElement.removeAttribute(
      'src'
    );


    body.replaceChildren();


    /** @type {HTMLElement} */
    const loading =
      document.createElement(
        'div'
      );


    loading.className =
      'kame-link-preview-loading';


    loading.textContent =
      'Loading…';


    body.appendChild(
      loading
    );


    metaElement.textContent =
      '';
  }


  /* =========================================================
     Render Page
     ========================================================= */

  /**
   * @param {CosensePage} page
   * @param {string} requestedTitle
   * @returns {void}
   */
  function renderPage(
    page,
    requestedTitle
  ) {

    /** @type {string} */
    const pageTitle =
      page.title ||
      requestedTitle;


    titleElement.textContent =
      pageTitle;


    /* =======================================================
       Image
       ======================================================= */

    if (
      page.image
    ) {

      imageElement.src =
        page.image;


      imageElement.alt =
        pageTitle;


      imageElement.hidden =
        false;

    } else {

      imageElement.hidden =
        true;


      imageElement.removeAttribute(
        'src'
      );
    }


    /* =======================================================
       Body
       ======================================================= */

    body.replaceChildren();


    /** @type {CosenseLine[]} */
    const lines =
      Array.isArray(
        page.lines
      )
        ? page.lines
        : [];


    /** @type {number} */
    let visibleCount =
      0;


    /** @type {boolean} */
    let previousWasBlank =
      false;


    for (
      let index = 0;
      index < lines.length;
      index++
    ) {

      /** @type {string} */
      const raw =
        lines[index]?.text ||
        '';


      /*
       * Page title行は除外。
       */
      if (
        index === 0 &&
        raw.trim() ===
        pageTitle
      ) {

        continue;
      }


      /** @type {ParsedPreviewLine} */
      const parsed =
        parsePreviewLine(
          raw
        );


      /* -------------------------------------------------------
         Blank
         ------------------------------------------------------- */

      if (
        parsed.type ===
        'blank'
      ) {

        if (
          visibleCount === 0
        ) {

          continue;
        }


        if (
          previousWasBlank
        ) {

          continue;
        }


        /** @type {HTMLElement} */
        const blank =
          document.createElement(
            'div'
          );


        blank.className =
          'kame-link-preview-line is-blank';


        body.appendChild(
          blank
        );


        previousWasBlank =
          true;


        continue;
      }


      previousWasBlank =
        false;


      /* -------------------------------------------------------
         Normal Line
         ------------------------------------------------------- */

      /** @type {HTMLElement} */
      const row =
        document.createElement(
          'div'
        );


      row.className =
        `kame-link-preview-line type-${parsed.type}`;


      row.style.setProperty(
        '--preview-indent',
        String(
          parsed.indent
        )
      );


      if (
        parsed.indent > 0
      ) {

        row.dataset.indented =
          'true';
      }


      row.textContent =
        parsed.text;


      body.appendChild(
        row
      );


      visibleCount++;


      if (
        visibleCount >=
        MAX_LINES
      ) {

        break;
      }
    }


    /* =======================================================
       Empty
       ======================================================= */

    if (
      visibleCount === 0
    ) {

      /** @type {HTMLElement} */
      const empty =
        document.createElement(
          'div'
        );


      empty.className =
        'kame-link-preview-empty';


      empty.textContent =
        '本文プレビューなし';


      body.appendChild(
        empty
      );
    }


    /* =======================================================
       Related Pages
       ======================================================= */

    renderRelatedPages(
      page
    );


    /* =======================================================
       Metadata
       ======================================================= */

    metaElement.textContent =
      `${
        page.linesCount ??
        lines.length
      } lines`;
  }


  /* =========================================================
     Position
     ========================================================= */

  /**
   * @param {HTMLAnchorElement} link
   * @returns {void}
   */
  function positionPreview(
    link
  ) {

    /*
     * SPA遷移などで
     * 元Linkが消えている場合。
     */
    if (
      !link.isConnected
    ) {

      hidePreview();

      return;
    }


    /** @type {DOMRect} */
    const linkRect =
      link.getBoundingClientRect();


    /** @type {DOMRect} */
    const previewRect =
      preview.getBoundingClientRect();


    /* -------------------------
       X
       ------------------------- */

    /** @type {number} */
    let left =
      linkRect.right +
      PREVIEW_GAP;


    if (
      left +
      previewRect.width >
      window.innerWidth -
      VIEWPORT_PADDING
    ) {

      left =
        linkRect.left -
        previewRect.width -
        PREVIEW_GAP;
    }


    left =
      Math.max(
        VIEWPORT_PADDING,
        left
      );


    /* -------------------------
       Y
       ------------------------- */

    /** @type {number} */
    let top =
      linkRect.top -
      8;


    if (
      top +
      previewRect.height >
      window.innerHeight -
      VIEWPORT_PADDING
    ) {

      top =
        window.innerHeight -
        previewRect.height -
        VIEWPORT_PADDING;
    }


    top =
      Math.max(
        VIEWPORT_PADDING,
        top
      );


    preview.style.left =
      `${Math.round(
        left
      )}px`;


    preview.style.top =
      `${Math.round(
        top
      )}px`;
  }


  /**
   * @returns {void}
   */
  function queuePosition() {

    if (
      !currentLink
    ) {

      return;
    }


    if (
      !currentLink.isConnected
    ) {

      hidePreview();

      return;
    }


    if (
      positionFrame !== null
    ) {

      window.cancelAnimationFrame(
        positionFrame
      );
    }


    positionFrame =
      window.requestAnimationFrame(
        () => {

          positionFrame =
            null;


          if (
            currentLink
          ) {

            positionPreview(
              currentLink
            );
          }
        }
      );
  }


  /* =========================================================
     Show
     ========================================================= */

  /**
   * @param {HTMLAnchorElement} link
   * @returns {Promise<void>}
   */
  async function showPreview(
    link
  ) {

    /** @type {string | null} */
    const title =
      getPageTitle(
        link
      );


    if (
      !title
    ) {

      return;
    }


    currentLink
      ?.classList
      .remove(
        'kame-link-preview-source'
      );


    currentLink =
      link;


    currentTitle =
      title;


    link.classList.add(
      'kame-link-preview-source'
    );


    renderLoading(
      title
    );


    preview.classList.add(
      'is-visible'
    );


    window.requestAnimationFrame(
      () => {

        positionPreview(
          link
        );
      }
    );


    /** @type {CosensePage | null} */
    const page =
      await fetchPage(
        title
      );


    /*
     * ページ遷移済み。
     */
    if (
      !link.isConnected
    ) {

      hidePreview();

      return;
    }


    /*
     * API待ち中に別Linkへ
     * Hoverした場合。
     */
    if (
      currentLink !==
        link ||
      currentTitle !==
        title
    ) {

      return;
    }


    if (
      !page
    ) {

      body.replaceChildren();


      /** @type {HTMLElement} */
      const error =
        document.createElement(
          'div'
        );


      error.className =
        'kame-link-preview-error';


      error.textContent =
        'Previewを取得できませんでした。';


      body.appendChild(
        error
      );


      return;
    }


    renderPage(
      page,
      title
    );


    window.requestAnimationFrame(
      () => {

        if (
          currentLink ===
          link &&
          link.isConnected
        ) {

          positionPreview(
            link
          );
        }
      }
    );
  }


  /* =========================================================
     Hide
     ========================================================= */

  /**
   * @returns {void}
   */
  function hidePreview() {

    preview.classList.remove(
      'is-visible'
    );


    currentLink
      ?.classList
      .remove(
        'kame-link-preview-source'
      );


    currentLink =
      null;


    currentTitle =
      null;


    pendingLink =
      null;
  }


  /**
   * ページ遷移時などに
   * 完全に閉じる。
   *
   * @returns {void}
   */
  function forceHidePreview() {

    clearAllTimers();


    if (
      positionFrame !== null
    ) {

      window.cancelAnimationFrame(
        positionFrame
      );


      positionFrame =
        null;
    }


    hidePreview();
  }


  /* =========================================================
     Schedule
     ========================================================= */

  /**
   * @param {HTMLAnchorElement} link
   * @returns {void}
   */
  function scheduleShow(
    link
  ) {

    clearTimer(
      showTimer
    );


    clearTimer(
      hideTimer
    );


    pendingLink =
      link;


    showTimer =
      window.setTimeout(
        () => {

          showTimer =
            null;


          if (
            pendingLink ===
            link
          ) {

            void showPreview(
              link
            );
          }

        },
        SHOW_DELAY
      );
  }


  /**
   * @returns {void}
   */
  function scheduleHide() {

    clearTimer(
      showTimer
    );


    clearTimer(
      hideTimer
    );


    pendingLink =
      null;


    hideTimer =
      window.setTimeout(
        () => {

          hideTimer =
            null;


          hidePreview();

        },
        HIDE_DELAY
      );
  }


  /**
   * @returns {void}
   */
  function cancelHide() {

    clearTimer(
      hideTimer
    );


    hideTimer =
      null;
  }


  /* =========================================================
     Page Link Hover
     ========================================================= */

  document.addEventListener(
    'mouseover',

    /**
     * @param {MouseEvent} event
     * @returns {void}
     */
    (event) => {

      /** @type {Element | null} */
      const target =
        event.target instanceof Element
          ? event.target
          : null;


      /** @type {HTMLAnchorElement | null} */
      const link =
        getEligibleLink(
          target
        );


      if (
        !link
      ) {

        return;
      }


      /*
       * Link内のspan間移動。
       */
      if (
        event.relatedTarget
          instanceof Node &&
        link.contains(
          event.relatedTarget
        )
      ) {

        return;
      }


      if (
        link ===
        currentLink
      ) {

        cancelHide();

        return;
      }


      scheduleShow(
        link
      );
    },

    {
      signal
    }
  );


  /* =========================================================
     Page Link Mouse Out
     ========================================================= */

  document.addEventListener(
    'mouseout',

    /**
     * @param {MouseEvent} event
     * @returns {void}
     */
    (event) => {

      /** @type {Element | null} */
      const target =
        event.target instanceof Element
          ? event.target
          : null;


      if (
        !target
      ) {

        return;
      }


      /** @type {HTMLAnchorElement | null} */
      const link =
        target.closest(
          '.lines a.page-link'
        );


      if (
        !link
      ) {

        return;
      }


      if (
        event.relatedTarget
          instanceof Node &&
        link.contains(
          event.relatedTarget
        )
      ) {

        return;
      }


      if (
        link ===
        currentLink ||
        link ===
        pendingLink
      ) {

        scheduleHide();
      }
    },

    {
      signal
    }
  );


  /* =========================================================
     Page Link Click
     ========================================================= */

  /*
   * Cosense側のSPA遷移前に
   * Previewを即座に閉じる。
   */
  document.addEventListener(
    'click',

    /**
     * @param {MouseEvent} event
     * @returns {void}
     */
    (event) => {

      /** @type {Element | null} */
      const target =
        event.target instanceof Element
          ? event.target
          : null;


      if (
        !target
      ) {

        return;
      }


      /** @type {HTMLAnchorElement | null} */
      const link =
        target.closest(
          '.lines a.page-link'
        );


      if (
        !link
      ) {

        return;
      }


      forceHidePreview();
    },

    {
      signal,
      capture: true
    }
  );


  /* =========================================================
     Preview Hover
     ========================================================= */

  preview.addEventListener(
    'mouseenter',

    () => {

      cancelHide();
    },

    {
      signal
    }
  );


  preview.addEventListener(
    'mouseleave',

    () => {

      scheduleHide();
    },

    {
      signal
    }
  );


  /* =========================================================
     Related Page Click
     ========================================================= */

  /*
   * Preview内部の
   * 1-hop / 2-hopリンクも
   * そのままPage遷移できる。
   */
  preview.addEventListener(
    'click',

    /**
     * @param {MouseEvent} event
     * @returns {void}
     */
    (event) => {

      /** @type {Element | null} */
      const target =
        event.target instanceof Element
          ? event.target
          : null;


      if (
        !target
      ) {

        return;
      }


      /** @type {HTMLAnchorElement | null} */
      const link =
        target.closest(
          '.kame-link-preview-related-link, .kame-link-preview-headword'
        );


      if (
        !link
      ) {

        return;
      }


      /** @type {string | undefined} */
      const title =
        link.dataset.pageTitle;


      if (
        !title
      ) {

        return;
      }


      event.preventDefault();
      event.stopPropagation();


      forceHidePreview();


      void scrapbox.Page.show(
        title
      );
    },

    {
      signal
    }
  );


  /* =========================================================
     Open Button
     ========================================================= */

  openButton.addEventListener(
    'click',

    () => {

      if (
        !currentTitle
      ) {

        return;
      }


      /** @type {string} */
      const title =
        currentTitle;


      forceHidePreview();


      void scrapbox.Page.show(
        title
      );
    },

    {
      signal
    }
  );


  /* =========================================================
     Browser Navigation
     ========================================================= */

  window.addEventListener(
    'popstate',

    () => {

      forceHidePreview();
    },

    {
      signal
    }
  );


  window.addEventListener(
    'hashchange',

    () => {

      forceHidePreview();
    },

    {
      signal
    }
  );


  /* =========================================================
     Position Update
     ========================================================= */

  window.addEventListener(
    'resize',

    queuePosition,

    {
      signal
    }
  );


  document.addEventListener(
    'scroll',

    queuePosition,

    {
      signal,
      capture: true
    }
  );


  /* =========================================================
     Debug
     ========================================================= */

  console.log(
    '[Kame Link Preview] loaded'
  );

})();