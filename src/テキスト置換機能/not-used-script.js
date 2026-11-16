document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
        // 置換前のテキストを入力させる
        const before = prompt('置換前のテキストを入力してください🐢', '');
        if (!before) return; // キャンセルされたら終了

        // 置換後のテキストを入力させる
        const after = prompt('置換後のテキストを入力してください🐢', '');

        // 置換処理を行うためのテキスト収集
        let fullText = document.querySelector('.editor .lines').innerText;

        // 置換実行
        fullText = fullText.replace(new RegExp(escapeRegExp(before), 'g'), after);

        // 置換後のテキストをクリップボードにコピー
        navigator.clipboard.writeText(fullText).then(() => {
            alert('置換後のテキストをクリップボードにコピーしました🐢\nCtrl + A（全体選択）と Ctrl + V（貼り付け）を行って下さい。');
        });
    }
});

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 特殊文字をエスケープ
}
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
        const input = prompt('置換ルールを入力してください（形式: "oldText => newText"、複数可）:', 'oldText => newText');
        if (!input) return;

        // 置換処理を行うためのテキスト収集
        let fullText = document.querySelector('.editor .lines').innerText;

        // ルールに基づいて置換
        const commands = input.split('\n').map(command => {
            const [before = '', after = ''] = command.split(' => ', 2);
            return { before, after };
        });

        commands.forEach(({ before, after }) => {
            fullText = fullText.replace(new RegExp(escapeRegExp(before), 'g'), after);
        });

        // 置換後のテキストをクリップボードにコピー
        navigator.clipboard.writeText(fullText).then(() => {
            alert('置換後のテキストをクリップボードにコピーしました。編集モードでペーストしてください。');
        });
    }
});

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 特殊文字をエスケープ
}

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
        const input = prompt('置換ルールを入力してください（形式: "oldText => newText"、複数可、改行には\\nを使用）:', 'こんにちは\\nありがとう => こんばんは\\nどういたしまして');
        if (!input) return;

        const commands = input.split('\n').map(command => {
            const [before = '', after = ''] = command.split(' => ', 2);
            const processedBefore = before.replace(/\\n/g, '\n');
            const processedAfter = after.replace(/\\n/g, '\n');
            return { before: processedBefore, after: processedAfter };
        });

        // 一時的に全テキストを収集し、置換後に再配置
        let fullText = '';
        const textNodes = [];

        function collectTextNodes(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                textNodes.push(node); // テキストノードを配列に保存
                fullText += node.nodeValue; // テキストを集約
            } else {
                node.childNodes.forEach(collectTextNodes);
            }
        }

        // テキストノードの集約
        document.querySelectorAll('.lines').forEach(line => collectTextNodes(line));

        // 置換処理
        commands.forEach(({ before, after }) => {
            const reg = new RegExp(escapeRegExp(before), 'g');
            fullText = fullText.replace(reg, after);
        });

        // テキストノードに置換後のテキストを再配置
        let currentIndex = 0;
        textNodes.forEach(node => {
            const length = node.nodeValue.length;
            node.nodeValue = fullText.substring(currentIndex, currentIndex + length);
            currentIndex += length;
        });
    }
});

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 特殊文字をエスケープ
}