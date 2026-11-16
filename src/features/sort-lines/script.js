scrapbox.PopupMenu.addButton({
  title: "ソート",
  onClick: (text) => {
    const re = /^(\s*)/;
    const b = re.exec(text)[1].length;
    const lines = text.split(/\n/);
    let sorting = [],
      chLines = [];
    for (var i = 0; i < lines.length; i++) {
      const line = lines[i];
      while (lines[i + 1] && b < re.exec(lines[i + 1])[1].length) chLines.push(lines[++i]);
      if (0 < chLines.length) chLines.unshift("");
      sorting.push(line + chLines.join("@n@"));
      chLines = [];
    }
    return sorting.sort().join("\n").replace(/@n@/g, "\n");
  },
});
