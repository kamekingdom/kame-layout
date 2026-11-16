// const sortMode = 'periodic' // 等間隔
const sortMode = 'log' // 間隔反復法
let visibleRankNum = 15; // log以外では無視される
let projectPages;

scrapbox.PageMenu.addMenu({
    title: 'Scrapbox Sort',
    image: 'https://gyazo.com/11140c8b35b407c5d490a94ec6f2528f/raw',
    onClick: () => {
        scrapbox.PageMenu('Scrapbox Sort').addItem({ title: 'Please wait...', image: null, onClick: () => null })
        let projectPages = scrapbox.Project.pages.slice()
        const now = Date.now()
        const day = 60 * 60 * 24 * 1000
        const year = day * 365
        const intervals = [7, 15, 30, 60, 120, 180, 365].map(int => int * day)
        projectPages.forEach(page => {
            const diff = now - page.updated * 1000
            if (sortMode === 'log') {
                page.score = diff > 10 * day ? (Math.log(diff / (10 * day)) / Math.log(2)) % 1 : year
                page.ago = Math.floor(diff / day)
            } else { // periodic
                for (const interval of intervals) {
                    if (day < interval - diff && interval - diff < 2 * day) {
                        page.score = interval
                        page.ago = interval / day
                        break
                    }
                }
            }
        })
        projectPages = projectPages.filter(page => page.score && page.ago)
        projectPages.sort((page1, page2) => (sortMode == 'log' ? page1.score - page2.score : page2.score - page1.score))
        scrapbox.PageMenu('Scrapbox Sort').removeAllItems()
        if (sortMode != 'log') visibleRankNum = projectPages.length
        projectPages.slice(0, visibleRankNum).forEach(page => {
            scrapbox.PageMenu('Scrapbox Sort').addItem({
                title: `(${('000'+page.ago).slice(-3)}日前)　${page.title}`,
                image: null,
                onClick: () => window.open(`/${scrapbox.Project.name}/${encodeURIComponent(page.title)}`)
            })
        })
    }
})