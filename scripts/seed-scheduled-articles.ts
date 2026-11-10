// Seeds a scheduled article series.
//   npx tsx scripts/seed-scheduled-articles.ts                        # levels series, dry run
//   npx tsx scripts/seed-scheduled-articles.ts --series rcip          # RCIP series, dry run
//   npx tsx scripts/seed-scheduled-articles.ts --series rcip --apply  # writes to DATABASE_URL
// The "NOW" article is published immediately. All others are stored unpublished
// with source "SCHEDULED" and a future publishedAt; /api/cron/publish-scheduled
// flips them live once publishedAt has passed. Existing slugs are never overwritten.
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { ARTICLES as LEVELS } from "./data/levels-2027-2029-articles";
import { ARTICLES as RCIP } from "./data/rcip-permanent-articles";

const SERIES = { levels: LEVELS, rcip: RCIP } as const;
const seriesArg = process.argv[process.argv.indexOf("--series") + 1];
const seriesName = (process.argv.includes("--series") ? seriesArg : "levels") as keyof typeof SERIES;
if (!(seriesName in SERIES)) {
  console.error(`Unknown series "${seriesArg}". Use one of: ${Object.keys(SERIES).join(", ")}`);
  process.exit(1);
}
const ARTICLES = SERIES[seriesName];

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const host = (process.env.DATABASE_URL || "").replace(/^.*@/, "").split("/")[0];
  console.log(`${apply ? "APPLY" : "DRY RUN"} series=${seriesName} against ${host}`);
  for (const a of ARTICLES) {
    const now = a.publishAt === "NOW";
    const when = now ? new Date() : new Date(a.publishAt);
    const exists = await prisma.blogPost.findUnique({ where: { slug: a.slug }, select: { id: true } });
    console.log(`${exists ? "SKIP (exists)" : now ? "PUBLISH NOW " : "SCHEDULE    "} ${a.tier.padEnd(5)} ${when.toISOString()} ${a.slug}`);
    if (!apply || exists) continue;
    await prisma.blogPost.create({
      data: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        content: a.content.trim(),
        category: a.category,
        seoTitle: a.seoTitle,
        seoDesc: a.seoDesc,
        targetKeyword: a.targetKeyword,
        language: "en",
        source: now ? "MANUAL" : "SCHEDULED",
        isPublished: now,
        publishedAt: when,
      },
    });
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
