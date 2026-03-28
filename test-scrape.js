const cheerio = require("cheerio");
(async () => {
    try {
        console.log("Fetching Canada news...");
        const res = await fetch("https://www.canada.ca/en/news.html", {
            headers: { 'User-Agent': 'VerixaBot/2.0 OracleDeepSync' }
        });
        const text = await res.text();
        const $ = cheerio.load(text);
        
        const extractedLinks = [];
        $("a").each((_, el) => {
            const href = $(el).attr("href");
            const title = $(el).text().replace(/\s+/g, ' ').trim();
            const urlLower = href ? href.toLowerCase() : "";
            if (
                href && href.length > 30 && href.includes("-") && title.length > 15 &&
                !urlLower.includes("search") && !urlLower.includes("results") &&
                !urlLower.includes("archive") && !urlLower.includes("tag") &&
                !urlLower.includes("category") && !title.toLowerCase().includes("all news")
            ) {
                extractedLinks.push({ title, link: href });
            }
        });

        console.log("Extracted links count:", extractedLinks.length);
        if (extractedLinks.length > 0) {
            console.log("Sample link:", extractedLinks[0]);
        }
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
})();
