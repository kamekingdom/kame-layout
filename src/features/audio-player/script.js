import { scan } from "./players.js";

// # Author: kamekingdom (2026-08-21)

(() => {
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
