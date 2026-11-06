// Seeds the 2027-2029 Levels Plan / Budget 2026 article series.
//   npx tsx scripts/seed-scheduled-articles.ts           # dry run (prints plan)
//   npx tsx scripts/seed-scheduled-articles.ts --apply   # writes to DATABASE_URL
// The "NOW" article is published immediately. All others are stored unpublished
// with source "SCHEDULED" and a future publishedAt; /api/cron/publish-scheduled
// flips them live once publishedAt has passed. Existing slugs are never overwritten.
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { ARTICLES } from "./data/levels-2027-2029-articles";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const host = (process.env.DATABASE_URL || "").replace(/^.*@/, "").split("/")[0];
  console.log(`${apply ? "APPLY" : "DRY RUN"} against ${host}`);
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
