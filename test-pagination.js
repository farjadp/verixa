const cheerio = require("cheerio");
(async () => {
    const res = await fetch("https://www.canada.ca/en/news.html");
    const text = await res.text();
    const $ = cheerio.load(text);
    const np = $("a").filter(function() {
        return $(this).text().toLowerCase().includes("next");
    }).attr("href");
    console.log("Next page href using 'next' text:", np);
})();
