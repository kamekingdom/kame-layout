// Author: kamekingdom (2026-10-27)

(() => {

  /* =========================================================
     Types
     ========================================================= */

  /**
   * @typedef {
   *   Window
   *   & typeof globalThis
   *   & {
   *     __kameExternalFaviconController?: AbortController
   *   }
   * } KameWindow
   */


  /* =========================================================
     Settings
     ========================================================= */

  /*
   * `.lines` に限定しない。
   *
   * テーブル内リンクや、
   * Cosenseが後から生成するリンクも対象。
   */
  const LINK_SELECTOR =
    'a[href]';


  const FAVICON_SIZE =
    64;


  const IGNORED_HOSTS = [
    'scrapbox.io',
    'cosense.com'
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
    kameWindow.__kameExternalFaviconController
  ) {

    kameWindow
      .__kameExternalFaviconController
      .abort();
  }


  const controller =
    new AbortController();


  const signal =
    controller.signal;


  kameWindow.__kameExternalFaviconController =
    controller;


  /* =========================================================
     Cleanup Old Version
     ========================================================= */

  document
    .querySelectorAll(
      '.kame-external-favicon'
    )
    .forEach(
      element => {

        element.remove();
      }
    );


  document
    .querySelectorAll(
      '[data-kame-favicon-processed]'
    )
    .forEach(
      element => {

        if (
          element instanceof HTMLElement
        ) {

          delete element
            .dataset
            .kameFaviconProcessed;


          element.classList.remove(
            'kame-link-with-favicon'
          );
        }
      }
    );


  /* =========================================================
     Utilities
     ========================================================= */

  /**
   * @param {string} hostname
   * @returns {string}
   */
  function normalizeHostname(
    hostname
  ) {

    return (
      hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ''
        )
    );
  }


  /**
   * @param {string} hostname
   * @returns {boolean}
   */
  function isIgnoredHost(
    hostname
  ) {

    const normalized =
      normalizeHostname(
        hostname
      );


    return (
      IGNORED_HOSTS.some(
        ignored => {

          const target =
            normalizeHostname(
              ignored
            );


          return (
            normalized === target ||
            normalized.endsWith(
              `.${target}`
            )
          );
        }
      )
    );
  }


  /**
   * Cosense本文のリンクかどうか。
   *
   * 通常行・テーブル・コード等を含む。
   *
   * ヘッダーや関連ページ一覧などには
   * faviconを付けない。
   *
   * @param {HTMLAnchorElement} anchor
   * @returns {boolean}
   */
  function isContentLink(
    anchor
  ) {

    /*
     * 通常本文
     */
    if (
      anchor.closest(
        '.lines'
      )
    ) {

      return true;
    }


    /*
     * テーブルが.linesの外側に
     * 描画される環境へのFallback。
     */
    if (
      anchor.closest(
        '.table-block'
      )
    ) {

      return true;
    }


    return false;
  }


  /**
   * @param {HTMLAnchorElement} anchor
   * @returns {URL | null}
   */
  function getExternalURL(
    anchor
  ) {

    if (
      !isContentLink(
        anchor
      )
    ) {

      return null;
    }


    try {

      const rawHref =
        anchor.getAttribute(
          'href'
        );


      if (
        !rawHref
      ) {

        return null;
      }


      const url =
        new URL(
          rawHref,
          location.href
        );


      if (
        url.protocol !== 'https:' &&
        url.protocol !== 'http:'
      ) {

        return null;
      }


      if (
        isIgnoredHost(
          url.hostname
        )
      ) {

        return null;
      }


      return url;

    } catch {

      return null;
    }
  }


  /* =========================================================
     Favicon URLs
     ========================================================= */

  /**
   * @param {URL} url
   * @returns {string}
   */
  function getGoogleFaviconURL(
    url
  ) {

    return (
      'https://www.google.com/s2/favicons' +
      `?sz=${FAVICON_SIZE}` +
      `&domain_url=${encodeURIComponent(url.origin)}`
    );
  }


  /**
   * @param {URL} url
   * @returns {string}
   */
  function getDuckDuckGoFaviconURL(
    url
  ) {

    return (
      'https://icons.duckduckgo.com/ip3/' +
      `${encodeURIComponent(url.hostname)}.ico`
    );
  }


  /**
   * @param {URL} url
   * @returns {string}
   */
  function getDirectFaviconURL(
    url
  ) {

    return (
      `${url.origin}/favicon.ico`
    );
  }


  /* =========================================================
     Create Icon
     ========================================================= */

  /**
   * @param {URL} url
   * @returns {HTMLSpanElement}
   */
  function createFavicon(
    url
  ) {

    const icon =
      document.createElement(
        'span'
      );


    icon.className =
      'kame-external-favicon';


    icon.dataset.hostname =
      url.hostname;


    icon.setAttribute(
      'aria-hidden',
      'true'
    );


    icon.title =
      url.hostname;


    const image =
      document.createElement(
        'img'
      );


    image.className =
      'kame-external-favicon-image';


    image.alt =
      '';


    image.width =
      15;


    image.height =
      15;


    image.loading =
      'lazy';


    /*
     * 1. Google
     */
    image.src =
      getGoogleFaviconURL(
        url
      );


    /*
     * Google
     * ↓
     * DuckDuckGo
     * ↓
     * /favicon.ico
     */
    image.addEventListener(
      'error',

      () => {

        const fallback =
          Number(
            image.dataset.fallback ??
            '0'
          );


        if (
          fallback === 0
        ) {

          image.dataset.fallback =
            '1';


          image.src =
            getDuckDuckGoFaviconURL(
              url
            );


          return;
        }


        if (
          fallback === 1
        ) {

          image.dataset.fallback =
            '2';


          image.src =
            getDirectFaviconURL(
              url
            );


          return;
        }


        icon.remove();

      },

      {
        signal
      }
    );


    icon.appendChild(
      image
    );


    return icon;
  }


  /* =========================================================
     Add Favicon
     ========================================================= */

  /**
   * @param {HTMLAnchorElement} anchor
   * @returns {void}
   */
  function addFavicon(
    anchor
  ) {

    /* -------------------------------------------------------
       Already Has Icon
       ------------------------------------------------------- */

    const existing =
      anchor.querySelector(
        ':scope > .kame-external-favicon'
      );


    if (
      existing
    ) {

      anchor.dataset
        .kameFaviconProcessed =
        'true';


      return;
    }


    /* -------------------------------------------------------
       URL
       ------------------------------------------------------- */

    const url =
      getExternalURL(
        anchor
      );


    if (
      !url
    ) {

      return;
    }


    /* -------------------------------------------------------
       Image-only Link
       ------------------------------------------------------- */

    const hasImage =
      Boolean(
        anchor.querySelector(
          'img:not(.kame-external-favicon-image)'
        )
      );


    const visibleText =
      (
        anchor.textContent ??
        ''
      )
        .trim();


    /*
     * 純粋な画像リンクは除外。
     */
    if (
      hasImage &&
      visibleText === ''
    ) {

      return;
    }


    /* -------------------------------------------------------
       Create Icon
       ------------------------------------------------------- */

    const icon =
      createFavicon(
        url
      );


    /* -------------------------------------------------------
       Insert
       ------------------------------------------------------- */

    /*
     * リンクの中に入れる。
     *
     * anchor.before()は使用しない。
     * Cosense再描画時の増殖防止。
     */
    anchor.prepend(
      icon
    );


    anchor.classList.add(
      'kame-link-with-favicon'
    );


    anchor.dataset
      .kameFaviconProcessed =
      'true';
  }


  /* =========================================================
     Process Link
     ========================================================= */

  /**
   * @param {Element} element
   * @returns {void}
   */
  function processElement(
    element
  ) {

    /* -------------------------------------------------------
       Element itself
       ------------------------------------------------------- */

    if (
      element instanceof HTMLAnchorElement &&
      element.matches(
        LINK_SELECTOR
      )
    ) {

      addFavicon(
        element
      );
    }


    /* -------------------------------------------------------
       Descendants
       ------------------------------------------------------- */

    const links =
      element.querySelectorAll(
        LINK_SELECTOR
      );


    for (
      const link
      of links
    ) {

      if (
        link instanceof HTMLAnchorElement
      ) {

        addFavicon(
          link
        );
      }
    }
  }


  /* =========================================================
     Scan All
     ========================================================= */

  /**
   * @returns {void}
   */
  function scanAll() {

    const links =
      document.querySelectorAll(
        LINK_SELECTOR
      );


    for (
      const link
      of links
    ) {

      if (
        link instanceof HTMLAnchorElement
      ) {

        addFavicon(
          link
        );
      }
    }
  }


  /* =========================================================
     Initial Scan
     ========================================================= */

  scanAll();


  /* =========================================================
     Mutation Observer
     ========================================================= */

  const observer =
    new MutationObserver(
      mutations => {

        for (
          const mutation
          of mutations
        ) {

          /* -------------------------------------------------
             Added Nodes
             ------------------------------------------------- */

          for (
            const node
            of mutation.addedNodes
          ) {

            if (
              !(
                node instanceof Element
              )
            ) {

              continue;
            }


            /*
             * 自分自身が追加したfaviconは除外。
             */
            if (
              node.classList.contains(
                'kame-external-favicon'
              )
            ) {

              continue;
            }


            processElement(
              node
            );
          }


          /* -------------------------------------------------
             href Changed
             ------------------------------------------------- */

          if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'href' &&
            mutation.target instanceof HTMLAnchorElement
          ) {

            const anchor =
              mutation.target;


            /*
             * URLが変わった可能性があるので
             * 古いfaviconを一度消して再生成。
             */
            anchor
              .querySelector(
                ':scope > .kame-external-favicon'
              )
              ?.remove();


            delete anchor
              .dataset
              .kameFaviconProcessed;


            anchor.classList.remove(
              'kame-link-with-favicon'
            );


            addFavicon(
              anchor
            );
          }
        }
      }
    );


  /*
   * `.lines` だけでなくbody全体を監視。
   *
   * テーブルDOMの再生成や
   * `.lines` 自体の差し替えにも対応。
   */
  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,

      attributes: true,

      attributeFilter: [
        'href'
      ]
    }
  );


  /* =========================================================
     Periodic Safety Scan
     ========================================================= */

  /*
   * Cosense側の特殊な再描画で
   * Mutationを取りこぼした場合の保険。
   *
   * 2秒に1度確認するだけなので負荷は小さい。
   */
  const intervalId =
    window.setInterval(
      () => {

        scanAll();

      },
      2000
    );


  /* =========================================================
     Cleanup
     ========================================================= */

  signal.addEventListener(
    'abort',

    () => {

      observer.disconnect();


      window.clearInterval(
        intervalId
      );


      document
        .querySelectorAll(
          '.kame-external-favicon'
        )
        .forEach(
          element => {

            element.remove();
          }
        );


      document
        .querySelectorAll(
          '.kame-link-with-favicon'
        )
        .forEach(
          element => {

            element.classList.remove(
              'kame-link-with-favicon'
            );


            if (
              element instanceof HTMLElement
            ) {

              delete element
                .dataset
                .kameFaviconProcessed;
            }
          }
        );
    }
  );


  /* =========================================================
     Loaded
     ========================================================= */

  console.log(
    '[Kame External Favicon] loaded'
  );

})();