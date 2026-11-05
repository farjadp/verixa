/**
 * Seed default official sources for the Content Pipeline (ContentSource rows).
 *
 * Run with:   npx tsx scripts/seed-content-sources.ts
 * Dry run:    npx tsx scripts/seed-content-sources.ts --dry-run
 *
 * Idempotent: a source whose URL already exists is left untouched, so admin
 * edits (enable/disable, trust score) are never overwritten. This list is a
 * starting default — edit sources in the admin News Aggregator page.
 *
 * Verified feeds are enabled. Provincial program pages are seeded DISABLED:
 * check that each page lists news/updates links before enabling it.
 */
import { PrismaClient } from "@prisma/client";

type SeedSource = { name: string; url: string; type: "RSS" | "WEB_SCRAPE"; trustScore: number; enabled: boolean };

const SOURCES: SeedSource[] = [
  // Federal — verified feed (Atom), news releases from IRCC via the Government of Canada news API.
  {
    name: "IRCC — News releases (canada.ca)",
    url: "https://api.io.canada.ca/io-server/gc/news/en/v2?dept=departmentofcitizenshipandimmigration&sort=publishedDate&orderBy=desc&pick=50&format=atom&atomtitle=Immigration,%20Refugees%20and%20Citizenship%20Canada",
    type: "RSS",
    trustScore: 100,
    enabled: true,
  },
  // Industry news (commercial publisher, not government) — useful for trend discovery; lower trust.
  { name: "CIC News", url: "https://www.cicnews.com/feed", type: "RSS", trustScore: 70, enabled: true },

  // Provincial / territorial programs — seeded disabled until verified.
  { name: "Ontario — OINP", url: "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp", type: "WEB_SCRAPE", trustScore: 95, enabled: false },
  { name: "British Columbia — BC PNP", url: "https://www.welcomebc.ca/Immigrate-to-B-C/About-The-BC-PNP", type: "WEB_SCRAPE", trustScore: 95, enabled: false },
  { name: "Alberta — AAIP", url: "https://www.alberta.ca/alberta-advantage-immigration-program", type: "WEB_SCRAPE", trustScore: 95, enabled: false },
  { name: "Saskatchewan — SINP", url: "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program", type: "WEB_SCRAPE", trustScore: 95, enabled: false },
  { name: "Manitoba — MPNP notices", url: "https://immigratemanitoba.com/notices/", type: "WEB_SCRAPE", trustScore: 95, enabled: false },
  { name: "Nova Scotia — NSNP", url: "https://liveinnovascotia.com/nova-scotia-nominee-program", type: "WEB_SCRAPE", trustScore: 95, enabled: false },
  { name: "New Brunswick — Immigration", url: "https://www.welcomenb.ca/", type: "WEB_SCRAPE", trustScore: 90, enabled: false },
  { name: "Prince Edward Island — Office of Immigration", url: "https://www.princeedwardisland.ca/en/topic/office-immigration", type: "WEB_SCRAPE", trustScore: 90, enabled: false },
  { name: "Newfoundland and Labrador — Immigration", url: "https://www.gov.nl.ca/immigration/", type: "WEB_SCRAPE", trustScore: 90, enabled: false },
  { name: "Québec — Immigration (MIFI)", url: "https://www.quebec.ca/en/immigration", type: "WEB_SCRAPE", trustScore: 95, enabled: false },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();
  let created = 0;
  let kept = 0;
  try {
    for (const s of SOURCES) {
      const existing = await prisma.contentSource.findFirst({ where: { url: s.url }, select: { id: true } });
      if (existing) {
        kept++;
        console.log(`= exists   ${s.name}`);
        continue;
      }
      if (!dryRun) await prisma.contentSource.create({ data: s });
      created++;
      console.log(`${dryRun ? "~ would add" : "+ added  "} ${s.name}${s.enabled ? "" : " (disabled)"}`);
    }
    console.log(`\n${dryRun ? "Dry run: " : ""}${created} added, ${kept} already present.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
