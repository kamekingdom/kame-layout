(() => {
  const menuTitle = 'Pinned'
  scrapbox.PageMenu.addMenu({
    title: menuTitle,
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/OOjs_UI_icon_pushPin.svg',
    onClick: () => {
      scrapbox.PageMenu(menuTitle).removeAllItems()
      fetch(`/api/pages/${scrapbox.Project.name}`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          const pinnedPages = Array.from(data.pages).filter(page => 0 < page.pin)
          pinnedPages.forEach(page => {
            scrapbox.PageMenu(menuTitle).addItem({
              title: page.title,
              onClick: e => { e.currentTarget.setAttribute("href", `./${page.title}`) }
            })
          })
        })
    }
  })
})();