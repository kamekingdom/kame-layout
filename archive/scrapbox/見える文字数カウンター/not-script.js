const __appliedProject__ = scrapbox.Project.name;
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('editor') && scrapbox.Page.lines) {
    setupCounter();
  } else {
    // ページの準備ができていなければ、繰り返しチェック
    setTimeout(setupCounter, 1000);
  }
});

function setupCounter() {
  const $id = id => document.getElementById(id);
  const $query = q => document.querySelector(q);
  const fmt = n => new Intl.NumberFormat('en-US').format(n).padStart(6);

  const linesText = $query('.lines').innerText.trim();
  const chars = linesText.split(/\s+/).join('').length;
  var counterWrapper = document.createElement('div');
  counterWrapper.id = '__charCounter__';
  counterWrapper.innerHTML = `<span>${fmt(chars)} chars</span>` +
      '<pre id="__charCounterPopup__" style="opacity:0"></pre>';
  $id('editor').appendChild(counterWrapper);

  const counter = $query('#__charCounter__ span');
  const popup = $id('__charCounterPopup__');

  counter.addEventListener('mouseover', function() {
    const linesText = $query('.lines').innerText.trim();
    const chars = linesText.split(/\s+/).join('').length;
    const words = linesText.split(/\s+/).length;

    popup.innerHTML = `${fmt(chars)} chars\n` +
        `${fmt(words)} words\n` +
        `${fmt(scrapbox.Page.lines.length)} lines`;
    popup.style.opacity = 1;
  });

  counter.addEventListener('mouseout', function() {
    popup.style.opacity = 0;
  });

  // 文字数の更新関数
  const updateCounter = function() {
    if ($query('.presentation') || scrapbox.Project.name !== __appliedProject__) {
      counterWrapper.style.display = 'none';
    } else if (scrapbox.Page.lines) {
      const linesText = $query('.lines').innerText.trim();
      const chars = linesText.split(/\s+/).join('').length;
      counter.innerText = `${fmt(chars)} chars`;
      counterWrapper.style.display = 'block';
    }
  };

  $id('text-input').addEventListener('input', updateCounter);
  $id('text-input').addEventListener('paste', updateCounter);
  setInterval(updateCounter, 3000);
}
