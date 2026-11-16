addTemplateItemsToPageMenu();
function addTemplateItemsToPageMenu() {
  const __icons = [
    // { title: 'チェックボックス未', template: '[o] ' },
    // { title: 'チェックボックス済', template: '[v] ' },
    // { title: 'チェックボックス罰', template: '[x] ' },
    { title: "💻 AC", template: "[/kameLayout/AC.icon] " },
    { title: "💻 NWJ", template: "[/kameLayout/NWJ.icon] " },
    { title: "💻 WJ", template: "[/kameLayout/WJ.icon] " },
    { title: "💻 WA", template: "[/kameLayout/WA.icon] " },
    { title: "💻 RE", template: "[/kameLayout/RE.icon] " },
    { title: "💻 TLE", template: "[/kameLayout/TLE.icon] " },
    { title: "💡 Idea", template: "[/kameLayout/豆電球.icon] " },
    { title: "👍 Good", template: "[/kameLayout/good.icon] " },
    { title: "👎 Bad", template: "[/kameLayout/bad.icon] " },
    { title: "🔴 Important", template: "[/kameLayout/重要.icon] " },
    { title: "🟠 Causion", template: "[/kameLayout/注意.icon] " },
    { title: "🖊️ Split", template: "[/icons/hr.icon]" },
    { title: "🖱️ Click", template: "[/kameLayout/click.icon] " },
    { title: "🦅 Party Parrot", template: "[/kameLayout/PartyParrot.icon] " },
  ];
  // その他のコード
  const __templMenuTitle = "Icons";
  scrapbox.PageMenu.addMenu({
    title: __templMenuTitle,
    image: "https://scrapbox.io/files/6629cb4ebe2c03002398c3e3.png",
    onClick: () => {},
  });
  __icons.forEach((i) => {
    scrapbox.PageMenu(__templMenuTitle).addItem({
      title: i.title,
      onClick: () => {
        __loadTemplate(i.template);
      },
    });
  });
  var __loadTemplate = function (template) {
    const textarea = document.getElementById("text-input");
    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursorPos);
    const textAfter = textarea.value.substring(cursorPos);

    // テンプレートをカーソルの位置に挿入
    textarea.value = textBefore + template + textAfter;

    // カーソルの位置を調整
    textarea.selectionStart = textarea.selectionEnd = cursorPos + template.length;

    // テキストエリアのinputイベントを出しまして
    textarea.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
  };
}
