// # Author: kamekingdom (2026-08-21)

(() => {
  /** @type {readonly string[]} */
  const AUDIO_EXTENSIONS = [
    "mp3",
    "m4a",
    "wav",
    "aac",
    "ogg",
    "oga",
    "flac",
    "webm",
  ];

  /** @type {string} */
  const PLAYER_CLASS = "kame-audio-player";

  /**
   * 個別ページ本文を取得する。
   * 一覧ページでは null を返す。
   *
   * @returns {HTMLElement | null}
   */
  const getPageContent = () => {
    const page = document.querySelector(".page");

    if (!(page instanceof HTMLElement)) {
      return null;
    }

    /*
     * 一覧ページのカードではなく、
     * 実際の編集本文が存在するか確認する。
     */
    const lines = page.querySelector(".lines");

    if (!(lines instanceof HTMLElement)) {
      return null;
    }

    return lines;
  };

  /**
   * 音声リンクかどうかを判定する。
   *
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  const isAudioLink = (link) => {
    /** @type {string} */
    const href = link.href.toLowerCase();

    /** @type {string} */
    const text = (link.textContent ?? "")
      .trim()
      .toLowerCase();

    return AUDIO_EXTENSIONS.some((ext) => {
      return (
        href.includes(`.${ext}`) ||
        text.endsWith(`.${ext}`)
      );
    });
  };

  /**
   * 指定URLの既存プレイヤーを取得する。
   *
   * @param {HTMLElement} root
   * @param {string} url
   * @returns {HTMLDivElement | null}
   */
  const findPlayer = (root, url) => {
    const players = root.querySelectorAll(
      `.${PLAYER_CLASS}`
    );

    for (const element of players) {
      if (!(element instanceof HTMLDivElement)) {
        continue;
      }

      if (element.dataset.audioUrl === url) {
        return element;
      }
    }

    return null;
  };

  /**
   * プレイヤーを生成する。
   *
   * @param {string} url
   * @returns {HTMLDivElement}
   */
  const buildPlayer = (url) => {
    /** @type {HTMLDivElement} */
    const container = document.createElement("div");

    container.className = PLAYER_CLASS;
    container.dataset.audioUrl = url;

    /** @type {HTMLAudioElement} */
    const audio = document.createElement("audio");

    audio.controls = true;
    audio.preload = "metadata";
    audio.src = url;

    container.appendChild(audio);

    return container;
  };

  /**
   * 音声リンク直後にプレイヤーを配置する。
   *
   * @param {HTMLElement} root
   * @param {HTMLAnchorElement} link
   * @returns {void}
   */
  const normalizeAudioPlayer = (root, link) => {
    if (!isAudioLink(link)) {
      return;
    }

    /** @type {string} */
    const url = link.href;

    /** @type {HTMLDivElement | null} */
    let player = findPlayer(root, url);

    if (player === null) {
      player = buildPlayer(url);
    }

    /*
     * 必ず
     *
     * recording.m4a
     * audio player
     *
     * の順序にする。
     */
    if (link.nextElementSibling !== player) {
      link.insertAdjacentElement(
        "afterend",
        player
      );
    }
  };

  /**
   * 重複プレイヤーを削除する。
   *
   * @param {HTMLElement} root
   * @returns {void}
   */
  const removeDuplicates = (root) => {
    /** @type {Map<string, HTMLElement>} */
    const seen = new Map();

    root
      .querySelectorAll(`.${PLAYER_CLASS}`)
      .forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }

        /** @type {string | undefined} */
        const url = element.dataset.audioUrl;

        if (url === undefined) {
          return;
        }

        if (seen.has(url)) {
          element.remove();
          return;
        }

        seen.set(url, element);
      });
  };

  /**
   * 一覧ページなどで残ったプレイヤーを削除する。
   *
   * @returns {void}
   */
  const removePlayersOutsidePage = () => {
    document
      .querySelectorAll(`.${PLAYER_CLASS}`)
      .forEach((element) => {
        element.remove();
      });
  };

  /**
   * 現在の個別ページ本文のみ走査する。
   *
   * @returns {void}
   */
  const scan = () => {
    /** @type {HTMLElement | null} */
    const root = getPageContent();

    /*
     * 一覧ページではプレイヤーを一切表示しない。
     */
    if (root === null) {
      removePlayersOutsidePage();
      return;
    }

    removeDuplicates(root);

    root
      .querySelectorAll("a")
      .forEach((element) => {
        if (!(element instanceof HTMLAnchorElement)) {
          return;
        }

        normalizeAudioPlayer(root, element);
      });
  };

  /** @type {number | null} */
  let timer = null;

  /**
   * @returns {void}
   */
  const scheduleScan = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
    }

    timer = window.setTimeout(() => {
      timer = null;
      scan();
    }, 100);
  };

  /*
   * 初回
   */
  scan();

  /*
   * Cosense/Scrapbox のSPA遷移や
   * カーソル行の再描画を監視する。
   */
  /** @type {MutationObserver} */
  const observer = new MutationObserver(() => {
    scheduleScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();