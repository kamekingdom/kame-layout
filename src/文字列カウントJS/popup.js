  scrapbox.PopupMenu.addButton({
       title: function (text) {
         const chars = text.replace(/[\r\n]/g, '').length
         const words = text.trim().split(/[\r\n\s]+/).length
         return `${chars}c ${words}w`
       },
       onClick: () => null
     })