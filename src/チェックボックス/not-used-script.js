// Ctrl + Q で ⬜ を挿入（エディタに任せる）
   document.addEventListener('keydown', (e) => {
     if (e.key === 'q' && e.ctrlKey && !e.shiftKey) {
       e.preventDefault();
       document.execCommand('insertText', false, '⬜ ');
     }
   });
   
   // ⬜ / ✅ をトグルする（動的に追加されたものも対象）
   document.addEventListener('click', (e) => {
     if (e.target.nodeType === Node.TEXT_NODE) return; // テキストノードなら無視
     if (e.target.textContent === '⬜') {
       e.target.textContent = '✅';
     } else if (e.target.textContent === '✅') {
       e.target.textContent = '⬜';
     }
   });
   
   // ⬜ を span.checkbox にラップしてクリック可能に（動的処理）
   const observer = new MutationObserver((mutations) => {
     for (const mutation of mutations) {
       mutation.addedNodes.forEach(node => {
         if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('⬜')) {
           const span = document.createElement('span');
           span.className = 'checkbox';
           span.style.cursor = 'pointer';
           span.textContent = '⬜';
           node.parentNode.replaceChild(span, node);
         }
       });
     }
   });
   
   // Scrapboxエディタ内を監視（ページ全体で問題ない）
   observer.observe(document.body, {
     childList: true,
     subtree: true
   });