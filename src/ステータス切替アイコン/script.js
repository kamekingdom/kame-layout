// Author: kamekingdom (2026-10-05)

(() => {

  /* =========================================================
     Types
     ========================================================= */

  /**
   * @typedef {{
   *   name: string,
   *   source: string
   * }} IconState
   */

  /**
   * @typedef {{
   *   id?: string,
   *   text?: string
   * }} CosenseLine
   */

  /**
   * @typedef {
   *   Window
   *   & typeof globalThis
   *   & {
   *     __kameStatusIconController?: AbortController
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
      '[Kame Status Icon] Cosense API not found'
    );

    return;
  }


  /* =========================================================
     Settings
     ========================================================= */

  const PROJECT_NAME =
    'kamelayout';


  /** @type {IconState[]} */
  const STATES = [
    {
      name: 'AC',
      source: '[/kameLayout/AC.icon]'
    },
    {
      name: 'NWJ',
      source: '[/kameLayout/NWJ.icon]'
    },
    {
      name: 'WJ',
      source: '[/kameLayout/WJ.icon]'
    },
    {
      name: 'WA',
      source: '[/kameLayout/WA.icon]'
    },
    {
      name: 'RE',
      source: '[/kameLayout/RE.icon]'
    },
    {
      name: 'TLE',
      source: '[/kameLayout/TLE.icon]'
    }
  ];


  /* =========================================================
     Initialization
     ========================================================= */

  /** @type {KameWindow} */
  const kameWindow =
    /** @type {KameWindow} */ (
      window
    );


  if (
    kameWindow.__kameStatusIconController
  ) {

    kameWindow
      .__kameStatusIconController
      .abort();
  }


  /** @type {AbortController} */
  const controller =
    new AbortController();


  /** @type {AbortSignal} */
  const signal =
    controller.signal;


  kameWindow.__kameStatusIconController =
    controller;


  /* =========================================================
     Anchor Detection
     ========================================================= */

  /**
   * hrefから状態名を取得。
   *
   * 実際のリンク:
   *
   * /kamelayout/AC
   * /kamelayout/NWJ
   * ...
   *
   * @param {HTMLAnchorElement} anchor
   * @returns {number}
   */
  function getStateIndexFromAnchor(
    anchor
  ) {

    /*
     * 通常の文字リンク
     *
     * [AC]
     *
     * までToggle対象にしないため、
     * 画像を含んでいるリンクだけ対象。
     */
    if (
      !anchor.querySelector(
        'img'
      )
    ) {

      return -1;
    }


    try {

      const url =
        new URL(
          anchor.href,
          location.href
        );


      const pathParts =
        url.pathname
          .split('/')
          .filter(Boolean)
          .map(
            part => (
              decodeURIComponent(
                part
              )
            )
          );


      /*
       * 例:
       *
       * /kamelayout/AC
       *
       * ↓
       *
       * [
       *   "kamelayout",
       *   "AC"
       * ]
       */
      if (
        pathParts.length <
        2
      ) {

        return -1;
      }


      const projectName =
        pathParts[
          pathParts.length -
          2
        ];


      const pageName =
        pathParts[
          pathParts.length -
          1
        ];


      if (
        projectName.toLowerCase() !==
        PROJECT_NAME.toLowerCase()
      ) {

        return -1;
      }


      return (
        STATES.findIndex(
          state => (
            state.name ===
            pageName
          )
        )
      );

    } catch (
      error
    ) {

      return -1;
    }
  }


  /**
   * 対象のStatus Iconか。
   *
   * @param {HTMLAnchorElement} anchor
   * @returns {boolean}
   */
  function isTargetAnchor(
    anchor
  ) {

    return (
      getStateIndexFromAnchor(
        anchor
      ) >=
      0
    );
  }


  /**
   * Eventから対象anchor取得。
   *
   * @param {Event} event
   * @returns {HTMLAnchorElement | null}
   */
  function getTargetAnchor(
    event
  ) {

    const target =
      event.target;


    if (
      !(target instanceof Element)
    ) {

      return null;
    }


    const anchor =
      target.closest(
        'a[href]'
      );


    if (
      !(
        anchor instanceof
        HTMLAnchorElement
      )
    ) {

      return null;
    }


    if (
      !isTargetAnchor(
        anchor
      )
    ) {

      return null;
    }


    return anchor;
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
   * DOM lineとPage.linesを対応。
   *
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


    const normalizedDomId =
      domId.startsWith(
        'L'
      )
        ? domId.slice(
            1
          )
        : domId;


    /* =======================================================
       ID Match
       ======================================================= */

    const idIndex =
      pageLines.findIndex(
        line => {

          if (
            !line.id
          ) {

            return false;
          }


          return (
            line.id ===
              domId ||

            line.id ===
              normalizedDomId ||

            `L${line.id}` ===
              domId
          );
        }
      );


    if (
      idIndex >=
      0
    ) {

      return idIndex;
    }


    /* =======================================================
       DOM Index Fallback
       ======================================================= */

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
     Source Token Detection
     ========================================================= */

  /**
   * 行内のStatus Icon記法を全部取得。
   *
   * @param {string} text
   * @returns {{
   *   start: number,
   *   end: number,
   *   stateIndex: number
   * }[]}
   */
  function findIconTokens(
    text
  ) {

    /** @type {{
     *   start: number,
     *   end: number,
     *   stateIndex: number
     * }[]}
     */
    const tokens =
      [];


    for (
      let stateIndex = 0;
      stateIndex < STATES.length;
      stateIndex++
    ) {

      const source =
        STATES[
          stateIndex
        ].source;


      let position =
        0;


      while (
        true
      ) {

        const start =
          text.indexOf(
            source,
            position
          );


        if (
          start <
          0
        ) {

          break;
        }


        tokens.push({
          start,

          end:
            start +
            source.length,

          stateIndex
        });


        position =
          start +
          source.length;
      }
    }


    /*
     * 左から順番に並べる。
     */
    tokens.sort(
      (
        a,
        b
      ) => (
        a.start -
        b.start
      )
    );


    return tokens;
  }


  /* =========================================================
     Clicked Icon Detection
     ========================================================= */

  /**
   * 同じ行に複数Status Iconがある場合、
   * 何番目をクリックしたか調べる。
   *
   * @param {HTMLElement} lineElement
   * @param {HTMLAnchorElement} clickedAnchor
   * @returns {number}
   */
  function getClickedIconOrdinal(
    lineElement,
    clickedAnchor
  ) {

    /** @type {HTMLAnchorElement[]} */
    const anchors =
      Array.from(
        lineElement.querySelectorAll(
          'a[href]'
        )
      )
        .filter(
          element => (
            element instanceof
            HTMLAnchorElement
          )
        )
        .filter(
          element => (
            isTargetAnchor(
              /** @type {HTMLAnchorElement} */ (
                element
              )
            )
          )
        );


    return (
      anchors.indexOf(
        clickedAnchor
      )
    );
  }


  /* =========================================================
     Toggle
     ========================================================= */

  /**
   * Status Iconを次の状態へ変更。
   *
   * AC
   * ↓
   * NWJ
   * ↓
   * WJ
   * ↓
   * WA
   * ↓
   * RE
   * ↓
   * TLE
   * ↓
   * AC
   *
   * @param {HTMLAnchorElement} anchor
   * @returns {Promise<void>}
   */
  async function toggleIcon(
    anchor
  ) {

    const lineElement =
      anchor.closest(
        '.line'
      );


    if (
      !(
        lineElement instanceof
        HTMLElement
      )
    ) {

      return;
    }


    /* =======================================================
       Page Line
       ======================================================= */

    const lineIndex =
      findPageLineIndex(
        lineElement
      );


    if (
      lineIndex <
      0
    ) {

      console.warn(
        '[Kame Status Icon] line not found'
      );


      return;
    }


    const pageLines =
      getPageLines();


    const pageLine =
      pageLines[
        lineIndex
      ];


    if (
      !pageLine
    ) {

      return;
    }


    const text =
      pageLine.text ??
      '';


    /* =======================================================
       Token
       ======================================================= */

    const tokens =
      findIconTokens(
        text
      );


    const ordinal =
      getClickedIconOrdinal(
        lineElement,
        anchor
      );


    if (
      ordinal <
        0 ||
      ordinal >=
        tokens.length
    ) {

      console.warn(
        '[Kame Status Icon] source token not found'
      );


      return;
    }


    const token =
      tokens[
        ordinal
      ];


    const currentState =
      STATES[
        token.stateIndex
      ];


    const nextStateIndex =
      (
        token.stateIndex +
        1
      ) %
      STATES.length;


    const nextState =
      STATES[
        nextStateIndex
      ];


    /* =======================================================
       Replace
       ======================================================= */

    const updatedText =
      text.slice(
        0,
        token.start
      ) +

      nextState.source +

      text.slice(
        token.end
      );


    try {

      /*
       * Cosense本文を実際に変更。
       */
      api.Page.updateLine(
        updatedText,
        lineIndex
      );


      console.log(
        `[Kame Status Icon] ${currentState.name} → ${nextState.name}`
      );


      if (
        typeof api.Page.waitForSave ===
        'function'
      ) {

        await api.Page.waitForSave();
      }

    } catch (
      error
    ) {

      console.error(
        '[Kame Status Icon] update failed',
        error
      );
    }
  }


  /* =========================================================
     Navigation Prevention
     ========================================================= */

  /**
   * Cosenseがページ遷移する前に
   * 対象Status Iconを捕まえる。
   *
   * capture phaseで実行。
   */


  /* ---------------------------------------------------------
     Pointer Down
     --------------------------------------------------------- */

  document.addEventListener(
    'pointerdown',

    event => {

      const anchor =
        getTargetAnchor(
          event
        );


      if (
        !anchor
      ) {

        return;
      }


      /*
       * リンク遷移を止める。
       */
      event.preventDefault();


      /*
       * Cosense側のhandlerへ渡さない。
       */
      event.stopPropagation();

    },

    {
      signal,
      capture:
        true
    }
  );


  /* ---------------------------------------------------------
     Mouse Down
     --------------------------------------------------------- */

  document.addEventListener(
    'mousedown',

    event => {

      const anchor =
        getTargetAnchor(
          event
        );


      if (
        !anchor
      ) {

        return;
      }


      event.preventDefault();

      event.stopPropagation();

    },

    {
      signal,
      capture:
        true
    }
  );


  /* ---------------------------------------------------------
     Click
     --------------------------------------------------------- */

  document.addEventListener(
    'click',

    event => {

      const anchor =
        getTargetAnchor(
          event
        );


      if (
        !anchor
      ) {

        return;
      }


      /*
       * /kamelayout/AC
       *
       * などへの遷移を完全に停止。
       */
      event.preventDefault();

      event.stopPropagation();


      /*
       * Status変更。
       */
      void toggleIcon(
        anchor
      );

    },

    {
      signal,
      capture:
        true
    }
  );


  /* =========================================================
     Drag Prevention
     ========================================================= */

  /*
   * 画像をドラッグしたときの
   * リンク操作も抑制。
   */
  document.addEventListener(
    'dragstart',

    event => {

      const anchor =
        getTargetAnchor(
          event
        );


      if (
        !anchor
      ) {

        return;
      }


      event.preventDefault();

    },

    {
      signal,
      capture:
        true
    }
  );


  /* =========================================================
     Loaded
     ========================================================= */

  console.log(
    '[Kame Status Icon] loaded'
  );

})();