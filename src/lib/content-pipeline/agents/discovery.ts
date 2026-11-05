// ============================================================================
// Agent 1 — Discovery
// Reads enabled official ContentSource rows (RSS/Atom + a light, single-page,
// same-host link scrape — the same approach as aggregator.actions.ts) and turns
// items into candidate topics tagged with immigration paths.
// ============================================================================
import * as cheerio from "cheerio";
import type { PipelineDeps } from "../types";
import type { Candidate } from "../dedup";
import { tagImmigrationPaths } from "../paths";

export const MAX_SOURCES = 25;
export const ITEMS_PER_SOURCE = 10;

/** Pure: extract article-like links from a listing page. Same host only — no crawling outward. */
export function extractListingLinks(html: string, pageUrl: string, limit = ITEMS_PER_SOURCE): { title: string; link: string }[] {
  const $ = cheerio.load(html);
  let host = "";
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const out: { title: string; link: string }[] = [];
  $("a").each((_, el) => {
    if (out.length >= limit) return false;
    const href = $(el).attr("href");
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || title.length < 20 || title.length > 200) return;
    let u: URL;
    try {
      u = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (!/^https?:$/.test(u.protocol) || u.hostname !== host) return;
    const path = u.pathname.toLowerCase();
    if (path.length < 15 || !path.includes("-")) return;
    // Skip listing/utility pages by path SEGMENT, so an article slug like "...-draw-results.html" is kept.
    if (/\/(search|results?|archive|tags?|category|categories|login|sign-?in|contact|privacy|terms)(\/|\.|-|$)/.test(path)) return;
    if (/^(all news|more news|read more|next|previous)$/i.test(title)) return;
    u.hash = "";
    const link = u.href;
    if (seen.has(link)) return;
    seen.add(link);
    out.push({ title, link });
  });
  return out;
}

/** Pure: readable main text of an article page, for the writer and reviewer. */
export function extractMainText(html: string, maxChars = 15000): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, aside, form, iframe, svg").remove();
  const main = $("main").first().text() || $("article").first().text() || $("body").text();
  return main.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

/**
 * Pure: links in the page's main content that point to other pages of the same
 * publisher section (same host and same first two path segments, e.g.
 * /en/immigration-refugees-citizenship/…). Used to enrich a thin official
 * update with the instruction pages it lists. Skips the page itself, anchors,
 * files and navigation-length labels.
 */
export function extractOfficialLinks(html: string, pageUrl: string, max = 4): { title: string; url: string }[] {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const prefix = base.pathname.split("/").filter(Boolean).slice(0, 2).join("/");
  const $ = cheerio.load(html);
  const scope = $("main").first().length ? $("main").first() : $("article").first().length ? $("article").first() : $("body");
  scope.find("nav, footer, header, aside, form, .pagedetails, #wb-dtmd").remove();

  const seen = new Set<string>([base.origin + base.pathname]);
  const out: { title: string; url: string }[] = [];
  scope.find("a[href]").each((_, el) => {
    if (out.length >= max) return false;
    const href = $(el).attr("href") || "";
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || href.startsWith("#") || title.length < 12) return;
    let u: URL;
    try {
      u = new URL(href, base);
    } catch {
      return;
    }
    if (!/^https?:$/.test(u.protocol) || u.host !== base.host) return;
    if (/\.(pdf|docx?|xlsx?|zip|csv)$/i.test(u.pathname)) return;
    if (prefix && !u.pathname.split("/").filter(Boolean).slice(0, 2).join("/").startsWith(prefix)) return;
    const key = u.origin + u.pathname;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ title, url: key });
  });
  return out;
}

export interface DiscoveryResult {
  candidates: Candidate[];
  sourcesChecked: number;
  errors: string[];
}

export async function discoverCandidates(deps: PipelineDeps): Promise<DiscoveryResult> {
  const sources = await deps.db.contentSource.findMany({
    where: { enabled: true },
    orderBy: { trustScore: "desc" },
    take: MAX_SOURCES,
  });

  const candidates: Candidate[] = [];
  const errors: string[] = [];

  // Sources are fetched concurrently so a slow host can't consume the run's time budget.
  const results = await Promise.all(
    sources.map(async (source): Promise<Candidate[]> => {
      try {
        const type = source.type.toUpperCase();
        let items: { title: string; link: string; isoDate?: string | null; snippet?: string | null }[];

        if (type === "RSS") {
          items = (await deps.fetchFeed(source.url)).slice(0, ITEMS_PER_SOURCE);
        } else if (type === "WEB_SCRAPE" || type === "HTML") {
          items = extractListingLinks(await deps.fetchHtml(source.url), source.url);
        } else {
          errors.push(`${source.name}: unsupported source type ${source.type}`);
          return [];
        }

        await deps.db.contentSource.update({ where: { id: source.id }, data: { lastCheckedAt: deps.now() } });

        return items
          .filter((item) => item.title && item.link)
          .map((item) => {
            const snippet = (item.snippet || "").replace(/\s+/g, " ").trim().slice(0, 500);
            const published = item.isoDate ? new Date(item.isoDate) : null;
            return {
              title: item.title.trim(),
              sourceId: source.id,
              sourceUrl: item.link,
              sourceName: source.name,
              sourceTrust: source.trustScore,
              publishedAt: published && !isNaN(published.getTime()) ? published : null,
              snippet,
              paths: tagImmigrationPaths(`${item.title} ${snippet}`),
            };
          });
      } catch (e) {
        errors.push(`${source.name}: ${e instanceof Error ? e.message : String(e)}`);
        return [];
      }
    })
  );
  for (const r of results) candidates.push(...r);

  deps.log(`Discovery: ${candidates.length} candidates from ${sources.length} sources (${errors.length} errors).`);
  return { candidates, sourcesChecked: sources.length, errors };
}
