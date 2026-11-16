// # Author: kamekingdom (2026-07-10)

(() => {
  "use strict";

  /**
   * @typedef {"o" | "v" | "x"} CheckboxState
   *
   * @typedef {Object} CosenseLine
   * @property {string} text
   *
   * @typedef {Object} CosensePage
   * @property {CosenseLine[]=} lines
   * @property {(text: string, index: number) => void} updateLine
   *
   * @typedef {Object} CosenseApi
   * @property {CosensePage} Page
   *
   * @typedef {Window & {
   *   cosense?: CosenseApi,
   *   scrapbox?: CosenseApi,
   *   __checkboxTogglePointerDown__?: EventListener,
   *   __checkboxToggleMouseDown__?: EventListener,
   *   __checkboxToggleClick__?: EventListener
   * }} ExtendedWindow
   */

  const typedWindow = /** @type {ExtendedWindow} */ (window);
  const api = typedWindow.cosense ?? typedWindow.scrapbox;

  if (
    !api?.Page?.lines ||
    typeof api.Page.updateLine !== "function"
  ) {
    console.error(
      "[Checkbox Toggle] Cosense Page Edit APIを取得できませんでした。",
    );
    return;
  }

  /**
   * チェックボックスの状態遷移です。
   *
   * [o] → [v]
   * [v] → [o]
   * [x] → [o]
   */
  const nextStateMap =
    /** @type {Readonly<Record<CheckboxState, CheckboxState>>} */ ({
      o: "v",
      v: "o",
      x: "o",
    });

  /**
   * リンクがチェックボックスか判定します。
   *
   * @param {HTMLAnchorElement} anchor
   * @returns {CheckboxState | null}
   */
  const getCheckboxState = (anchor) => {
    if (anchor.classList.contains("icon")) {
      return null;
    }

    try {
      const url = new URL(anchor.href, location.href);
      const pathParts = url.pathname
        .split("/")
        .filter((part) => part.length > 0);

      const pageName = decodeURIComponent(
        pathParts.at(-1) ?? "",
      ).toLowerCase();

      if (
        pageName === "o" ||
        pageName === "v" ||
        pageName === "x"
      ) {
        return pageName;
      }

      return null;
    } catch (error) {
      console.error(
        "[Checkbox Toggle] リンクの解析に失敗しました。",
        error,
      );

      return null;
    }
  };

  /**
   * イベントが発生したチェックボックスを取得します。
   *
   * @param {Event} event
   * @returns {HTMLAnchorElement | null}
   */
  const getCheckboxAnchor = (event) => {
    if (!(event.target instanceof Element)) {
      return null;
    }

    const anchor = event.target.closest("a[href]");

    if (!(anchor instanceof HTMLAnchorElement)) {
      return null;
    }

    return getCheckboxState(anchor) === null
      ? null
      : anchor;
  };

  /**
   * DOM上の行からPage.linesの行番号を取得します。
   *
   * @param {HTMLElement} lineElement
   * @returns {number}
   */
  const getLineIndex = (lineElement) => {
    const lineElements = Array.from(
      document.querySelectorAll(".lines .line"),
    );

    const domIndex = lineElements.indexOf(lineElement);

    if (
      domIndex >= 0 &&
      api.Page.lines?.[domIndex] !== undefined
    ) {
      return domIndex;
    }

    /*
     * DOM順序で見つからなかった場合のフォールバックです。
     */
    const elementId = lineElement.id;

    if (elementId.length === 0) {
      return -1;
    }

    return (
      api.Page.lines?.findIndex((line) => {
        const lineWithId =
          /** @type {CosenseLine & { id?: string }} */ (line);

        return (
          lineWithId.id === elementId ||
          `L${lineWithId.id ?? ""}` === elementId
        );
      }) ?? -1
    );
  };

  /**
   * 行内で何番目のチェックボックスが押されたかを取得します。
   *
   * @param {HTMLElement} lineElement
   * @param {HTMLAnchorElement} clickedAnchor
   * @returns {number}
   */
  const getCheckboxOrdinal = (
    lineElement,
    clickedAnchor,
  ) => {
    const checkboxAnchors = Array.from(
      lineElement.querySelectorAll("a[href]"),
    ).filter(
      (element) =>
        element instanceof HTMLAnchorElement &&
        getCheckboxState(element) !== null,
    );

    return checkboxAnchors.indexOf(clickedAnchor);
  };

  /**
   * 指定されたチェックボックスのみを書き換えます。
   *
   * @param {string} lineText
   * @param {number} targetOrdinal
   * @returns {string | null}
   */
  const replaceCheckbox = (
    lineText,
    targetOrdinal,
  ) => {
    let currentOrdinal = -1;
    let replaced = false;

    const updatedText = lineText.replace(
      /\[([ovx])\]/gi,
      (matchedText, rawState) => {
        currentOrdinal += 1;

        if (currentOrdinal !== targetOrdinal) {
          return matchedText;
        }

        const currentState =
          /** @type {CheckboxState} */ (
            String(rawState).toLowerCase()
          );

        const nextState = nextStateMap[currentState];

        if (!nextState) {
          return matchedText;
        }

        replaced = true;
        return `[${nextState}]`;
      },
    );

    return replaced ? updatedText : null;
  };

  /**
   * チェックボックスを切り替えます。
   *
   * @param {HTMLAnchorElement} anchor
   * @returns {void}
   */
  const toggleCheckbox = (anchor) => {
    const lineElement = anchor.closest(".line");

    if (!(lineElement instanceof HTMLElement)) {
      return;
    }

    const lineIndex = getLineIndex(lineElement);

    if (lineIndex < 0) {
      console.warn(
        "[Checkbox Toggle] 行番号を取得できませんでした。",
        lineElement,
      );
      return;
    }

    const line = api.Page.lines?.[lineIndex];

    if (!line) {
      console.warn(
        "[Checkbox Toggle] Page.linesに対応する行がありません。",
        lineIndex,
      );
      return;
    }

    const targetOrdinal = getCheckboxOrdinal(
      lineElement,
      anchor,
    );

    if (targetOrdinal < 0) {
      console.warn(
        "[Checkbox Toggle] チェックボックスの位置を取得できませんでした。",
      );
      return;
    }

    const updatedText = replaceCheckbox(
      line.text,
      targetOrdinal,
    );

    if (
      updatedText === null ||
      updatedText === line.text
    ) {
      console.warn(
        "[Checkbox Toggle] チェックボックスを置換できませんでした。",
        {
          lineIndex,
          targetOrdinal,
          lineText: line.text,
        },
      );
      return;
    }

    try {
      api.Page.updateLine(updatedText, lineIndex);
    } catch (error) {
      console.error(
        "[Checkbox Toggle] 行の更新に失敗しました。",
        error,
      );
    }
  };

  /**
   * Cosense標準のフォーカス処理を停止します。
   *
   * @param {Event} event
   * @returns {HTMLAnchorElement | null}
   */
  const suppressDefaultBehavior = (event) => {
    const anchor = getCheckboxAnchor(event);

    if (!anchor) {
      return null;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    return anchor;
  };

  /**
   * pointerdownで更新します。
   *
   * clickまで待つと、その前にCosenseが行を編集状態にするため、
   * pointerdownの段階で処理します。
   *
   * @param {Event} event
   * @returns {void}
   */
  const handlePointerDown = (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const anchor = suppressDefaultBehavior(event);

    if (!anchor) {
      return;
    }

    /*
     * イベント処理中のDOM更新との競合を避けるため、
     * 現在のイベント処理終了後に行を書き換えます。
     */
    queueMicrotask(() => {
      toggleCheckbox(anchor);
    });
  };

  /**
   * Cosenseが使用するmousedownも停止します。
   *
   * @param {Event} event
   * @returns {void}
   */
  const handleMouseDown = (event) => {
    if (!(event instanceof MouseEvent)) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    suppressDefaultBehavior(event);
  };

  /**
   * リンクページへの遷移を停止します。
   *
   * @param {Event} event
   * @returns {void}
   */
  const handleClick = (event) => {
    suppressDefaultBehavior(event);
  };

  /*
   * UserScript再読み込み時のイベント重複を防ぎます。
   */
  if (typedWindow.__checkboxTogglePointerDown__) {
    window.removeEventListener(
      "pointerdown",
      typedWindow.__checkboxTogglePointerDown__,
      true,
    );
  }

  if (typedWindow.__checkboxToggleMouseDown__) {
    window.removeEventListener(
      "mousedown",
      typedWindow.__checkboxToggleMouseDown__,
      true,
    );
  }

  if (typedWindow.__checkboxToggleClick__) {
    window.removeEventListener(
      "click",
      typedWindow.__checkboxToggleClick__,
      true,
    );
  }

  const pointerDownListener =
    /** @type {EventListener} */ (
      handlePointerDown
    );

  const mouseDownListener =
    /** @type {EventListener} */ (
      handleMouseDown
    );

  const clickListener =
    /** @type {EventListener} */ (
      handleClick
    );

  typedWindow.__checkboxTogglePointerDown__ =
    pointerDownListener;

  typedWindow.__checkboxToggleMouseDown__ =
    mouseDownListener;

  typedWindow.__checkboxToggleClick__ =
    clickListener;

  /*
   * windowのキャプチャフェーズで捕捉し、
   * Cosense側の行フォーカス処理より先に停止します。
   */
  window.addEventListener(
    "pointerdown",
    pointerDownListener,
    true,
  );

  window.addEventListener(
    "mousedown",
    mouseDownListener,
    true,
  );

  window.addEventListener(
    "click",
    clickListener,
    true,
  );

  console.log(
    "[Checkbox Toggle] チェックボックス切り替えを有効化しました。",
  );
})();