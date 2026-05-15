// Local repro of the get_legislation_content parse path.
// Usage:  node scripts/test-parser.mjs

import * as cheerio from "cheerio";

const URL = "https://www.legislation.govt.nz/act/public/2020/31/en/latest/";

const resp = await fetch(URL, {
  headers: { "User-Agent": "NZ-Legislation-MCP/1.0" },
  redirect: "follow",
});
console.log("status:", resp.status, "url:", resp.url);
const html = await resp.text();
console.log("html bytes:", html.length);

const $ = cheerio.load(html);

const legislationDiv = $("div#legislation").first();
console.log("div#legislation length:", legislationDiv.length);

const body = legislationDiv.find("div.body").first();
console.log("div.body length:", body.length);

const provs = body.find("div.prov");
console.log("div.prov count:", provs.length);

const h1 = $("h1.title").first();
console.log("h1.title:", h1.text().slice(0, 80));

const reprint = $("p.reprint-date").first();
console.log("p.reprint-date:", reprint.text());

// Try finding section 2 the way the tool does
let foundSection = null;
provs.each((_, prov) => {
  if (foundSection) return false;
  const heading = $(prov).find("h5.prov").first();
  const label = heading.find("span.label").first().text().trim();
  if (label === "2") {
    foundSection = $(prov);
    return false;
  }
});
console.log("section 2 found:", foundSection ? "yes" : "no");
if (foundSection) {
  console.log("section 2 heading:", foundSection.find("h5.prov").first().text().slice(0, 80));
}
