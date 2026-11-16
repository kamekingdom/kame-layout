// Author: kamekingdom (2026-11-13)

/**
 * Ctrl + Enter で新規ページを作成する。
 * 入力欄で編集中の場合は実行しない。
 *
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function handleNewPageShortcut(event) {
  if (!event.ctrlKey || event.key !== "Enter") {
    return;
  }

  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const tagName = target.tagName;

  const isTextarea = tagName === "TEXTAREA";
  const isInput = tagName === "INPUT";

  // TEXTAREA内では実行しない
  if (isTextarea) {
    return;
  }

  // INPUT内に文字が入力されている場合は実行しない
  if (isInput) {
    const input = /** @type {HTMLInputElement} */ (target);

    if (input.value !== "") {
      return;
    }
  }

  const project = window.location.pathname.split("/")[1];

  if (!project) {
    return;
  }

  event.preventDefault();

  window.location.href = `/${encodeURIComponent(project)}/new`;
}

document.addEventListener("keydown", handleNewPageShortcut);
