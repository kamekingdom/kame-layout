// Author: kamekingdom (2026-11-13)

/**
 * @typedef {{
 *   title: string,
 *   template: string
 * }} Template
 */

/* =========================================================
   Templates
   ========================================================= */

/** @type {Template[]} */
const templates = [
  {
    title: "論文メモ",
    template: "/api/code/kamelayout/Template/thesis.txt"
  },
  {
    title: "授業ノート",
    template: "/api/code/kamelayout/Template/classNote.txt"
  },
  {
    title: "マイノート",
    template: "/api/code/kamelayout/Template/myNote.txt"
  },
  {
    title: "書籍",
    template: "/api/code/kamelayout/Template/reference.txt"
  },
  {
    title: "ミーティング",
    template: "/api/code/kamelayout/Template/meeting.txt"
  },
  {
    title: "diary",
    template: "/api/code/kamelayout/Template/diary.txt"
  }
];

/* =========================================================
   Load Template
   ========================================================= */

/**
 * テンプレートを取得し、Cosenseの編集欄に挿入する。
 *
 * @param {string} templateUrl
 * @returns {Promise<void>}
 */
async function loadTemplate(templateUrl) {
  const page = window.scrapbox?.Page;

  // タイトル行しかないページで実行
  if (!page?.lines || page.lines.length !== 1) {
    console.warn(
      "[Template] 空のページでのみ使用できます。"
    );
    return;
  }

  // 非同期読み込み中に別ページへ移動した場合の対策
  const originalPath = window.location.pathname;

  try {
    /* -----------------------------------------------------
       Fetch Template
       ----------------------------------------------------- */

    const response = await fetch(templateUrl, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${templateUrl}`
      );
    }

    const contentType =
      response.headers.get("content-type") ?? "";

    if (
      contentType.includes("application/json") ||
      contentType.includes("text/html")
    ) {
      throw new Error(
        `テンプレートではないレスポンス: ${contentType}`
      );
    }

    /** @type {string} */
    const templateText = await response.text();

    /* -----------------------------------------------------
       Validate Current Page
       ----------------------------------------------------- */

    if (
      window.location.pathname !== originalPath ||
      !page.lines ||
      page.lines.length !== 1
    ) {
      console.warn(
        "[Template] ページが変更されたため処理を中止しました。"
      );
      return;
    }

    /* -----------------------------------------------------
       Focus Editor
       ----------------------------------------------------- */

    const firstLine = page.lines[0];

    const lineElement = document.getElementById(
      `L${firstLine.id}`
    );

    const lastChar = lineElement?.querySelector(
      "span.char-index:last-of-type"
    );

    const textarea = document.getElementById(
      "text-input"
    );

    if (
      !(lastChar instanceof HTMLElement) ||
      !(textarea instanceof HTMLTextAreaElement)
    ) {
      throw new Error(
        "Cosenseの編集欄を取得できませんでした。"
      );
    }

    // 元の実装と同様にタイトル末尾をクリック
    lastChar.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      })
    );

    // Endキーの処理を通知
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "End",
        code: "End",
        keyCode: 35,
        which: 35,
        bubbles: true,
        cancelable: true
      })
    );

    /* -----------------------------------------------------
       Insert Template
       ----------------------------------------------------- */

    // ネイティブsetterを利用して値を設定
    const valueSetter =
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;

    if (valueSetter) {
      valueSetter.call(textarea, templateText);
    } else {
      textarea.value = templateText;
    }

    // Cosenseへ入力イベントを通知
    textarea.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: templateText
      })
    );

    console.info(
      "[Template] テンプレート入力イベントを送信しました。",
      templateUrl
    );

  } catch (error) {
    console.error(
      "[Template] テンプレートの読み込みに失敗しました。",
      error
    );
  }
}

/* =========================================================
   Page Menu
   ========================================================= */

/** @type {string} */
const menuTitle = "Templates";

scrapbox.PageMenu.addMenu({
  title: menuTitle,
  image:
    "https://scrapbox.io/files/6629ce7dba7a560025581988.png",
  onClick: () => {}
});

for (const template of templates) {
  scrapbox.PageMenu(menuTitle).addItem({
    title: template.title,

    onClick: () => {
      void loadTemplate(template.template);
    }
  });
}

console.info("[Template] loaded");