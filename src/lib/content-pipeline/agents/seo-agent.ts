// ============================================================================
// Agent 4 — SEO
// Deterministic (no LLM call): slug, meta title/description, target keyword,
// heading structure fix, internal links to related posts and consultants,
// image alt text, and the Article JSON-LD. Assembles the final markdown.
// ============================================================================
import type { PipelineDeps } from "../types";
import type { Draft } from "./writer";
import { disclaimerFor, type LanguageSetting } from "../language";
import { pathByKey, type ContentPath } from "../paths";
import { jaccard, tokenize } from "../dedup";
import {
  buildArticleJsonLd,
  buildInternalLinks,
  buildMetaDescription,
  buildMetaTitle,
  buildSlug,
  checkHeadingStructure,
  truncateAtWord,
  uniqueSlug,
  type InternalLink,
} from "../seo";
import { assembleArticle } from "../markdown";

export interface SeoResult {
  slug: string;
  metaTitle: string;
  metaDesc: string;
  targetKeyword: string;
  keywords: string[];
  imageAlt: string;
  internalLinks: InternalLink[];
  headingIssues: string[];
  markdown: string;
  jsonLd: Record<string, unknown>;
}

/** Words every immigration headline shares; they say nothing about the topic. */
const GENERIC_TITLE_WORDS = new Set([
  "canada", "canadian", "canadas", "immigration", "immigrants", "ircc", "update", "updates", "updated", "new",
  "program", "programs", "system", "changes", "change", "announces", "announced", "what", "know", "need", "2025", "2026", "2027",
]);
export const RELATED_MIN_TITLE_OVERLAP = 0.25;

/**
 * Pure: existing posts that are actually about the same thing — they share a
 * specific immigration path, or their titles overlap on topic words (generic
 * words like "Canada"/"immigration"/"update" don't count). Nothing is better
 * than an unrelated link.
 */
export function pickRelatedPosts(
  draft: { title: string; immigrationPaths: string[] },
  posts: { title: string; slug: string; immigrationPaths: string | null }[],
  limit = 3
): { title: string; slug: string }[] {
  const topical = (t: string) => new Set([...tokenize(t)].filter((w) => !GENERIC_TITLE_WORDS.has(w)));
  const tokens = topical(draft.title);
  const paths = new Set(draft.immigrationPaths.filter((p) => p !== "general"));
  return posts
    .map((p) => {
      let shared = 0;
      try {
        const ps: unknown = p.immigrationPaths ? JSON.parse(p.immigrationPaths) : [];
        if (Array.isArray(ps)) shared = ps.filter((k) => typeof k === "string" && paths.has(k)).length;
      } catch {
        /* legacy posts have no path tags */
      }
      const overlap = jaccard(tokens, topical(p.title));
      return { p, shared, overlap, s: overlap + shared * 0.25 };
    })
    .filter((x) => x.shared > 0 || x.overlap >= RELATED_MIN_TITLE_OVERLAP)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => ({ title: x.p.title, slug: x.p.slug }));
}

export function provenanceFooter(lang: LanguageSetting, sourceName: string, sourceUrl: string | null, date: Date): string {
  const src = sourceUrl ? `[${sourceName.replace(/[[\]]/g, "")}](${sourceUrl})` : sourceName;
  return lang.primary.labels.footer(src, date.toISOString().slice(0, 10));
}

export async function optimizeSeo(
  deps: PipelineDeps,
  input: { draft: Draft; sourceName: string; sourceUrl: string | null; language: LanguageSetting; ownSlug?: string }
): Promise<SeoResult> {
  const { draft, language } = input;
  const now = deps.now();

  const base = buildSlug(draft.slug, draft.targetKeywordEn, draft.title);
  const [taken, recent] = await Promise.all([
    deps.db.blogPost.findMany({ where: { slug: { startsWith: base } }, select: { slug: true }, take: 100 }),
    deps.db.blogPost.findMany({
      where: { isPublished: true },
      select: { title: true, slug: true, immigrationPaths: true },
      orderBy: { publishedAt: "desc" },
      take: 100,
    }),
  ]);
  // When regenerating a draft in place, its current slug is not "taken" by someone else.
  const slug = input.ownSlug && input.ownSlug.startsWith(base) ? input.ownSlug : uniqueSlug(base, new Set(taken.map((t) => t.slug)));

  const paths = draft.immigrationPaths.map(pathByKey).filter((p): p is ContentPath => !!p);
  const internalLinks = buildInternalLinks({
    paths,
    related: pickRelatedPosts(draft, recent),
    excludeSlug: slug,
    consultantLabel: language.primary.labels.consultantLink,
  });

  const markdown = assembleArticle({
    disclaimer: disclaimerFor(language),
    sections: draft.sections,
    faq: draft.faq,
    citations: draft.citations,
    internalLinks,
    secondarySummary: language.secondary ? draft.secondarySummary : null,
    secondaryLanguageName: language.secondary?.name ?? null,
    footer: provenanceFooter(language, input.sourceName, input.sourceUrl, now),
    labels: language.primary.labels,
  });

  // Prefer the writer's short search title; truncating the headline would end in "…".
  const metaTitle = buildMetaTitle(draft.metaTitle?.trim() ? draft.metaTitle : draft.title);
  const metaDesc = buildMetaDescription(draft.summary);
  const keywords = [draft.targetKeyword, ...draft.secondaryKeywords].map((k) => k.trim()).filter(Boolean).slice(0, 8);
  const imageAlt = truncateAtWord(draft.imageAlt || draft.title, 125);

  return {
    slug,
    metaTitle,
    metaDesc,
    targetKeyword: draft.targetKeyword.trim(),
    keywords,
    imageAlt,
    internalLinks,
    headingIssues: checkHeadingStructure(markdown),
    markdown,
    jsonLd: buildArticleJsonLd({
      title: draft.title,
      description: metaDesc,
      slug,
      datePublished: now,
      keywords,
      inLanguage: language.primary.code,
      citations: draft.citations.map((c) => c.url),
      section: paths[0]?.label,
    }),
  };
}
