const __appliedProject__ = scrapbox.Project.name
const __charCounterSetup__ = setInterval(function() {
  
  // ページが準備できるのを待ちたいので、スクリプトがロードされてから3秒くらいしたら処理開始↓↓
  if (document.getElementById('editor') && scrapbox.Page.lines)
    clearInterval(__charCounterSetup__)
  else
    return // ページの準備ができてないときはまた3秒待つ
  
  // 下準備
  const $id = id => document.getElementById(id)
  const $query = q => document.querySelector(q)
  const fmt = n => new Intl.NumberFormat('en-US').format(n).padStart(6)
  
  // 文字数カウンター表示用のエレメントを作ってく
  const linesText = $query('.lines').innerText.trim()
  const chars = linesText.split(/\s+/).join('').length
  var counterWrapper = document.createElement('div')
  counterWrapper.id = '__charCounter__'
  counterWrapper.innerHTML = `<span>${fmt(chars)} chars</span>` +
      '<pre id="__charCounterPopup__" style="opacity:0"></pre>'
  $id('editor').appendChild(counterWrapper)
  
  const counter = $query('#__charCounter__ span')
  const popup = $id('__charCounterPopup__')

  // 文字数カウンターにマウスカーソルを乗せたときに詳細をポップアップする
  counter.addEventListener('mouseover',
      function() {
        const linesText = $query('.lines').innerText.trim()
        const chars = linesText.split(/\s+/).join('').length
        const words = linesText.split(/\s+/).length
  
        popup.innerHTML = `${fmt(chars)} chars\n` +
            `${fmt(words)} words\n` +
            `${fmt(scrapbox.Page.lines.length)} lines`
        popup.style.opacity = 1
      })
  
  // 文字数カウンターからマウスカーソルが離れたら詳細ポップアップを見えなくする
  counter.addEventListener('mouseout', function() { popup.style.opacity = 0 })

  // 文字数のみを数え直す関数
  const updateCounter = function() {
    if ($query('.presentation')
        || scrapbox.Project.name !== __appliedProject__) {
      
      // プレゼンモードになってたり、よそのプロジェクトを表示してたら文字数カウンターを非表示にする
      counterWrapper.style.display = 'none'
    } else if (scrapbox.Page.lines) {
      
      // ここで数え直ししてます
      const linesText = $query('.lines').innerText.trim()
      const chars = linesText.split(/\s+/).join('').length
      counter.innerText = `${fmt(chars)} chars`
      counterWrapper.style.display = 'block'
    }
  }
  
  // 数え直すタイミングは、テキスト入力時とペースト時
  $id('text-input').addEventListener('input', updateCounter)
  $id('text-input').addEventListener('paste', updateCounter)
  
  // 何もしなくても3秒ごとに数え直す
  setInterval(updateCounter, 3000)
}, 3000)