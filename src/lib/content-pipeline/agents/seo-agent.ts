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

/** Pure: rank existing posts by title overlap + shared immigration paths. */
export function pickRelatedPosts(
  draft: { title: string; immigrationPaths: string[] },
  posts: { title: string; slug: string; immigrationPaths: string | null }[],
  limit = 3
): { title: string; slug: string }[] {
  const tokens = tokenize(draft.title);
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
      return { p, s: jaccard(tokens, tokenize(p.title)) + shared * 0.25 };
    })
    .filter((x) => x.s > 0.05)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => ({ title: x.p.title, slug: x.p.slug }));
}

export function provenanceFooter(sourceName: string, sourceUrl: string | null, date: Date): string {
  const d = date.toISOString().slice(0, 10);
  const src = sourceUrl ? `[${sourceName}](${sourceUrl})` : sourceName;
  return `*Prepared by the Verixa editorial team from official information published by ${src}. Last reviewed ${d}. This article is general information, not legal advice.*`;
}

export async function optimizeSeo(
  deps: PipelineDeps,
  input: { draft: Draft; sourceName: string; sourceUrl: string | null; language: LanguageSetting }
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
  const slug = uniqueSlug(base, new Set(taken.map((t) => t.slug)));

  const paths = draft.immigrationPaths.map(pathByKey).filter((p): p is ContentPath => !!p);
  const internalLinks = buildInternalLinks({
    paths,
    related: pickRelatedPosts(draft, recent),
    excludeSlug: slug,
  });

  const markdown = assembleArticle({
    disclaimer: disclaimerFor(language),
    sections: draft.sections,
    faq: draft.faq,
    citations: draft.citations,
    internalLinks,
    secondarySummary: language.secondary ? draft.secondarySummary : null,
    secondaryLanguageName: language.secondary?.name ?? null,
    footer: provenanceFooter(input.sourceName, input.sourceUrl, now),
  });

  const metaTitle = buildMetaTitle(draft.title);
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
