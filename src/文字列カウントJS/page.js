scrapbox.PageMenu.addItem({
    title: () => {
      if (!scrapbox.Page.lines) return
      const chars = scrapbox.Page.lines.map(line => line.text.length).reduce((a,b) => a + b)
      const words = scrapbox.Page.lines.map(line => line.text.split(/\s+/).length).reduce((a,b) => a + b)
      return `${chars}文字 ${words}単語 ${scrapbox.Page.lines.length}行`
    },
    onClick: () => null
  })