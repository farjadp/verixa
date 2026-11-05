/**
 * Run the Content Pipeline on ONE source URL (skips discovery and the daily quota).
 *
 *   npx tsx scripts/run-content-source.ts --url <https://...> [--name "IRCC"] [--dry-run]
 *
 * Uses the live pipeline: OpenAI writer + reviewer, cover image (if
 * content_images_enabled), and the publisher. With content_autopublish_enabled
 * = false (the default) it creates an UNPUBLISHED BlogPost and a QUEUED
 * SocialJob — nothing is posted anywhere. --dry-run only fetches the page and
 * prints what would be sent to the writer.
 */
import * as cheerio from "cheerio";
import { createDefaultDeps } from "@/lib/content-pipeline/default-deps";
import { extractMainText } from "@/lib/content-pipeline/agents/discovery";
import { runSingleSource } from "@/lib/content-pipeline/orchestrator";
import { assertPublicHttpUrl } from "@/lib/content-pipeline/net-guard";
import { prisma } from "@/lib/prisma";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function sourceNameFor(url: URL): string {
  if (url.hostname.endsWith("canada.ca")) return "IRCC";
  return url.hostname.replace(/^www\./, "");
}

async function main() {
  const rawUrl = arg("url");
  if (!rawUrl) throw new Error("Missing --url");
  const url = new URL(rawUrl);
  await assertPublicHttpUrl(url.toString());
  const dryRun = process.argv.includes("--dry-run");

  const deps = await createDefaultDeps();
  const html = await deps.fetchHtml(url.toString());
  const $ = cheerio.load(html);
  const title = ($('meta[name="dcterms.title"]').attr("content") || $("h1").first().text() || $("title").text()).trim();
  const issued = $('meta[name="dcterms.issued"]').attr("content") || $('meta[property="article:published_time"]').attr("content");
  const publishedAt = issued && !Number.isNaN(Date.parse(issued)) ? new Date(issued) : null;
  const text = extractMainText(html);

  console.log(`Title:      ${title}`);
  console.log(`Published:  ${publishedAt ? publishedAt.toISOString().slice(0, 10) : "unknown"}`);
  console.log(`Source:     ${arg("name") || sourceNameFor(url)}`);
  console.log(`Text:       ${text.length} chars`);
  if (!title) throw new Error("Could not read a title from the page.");
  if (dryRun) {
    console.log(`\n--- source text sent to the writer ---\n${text}`);
    return;
  }

  const summary = await runSingleSource(deps, {
    url: url.toString(),
    title,
    sourceName: arg("name") || sourceNameFor(url),
    publishedAt,
  });
  console.log(`\nStatus: ${summary.status}${summary.reason ? ` — ${summary.reason}` : ""}`);
  console.log(`Produced ${summary.produced}, rejected ${summary.rejected}, failed ${summary.failed}. Autopublish ${summary.autopublish ? "ON" : "OFF"}.`);
  if (summary.runId) console.log(`Run id: ${summary.runId}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
