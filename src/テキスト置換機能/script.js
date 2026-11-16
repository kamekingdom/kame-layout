// Author: kamekingdom (2026-10-06)

(() => {
  /* =========================================================
     Types
     ========================================================= */

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


  /* =========================================================
     API
     ========================================================= */

  const api =
    window.cosense ??
    window.scrapbox;


  if (
    !api?.Page
  ) {
    console.warn(
      '[Kame Replace] Cosense API not found'
    );

    return;
  }


  /* =========================================================
     Initialization
     ========================================================= */

  /** @type {KameWindow} */
  const kameWindow =
    /** @type {KameWindow} */ (
      window
    );


  if (
    kameWindow.__kameReplaceController
  ) {
    kameWindow
      .__kameReplaceController
      .abort();
  }


  const controller =
    new AbortController();


  const signal =
    controller.signal;


  kameWindow.__kameReplaceController =
    controller;


  /* =========================================================
     State
     ========================================================= */

  /** @type {ReplaceUI | null} */
  let activeUI =
    null;


  /** @type {SearchMatch[]} */
  let matches =
    [];


  let currentMatchIndex =
    -1;


  let replaceRequested =
    false;


  /** @type {MutationObserver | null} */
  let observer =
    null;


  /** @type {number | null} */
  let refreshFrame =
    null;


  /** @type {SearchOptions} */
  const options = {
    caseSensitive: false,
    wholeWord: false,
    regex: false
  };


  /* =========================================================
     Highlight API
     ========================================================= */

  const HIGHLIGHT_ALL =
    'kame-search-match';


  const HIGHLIGHT_CURRENT =
    'kame-search-current';


  /**
   * @returns {boolean}
   */
  function supportsHighlightAPI() {
    return (
      'highlights' in CSS &&
      typeof Highlight !==
        'undefined'
    );
  }


  /**
   * @returns {void}
   */
  function clearHighlights() {
    if (
      supportsHighlightAPI()
    ) {
      CSS.highlights.delete(
        HIGHLIGHT_ALL
      );

      CSS.highlights.delete(
        HIGHLIGHT_CURRENT
      );
    }


    document
      .querySelectorAll(
        '.kame-search-fallback-match, .kame-search-fallback-current'
      )
      .forEach(
        element => {
          element.classList.remove(
            'kame-search-fallback-match',
            'kame-search-fallback-current'
          );
        }
      );
  }


  /* =========================================================
     Page Lines
     ========================================================= */

  /**
   * @returns {CosenseLine[]}
   */
  function getPageLines() {
    if (
      !Array.isArray(
        api.Page.lines
      )
    ) {
      return [];
    }


    return (
      /** @type {CosenseLine[]} */ (
        api.Page.lines
      )
    );
  }


  /**
   * @param {HTMLElement} lineElement
   * @returns {number}
   */
  function findPageLineIndex(
    lineElement
  ) {
    const pageLines =
      getPageLines();


    const domId =
      lineElement.id ??
      '';


    const normalizedId =
      domId.startsWith(
        'L'
      )
        ? domId.slice(1)
        : domId;


    const idIndex =
      pageLines.findIndex(
        line => {
          if (
            !line.id
          ) {
            return false;
          }


          return (
            line.id === domId ||
            line.id === normalizedId ||
            `L${line.id}` === domId
          );
        }
      );


    if (
      idIndex >=
      0
    ) {
      return idIndex;
    }


    const domLines =
      Array.from(
        document.querySelectorAll(
          '.lines > .line'
        )
      );


    return (
      domLines.indexOf(
        lineElement
      )
    );
  }


  /* =========================================================
     Regex
     ========================================================= */

  /**
   * @param {string} text
   * @returns {string}
   */
  function escapeRegex(
    text
  ) {
    return (
      text.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      )
    );
  }


  /**
   * @param {string} search
   * @param {boolean} global
   * @returns {RegExp | null}
   */
  function buildRegex(
    search,
    global = true
  ) {
    if (
      search ===
      ''
    ) {
      return null;
    }


    let source =
      options.regex
        ? search
        : escapeRegex(
            search
          );


    /*
     * Unicode単語単位。
     *
     * 英数字だけでなく、
     * 日本語等のUnicode文字も考慮。
     */
    if (
      options.wholeWord
    ) {
      source =
        `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`;
    }


    let flags =
      global
        ? 'gu'
        : 'u';


    if (
      !options.caseSensitive
    ) {
      flags +=
        'i';
    }


    try {
      return (
        new RegExp(
          source,
          flags
        )
      );

    } catch {
      return null;
    }
  }


  /* =========================================================
     Text Nodes → Range
     ========================================================= */

  /**
   * @param {HTMLElement} line
   * @returns {{
   *   text: string,
   *   segments: {
   *     node: Text,
   *     start: number,
   *     end: number
   *   }[]
   * }}
   */
  function collectTextSegments(
    line
  ) {
    const root =
      /** @type {HTMLElement | null} */ (
        line.querySelector(
          '.text'
        )
      );


    if (
      !root
    ) {
      return {
        text: '',
        segments: []
      };
    }


    const walker =
      document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT
      );


    /** @type {{
     *   node: Text,
     *   start: number,
     *   end: number
     * }[]}
     */
    const segments =
      [];


    let text =
      '';


    /** @type {Text | null} */
    let node =
      /** @type {Text | null} */ (
        walker.nextNode()
      );


    while (
      node
    ) {
      const parent =
        node.parentElement;


      if (
        parent &&
        !parent.closest(
          '.kame-replace-extra'
        )
      ) {
        const value =
          node.data;


        const start =
          text.length;


        text +=
          value;


        segments.push({
          node,
          start,
          end:
            start +
            value.length
        });
      }


      node =
        /** @type {Text | null} */ (
          walker.nextNode()
        );
    }


    return {
      text,
      segments
    };
  }


  /**
   * @param {{
   *   node: Text,
   *   start: number,
   *   end: number
   * }[]} segments
   * @param {number} index
   * @param {boolean} endBoundary
   * @returns {{node: Text, offset: number} | null}
   */
  function findBoundary(
    segments,
    index,
    endBoundary
  ) {
    for (
      const segment
      of segments
    ) {
      if (
        !endBoundary &&
        index >= segment.start &&
        index < segment.end
      ) {
        return {
          node:
            segment.node,

          offset:
            index -
            segment.start
        };
      }


      if (
        endBoundary &&
        index > segment.start &&
        index <= segment.end
      ) {
        return {
          node:
            segment.node,

          offset:
            index -
            segment.start
        };
      }
    }


    return null;
  }


  /**
   * @param {{
   *   node: Text,
   *   start: number,
   *   end: number
   * }[]} segments
   * @param {number} start
   * @param {number} end
   * @returns {Range | null}
   */
  function makeRange(
    segments,
    start,
    end
  ) {
    if (
      end <= start
    ) {
      return null;
    }


    const startPoint =
      findBoundary(
        segments,
        start,
        false
      );


    const endPoint =
      findBoundary(
        segments,
        end,
        true
      );


    if (
      !startPoint ||
      !endPoint
    ) {
      return null;
    }


    const range =
      document.createRange();


    range.setStart(
      startPoint.node,
      startPoint.offset
    );


    range.setEnd(
      endPoint.node,
      endPoint.offset
    );


    return range;
  }


  /* =========================================================
     Search
     ========================================================= */

  /**
   * @returns {void}
   */
  function refreshMatches() {
    if (
      !activeUI
    ) {
      return;
    }


    clearHighlights();


    matches =
      [];


    currentMatchIndex =
      -1;


    const search =
      activeUI.input.value;


    if (
      search ===
      ''
    ) {
      activeUI.result.textContent =
        '0 / 0';

      setStatus(
        '本文のみ検索'
      );

      return;
    }


    const regex =
      buildRegex(
        search
      );


    if (
      !regex
    ) {
      activeUI.result.textContent =
        '0 / 0';

      setStatus(
        '正規表現が不正です',
        true
      );

      return;
    }


    const lines =
      Array.from(
        document.querySelectorAll(
          '.lines > .line'
        )
      );


    for (
      const line
      of lines
    ) {
      if (
        !(line instanceof HTMLElement)
      ) {
        continue;
      }


      /*
       * ページタイトルは対象外。
       */
      if (
        line.classList.contains(
          'line-title'
        )
      ) {
        continue;
      }


      const lineIndex =
        findPageLineIndex(
          line
        );


      if (
        lineIndex <=
        0
      ) {
        continue;
      }


      const {
        text,
        segments
      } =
        collectTextSegments(
          line
        );


      if (
        text ===
        ''
      ) {
        continue;
      }


      const localRegex =
        buildRegex(
          search
        );


      if (
        !localRegex
      ) {
        continue;
      }


      let ordinal =
        0;


      for (
        const match
        of text.matchAll(
          localRegex
        )
      ) {
        /*
         * 0文字matchはハイライト対象外。
         */
        if (
          match[0].length ===
          0
        ) {
          continue;
        }


        const start =
          match.index;


        const end =
          start +
          match[0].length;


        const range =
          makeRange(
            segments,
            start,
            end
          );


        if (
          !range
        ) {
          continue;
        }


        matches.push({
          range,
          line,
          lineIndex,
          ordinalInLine:
            ordinal,
          text:
            match[0]
        });


        ordinal +=
          1;
      }
    }


    if (
      matches.length ===
      0
    ) {
      activeUI.result.textContent =
        '0 / 0';

      setStatus(
        '一致なし'
      );

      return;
    }


    currentMatchIndex =
      0;


    renderHighlights();

    updateResultCounter();

    scrollToCurrentMatch();

    setStatus(
      `${matches.length}件一致`
    );
  }


  /**
   * @returns {void}
   */
  function queueRefreshMatches() {
    if (
      refreshFrame !==
      null
    ) {
      return;
    }


    refreshFrame =
      window.requestAnimationFrame(
        () => {
          refreshFrame =
            null;

          refreshMatches();
        }
      );
  }


  /* =========================================================
     Highlight
     ========================================================= */

  /**
   * @returns {void}
   */
  function renderHighlights() {
    clearHighlights();


    if (
      matches.length ===
      0
    ) {
      return;
    }


    if (
      supportsHighlightAPI()
    ) {
      const all =
        new Highlight(
          ...matches.map(
            match => (
              match.range
            )
          )
        );


      CSS.highlights.set(
        HIGHLIGHT_ALL,
        all
      );


      if (
        currentMatchIndex >=
        0
      ) {
        const current =
          new Highlight(
            matches[
              currentMatchIndex
            ].range
          );


        CSS.highlights.set(
          HIGHLIGHT_CURRENT,
          current
        );
      }


      return;
    }


    /*
     * Highlight API非対応時。
     */
    for (
      const match
      of matches
    ) {
      match.line.classList.add(
        'kame-search-fallback-match'
      );
    }


    if (
      currentMatchIndex >=
      0
    ) {
      matches[
        currentMatchIndex
      ].line.classList.add(
        'kame-search-fallback-current'
      );
    }
  }


  /* =========================================================
     Navigation
     ========================================================= */

  /**
   * @returns {void}
   */
  function updateResultCounter() {
    if (
      !activeUI
    ) {
      return;
    }


    if (
      matches.length ===
      0
    ) {
      activeUI.result.textContent =
        '0 / 0';

      return;
    }


    activeUI.result.textContent =
      `${
        currentMatchIndex + 1
      } / ${matches.length}`;
  }


  /**
   * @returns {void}
   */
  function scrollToCurrentMatch() {
    if (
      currentMatchIndex <
        0 ||
      currentMatchIndex >=
        matches.length
    ) {
      return;
    }


    const match =
      matches[
        currentMatchIndex
      ];


    const rect =
      match.range
        .getBoundingClientRect();


    const safeTop =
      110;


    const safeBottom =
      window.innerHeight -
      80;


    if (
      rect.top <
        safeTop ||
      rect.bottom >
        safeBottom
    ) {
      match.line.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }


  /**
   * @param {number} direction
   * @returns {void}
   */
  function moveMatch(
    direction
  ) {
    if (
      matches.length ===
      0
    ) {
      return;
    }


    currentMatchIndex =
      (
        currentMatchIndex +
        direction +
        matches.length
      ) %
      matches.length;


    renderHighlights();

    updateResultCounter();

    scrollToCurrentMatch();
  }


  /* =========================================================
     Replacement Template
     ========================================================= */

  /**
   * 正規表現置換時に
   *
   * $&
   * $1
   * $2
   * $$
   *
   * などを利用可能にする。
   *
   * @param {string} template
   * @param {RegExpMatchArray} match
   * @param {string} input
   * @returns {string}
   */
  function expandReplacement(
    template,
    match,
    input
  ) {
    const matchIndex =
      match.index ??
      0;


    return (
      template.replace(
        /\$(\$|&|`|'|\d{1,2})/g,

        (
          full,
          token
        ) => {
          if (
            token ===
            '$'
          ) {
            return '$';
          }


          if (
            token ===
            '&'
          ) {
            return (
              match[0]
            );
          }


          if (
            token ===
            '`'
          ) {
            return (
              input.slice(
                0,
                matchIndex
              )
            );
          }


          if (
            token ===
            "'"
          ) {
            return (
              input.slice(
                matchIndex +
                match[0].length
              )
            );
          }


          const index =
            Number(
              token
            );


          if (
            Number.isInteger(
              index
            ) &&
            index >=
              1 &&
            index <
              match.length
          ) {
            return (
              match[index] ??
              ''
            );
          }


          return full;
        }
      )
    );
  }


  /* =========================================================
     Replace Current
     ========================================================= */

  /**
   * @returns {Promise<void>}
   */
  async function replaceCurrent() {
    if (
      !activeUI ||
      currentMatchIndex <
        0 ||
      currentMatchIndex >=
        matches.length
    ) {
      return;
    }


    const search =
      activeUI.input.value;


    const replacement =
      activeUI.replaceInput.value;


    const current =
      matches[
        currentMatchIndex
      ];


    const pageLines =
      getPageLines();


    const pageLine =
      pageLines[
        current.lineIndex
      ];


    if (
      !pageLine
    ) {
      return;
    }


    const raw =
      pageLine.text ??
      '';


    const regex =
      buildRegex(
        search
      );


    if (
      !regex
    ) {
      setStatus(
        '正規表現が不正です',
        true
      );

      return;
    }


    const rawMatches =
      Array.from(
        raw.matchAll(
          regex
        )
      )
        .filter(
          match => (
            match[0].length >
            0
          )
        );


    const rawMatch =
      rawMatches[
        current.ordinalInLine
      ];


    if (
      !rawMatch
    ) {
      setStatus(
        'この一致は本文上で置換できません',
        true
      );

      return;
    }


    const start =
      rawMatch.index ??
      0;


    const end =
      start +
      rawMatch[0].length;


    const replacementText =
      options.regex
        ? expandReplacement(
            replacement,
            rawMatch,
            raw
          )
        : replacement;


    const updated =
      raw.slice(
        0,
        start
      ) +
      replacementText +
      raw.slice(
        end
      );


    api.Page.updateLine(
      updated,
      current.lineIndex
    );


    setStatus(
      '1件置換しました'
    );


    await waitForSave();


    schedulePostReplaceRefresh();
  }


  /* =========================================================
     Replace All
     ========================================================= */

  /**
   * @returns {Promise<void>}
   */
  async function replaceAll() {
    if (
      !activeUI
    ) {
      return;
    }


    const search =
      activeUI.input.value;


    const replacement =
      activeUI.replaceInput.value;


    const regex =
      buildRegex(
        search
      );


    if (
      !regex
    ) {
      setStatus(
        '正規表現が不正です',
        true
      );

      return;
    }


    const pageLines =
      getPageLines();


    let total =
      0;


    /*
     * index 0 = page title
     *
     * タイトルは置換対象外。
     */
    for (
      let lineIndex = 1;
      lineIndex < pageLines.length;
      lineIndex++
    ) {
      const raw =
        pageLines[
          lineIndex
        ]?.text ??
        '';


      const localRegex =
        buildRegex(
          search
        );


      if (
        !localRegex
      ) {
        continue;
      }


      const rawMatches =
        Array.from(
          raw.matchAll(
            localRegex
          )
        )
          .filter(
            match => (
              match[0].length >
              0
            )
          );


      if (
        rawMatches.length ===
        0
      ) {
        continue;
      }


      let updated =
        raw;


      /*
       * 後ろから置換することで
       * indexのずれを防ぐ。
       */
      for (
        let index =
          rawMatches.length - 1;

        index >=
          0;

        index--
      ) {
        const match =
          rawMatches[
            index
          ];


        const start =
          match.index ??
          0;


        const end =
          start +
          match[0].length;


        const replacementText =
          options.regex
            ? expandReplacement(
                replacement,
                match,
                raw
              )
            : replacement;


        updated =
          updated.slice(
            0,
            start
          ) +
          replacementText +
          updated.slice(
            end
          );
      }


      api.Page.updateLine(
        updated,
        lineIndex
      );


      total +=
        rawMatches.length;
    }


    setStatus(
      `${total}件置換しました`
    );


    await waitForSave();

    schedulePostReplaceRefresh();
  }


  /**
   * @returns {Promise<void>}
   */
  async function waitForSave() {
    if (
      typeof api.Page.waitForSave !==
      'function'
    ) {
      return;
    }


    try {
      await api.Page.waitForSave();

    } catch (
      error
    ) {
      console.warn(
        '[Kame Replace] waitForSave failed',
        error
      );
    }
  }


  /**
   * @returns {void}
   */
  function schedulePostReplaceRefresh() {
    window.requestAnimationFrame(
      () => {
        queueRefreshMatches();
      }
    );


    window.setTimeout(
      () => {
        queueRefreshMatches();
      },
      120
    );
  }


  /* =========================================================
     UI Status
     ========================================================= */

  /**
   * @param {string} text
   * @param {boolean} error
   * @returns {void}
   */
  function setStatus(
    text,
    error = false
  ) {
    if (
      !activeUI
    ) {
      return;
    }


    activeUI.status.textContent =
      text;


    activeUI.status.classList.toggle(
      'is-error',
      error
    );
  }


  /* =========================================================
     Option Button
     ========================================================= */

  /**
   * @param {HTMLButtonElement} button
   * @param {boolean} active
   * @returns {void}
   */
  function setOptionButton(
    button,
    active
  ) {
    button.classList.toggle(
      'is-active',
      active
    );


    button.setAttribute(
      'aria-pressed',
      active
        ? 'true'
        : 'false'
    );
  }


  /* =========================================================
     Enhance Standard Search Form
     ========================================================= */

  /**
   * @param {HTMLElement} form
   * @returns {void}
   */
  function enableReplaceMode(
    form
  ) {
    if (
      activeUI?.form ===
      form
    ) {
      activeUI
        .replaceInput
        .focus();

      return;
    }


    disableReplaceMode(
      false
    );


    const input =
      /** @type {HTMLInputElement | null} */ (
        form.querySelector(
          'input.search-form'
        )
      );


    const result =
      /** @type {HTMLElement | null} */ (
        form.querySelector(
          '.search-result'
        )
      );


    if (
      !input ||
      !result
    ) {
      return;
    }


    /*
     * 標準検索の現在値を保存。
     */
    const initialSearch =
      input.value;


    /*
     * 既にCtrl+F検索していた場合は
     * Cosense側の標準Highlightを一度クリア。
     */
    if (
      initialSearch !==
      ''
    ) {
      input.value =
        '';


      input.dispatchEvent(
        new Event(
          'input',
          {
            bubbles: true
          }
        )
      );


      input.value =
        initialSearch;
    }


    const formController =
      new AbortController();


    const formSignal =
      formController.signal;


    /* =======================================================
       Native Buttons
       ======================================================= */

    const prevButton =
      /** @type {HTMLButtonElement | null} */ (
        form
          .querySelector(
            '.kamon-direction-up'
          )
          ?.closest(
            'button'
          ) ??
        null
      );


    const nextButton =
      /** @type {HTMLButtonElement | null} */ (
        form
          .querySelector(
            '.kamon-direction-down'
          )
          ?.closest(
            'button'
          ) ??
        null
      );


    const closeButton =
      /** @type {HTMLButtonElement | null} */ (
        form
          .querySelector(
            '.kamon-cross'
          )
          ?.closest(
            'button'
          ) ??
        null
      );


    /* =======================================================
       Replace Row
       ======================================================= */

    const replaceRow =
      document.createElement(
        'div'
      );


    replaceRow.className =
      'kame-replace-extra kame-replace-row';


    const replaceInput =
      document.createElement(
        'input'
      );


    replaceInput.type =
      'text';


    replaceInput.className =
      'kame-replace-value';


    replaceInput.placeholder =
      '置換後';


    const replaceButton =
      document.createElement(
        'button'
      );


    replaceButton.type =
      'button';


    replaceButton.className =
      'kame-replace-action';


    replaceButton.textContent =
      '置換';


    const replaceAllButton =
      document.createElement(
        'button'
      );


    replaceAllButton.type =
      'button';


    replaceAllButton.className =
      'kame-replace-action kame-replace-all';


    replaceAllButton.textContent =
      'すべて置換';


    replaceRow.append(
      replaceInput,
      replaceButton,
      replaceAllButton
    );


    /* =======================================================
       Options
       ======================================================= */

    const optionsRow =
      document.createElement(
        'div'
      );


    optionsRow.className =
      'kame-replace-extra kame-replace-options';


    const caseButton =
      createOptionButton(
        'Aa',
        '大文字と小文字を区別'
      );


    const wordButton =
      createOptionButton(
        '単語',
        '単語単位で一致'
      );


    const regexButton =
      createOptionButton(
        '.*',
        '正規表現'
      );


    const status =
      document.createElement(
        'span'
      );


    status.className =
      'kame-replace-status';


    status.textContent =
      '本文のみ検索';


    optionsRow.append(
      caseButton,
      wordButton,
      regexButton,
      status
    );


    form.append(
      replaceRow,
      optionsRow
    );


    form.classList.add(
      'kame-replace-enhanced'
    );


    activeUI = {
      form,
      input,
      result,
      prevButton,
      nextButton,
      closeButton,
      replaceInput,
      replaceButton,
      replaceAllButton,
      caseButton,
      wordButton,
      regexButton,
      status,
      controller:
        formController
    };


    /* =======================================================
       Search Input Capture
       ======================================================= */

    /*
     * Replace Modeでは
     * Cosense標準検索のinput処理を止めて
     * 独自検索に切り替える。
     */
    form.addEventListener(
      'input',

      event => {
        if (
          event.target !==
          input
        ) {
          return;
        }


        event.stopPropagation();

        event.stopImmediatePropagation();


        queueRefreshMatches();
      },

      {
        capture: true,
        signal: formSignal
      }
    );


    /* =======================================================
       Native Button Capture
       ======================================================= */

    form.addEventListener(
      'click',

      event => {
        const target =
          event.target;


        if (
          !(target instanceof Element)
        ) {
          return;
        }


        const button =
          target.closest(
            'button'
          );


        if (
          button ===
          prevButton
        ) {
          event.preventDefault();

          event.stopPropagation();

          event.stopImmediatePropagation();

          moveMatch(
            -1
          );

          return;
        }


        if (
          button ===
          nextButton
        ) {
          event.preventDefault();

          event.stopPropagation();

          event.stopImmediatePropagation();

          moveMatch(
            1
          );

          return;
        }


        if (
          button ===
          closeButton
        ) {
          replaceRequested =
            false;


          clearHighlights();


          /*
           * close自体はCosense標準処理へ渡す。
           */
        }
      },

      {
        capture: true,
        signal: formSignal
      }
    );


    /* =======================================================
       Option Events
       ======================================================= */

    caseButton.addEventListener(
      'click',

      event => {
        event.preventDefault();


        options.caseSensitive =
          !options.caseSensitive;


        setOptionButton(
          caseButton,
          options.caseSensitive
        );


        queueRefreshMatches();
      },

      {
        signal: formSignal
      }
    );


    wordButton.addEventListener(
      'click',

      event => {
        event.preventDefault();


        options.wholeWord =
          !options.wholeWord;


        setOptionButton(
          wordButton,
          options.wholeWord
        );


        queueRefreshMatches();
      },

      {
        signal: formSignal
      }
    );


    regexButton.addEventListener(
      'click',

      event => {
        event.preventDefault();


        options.regex =
          !options.regex;


        setOptionButton(
          regexButton,
          options.regex
        );


        queueRefreshMatches();
      },

      {
        signal: formSignal
      }
    );


    /* =======================================================
       Replace Events
       ======================================================= */

    replaceButton.addEventListener(
      'click',

      event => {
        event.preventDefault();

        void replaceCurrent();
      },

      {
        signal: formSignal
      }
    );


    replaceAllButton.addEventListener(
      'click',

      event => {
        event.preventDefault();

        void replaceAll();
      },

      {
        signal: formSignal
      }
    );

// Author: kamekingdom (2026-10-06)

/* =======================================================
   Keyboard
   ======================================================= */

form.addEventListener(
  'keydown',

  event => {

    /* -----------------------------------------------------
       Search Input
       ----------------------------------------------------- */

    /*
     * 検索欄
     *
     * Enter
     *   → 次の一致
     *
     * Shift + Enter
     *   → 前の一致
     */
    if (
      event.target ===
        input &&
      event.key ===
        'Enter' &&
      !event.ctrlKey &&
      !event.metaKey
    ) {

      event.preventDefault();

      event.stopPropagation();


      moveMatch(
        event.shiftKey
          ? -1
          : 1
      );


      return;
    }


    /* -----------------------------------------------------
       Replace Input
       ----------------------------------------------------- */

    /*
     * 置換欄で普通のEnter
     *
     * → 何もしない
     *
     * 誤操作防止のため、
     * Enterだけでは置換しない。
     */
    if (
      event.target ===
        replaceInput &&
      event.key ===
        'Enter' &&
      !event.ctrlKey &&
      !event.metaKey
    ) {

      event.preventDefault();

      event.stopPropagation();


      return;
    }


    /* -----------------------------------------------------
       Ctrl / Cmd + Enter
       ----------------------------------------------------- */

    /*
     * Ctrl + Enter
     * Cmd  + Enter
     *
     * → 現在選択中の1件を置換
     */
    if (
      event.key ===
        'Enter' &&
      (
        event.ctrlKey ||
        event.metaKey
      )
    ) {

      event.preventDefault();

      event.stopPropagation();


      void replaceCurrent();


      return;
    }
  },

  {
    capture: true,
    signal: formSignal
  }
);


    /* =======================================================
       Initial
       ======================================================= */

    setOptionButton(
      caseButton,
      options.caseSensitive
    );


    setOptionButton(
      wordButton,
      options.wholeWord
    );


    setOptionButton(
      regexButton,
      options.regex
    );


    refreshMatches();


    window.requestAnimationFrame(
      () => {
        input.focus();

        input.select();
      }
    );
  }


  /**
   * @param {string} text
   * @param {string} title
   * @returns {HTMLButtonElement}
   */
  function createOptionButton(
    text,
    title
  ) {
    const button =
      document.createElement(
        'button'
      );


    button.type =
      'button';


    button.className =
      'kame-replace-option';


    button.textContent =
      text;


    button.title =
      title;


    button.setAttribute(
      'aria-pressed',
      'false'
    );


    return button;
  }


  /* =========================================================
     Disable Replace Mode
     ========================================================= */

  /**
   * @param {boolean} restoreNativeSearch
   * @returns {void}
   */
  function disableReplaceMode(
    restoreNativeSearch = false
  ) {
    if (
      !activeUI
    ) {
      clearHighlights();

      return;
    }


    const {
      form,
      input,
      controller:
        formController
    } =
      activeUI;


    formController.abort();


    form
      .querySelectorAll(
        '.kame-replace-extra'
      )
      .forEach(
        element => {
          element.remove();
        }
      );


    form.classList.remove(
      'kame-replace-enhanced'
    );


    clearHighlights();


    activeUI =
      null;


    matches =
      [];


    currentMatchIndex =
      -1;


    /*
     * Ctrl+Fへ戻す場合、
     * 現在の検索語をCosense標準検索へ渡す。
     */
    if (
      restoreNativeSearch
    ) {
      window.requestAnimationFrame(
        () => {
          input.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );
        }
      );
    }
  }


  /* =========================================================
     Shortcut
     ========================================================= */

  /**
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  function handleGlobalShortcut(
    event
  ) {
    const key =
      event.code;


    const modifier =
      event.ctrlKey ||
      event.metaKey;


    if (
      !modifier
    ) {
      return;
    }


    /* -------------------------------------------------------
       Ctrl + H
       ------------------------------------------------------- */

    if (
      key ===
      'KeyH'
    ) {
      replaceRequested =
        true;


      const form =
        /** @type {HTMLElement | null} */ (
          document.querySelector(
            '.in-page-search-form'
          )
        );


      /*
       * 既にCtrl+F検索欄がある場合は
       * 即座に置換モードへ。
       */
      if (
        form
      ) {
        event.preventDefault();

        event.stopPropagation();

        event.stopImmediatePropagation();


        enableReplaceMode(
          form
        );
      }


      /*
       * 検索欄がない場合は
       * Cosense自身のCtrl+H処理を通す。
       *
       * MutationObserverが検索欄出現を検知する。
       */
      return;
    }


    /* -------------------------------------------------------
       Ctrl + F
       ------------------------------------------------------- */

    if (
      key ===
      'KeyF' &&
      activeUI
    ) {
      replaceRequested =
        false;


      /*
       * Replace Modeを解除して
       * 標準Ctrl+Fへ戻す。
       */
      disableReplaceMode(
        true
      );


      /*
       * Ctrl+F自体は止めない。
       */
    }
  }


  window.addEventListener(
    'keydown',
    handleGlobalShortcut,
    {
      capture: true,
      signal
    }
  );


  /* =========================================================
     DOM Observer
     ========================================================= */

  observer =
    new MutationObserver(
      () => {
        const form =
          /** @type {HTMLElement | null} */ (
            document.querySelector(
              '.in-page-search-form'
            )
          );


        /*
         * 検索窓が閉じた。
         */
        if (
          activeUI &&
          !document.contains(
            activeUI.form
          )
        ) {
          replaceRequested =
            false;

          disableReplaceMode(
            false
          );

          return;
        }


        /*
         * Ctrl+H後に標準検索フォームが出現。
         */
        if (
          replaceRequested &&
          form &&
          activeUI?.form !==
            form
        ) {
          enableReplaceMode(
            form
          );
        }
      }
    );


  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );


  /* =========================================================
     Page Mutation
     ========================================================= */

  /*
   * Replace Mode中にページ本文が変わった場合、
   * 検索結果を更新。
   */
  const pageObserver =
    new MutationObserver(
      mutations => {
        if (
          !activeUI
        ) {
          return;
        }


        const relevant =
          mutations.some(
            mutation => {
              const target =
                mutation.target;


              if (
                target instanceof Element &&
                target.closest(
                  '.in-page-search-form'
                )
              ) {
                return false;
              }


              return true;
            }
          );


        if (
          relevant
        ) {
          queueRefreshMatches();
        }
      }
    );


  const lines =
    document.querySelector(
      '.lines'
    );


  if (
    lines
  ) {
    pageObserver.observe(
      lines,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
    );
  }


  /* =========================================================
     Cleanup
     ========================================================= */

  signal.addEventListener(
    'abort',

    () => {
      observer?.disconnect();

      pageObserver.disconnect();


      disableReplaceMode(
        false
      );


      if (
        refreshFrame !==
        null
      ) {
        window.cancelAnimationFrame(
          refreshFrame
        );

        refreshFrame =
          null;
      }
    }
  );


  console.log(
    '[Kame Replace] loaded'
  );

})();