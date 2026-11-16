scrapbox.on('page:changed', ()=>{
 	const title=scrapbox.Page.title;
 	const deleteButton = document.querySelector('a[title="Delete"]');
 	if(title=='Untitled'||/Untitled_\d+/.test(title)) {deleteButton.click();};
 })