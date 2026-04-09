const cheerio = require("cheerio");
(async () => {
    try {
        console.log("Fetching Canada news...");
        const res = await fetch("https://www.canada.ca/en/news.html", {
            headers: { 'User-Agent': 'VerixaBot/2.0' }
        });
        const text = await res.text();
        const $ = cheerio.load(text);
        
        console.log("Looking for pagination links...");
        let nextHref = $("a[rel='next'], a.next, a.page-link-next, a:contains('Next'), a:contains('next')").first().attr("href");
        
        console.log("Selector 1:", nextHref);

        if (!nextHref) {
            $("a").each((_, el) => {
                const t = $(el).text().toLowerCase().trim();
                const h = $(el).attr("href");
                if (t.includes("next") || t.includes("older") || t === ">" || t === ">>" || $(el).attr("rel") === "next") {
                    console.log(`Found text '${t}' with href:`, h);
                }
            });
        }
        
    } catch (e) {
        console.error(e);
    }
})();
