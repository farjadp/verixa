// ============================================================================
// Content Pipeline — SEO helpers (pure, no I/O; unit tested)
// Slugs, meta tags, heading checks, internal links, JSON-LD.
// ============================================================================

export const BRAND = "Verixa";
export const DEFAULT_SITE_URL = "https://www.getverixa.com"; // same fallback as src/app/layout.tsx
export const META_TITLE_MAX = 60;
export const META_DESC_MAX = 155;
export const SLUG_MAX = 70;

/** Canonical site origin, no trailing slash. Set NEXT_PUBLIC_APP_URL in each environment. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

/**
 * URL slug: ASCII, lowercase, hyphenated, cut on a word boundary at `maxLen`.
 * Non-Latin titles (e.g. Persian) slugify to "" — callers pass the English
 * target keyword as a fallback (see `buildSlug`).
 */
export function slugify(text: string, maxLen = SLUG_MAX): string {
  const base = (text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= maxLen) return base;
  const cut = base.slice(0, maxLen + 1);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 20 ? cut.slice(0, lastDash) : base.slice(0, maxLen)).replace(/-+$/, "");
}

/** Append -2, -3, … until the slug is not in `taken`. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "immigration-update";
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root.slice(0, SLUG_MAX - String(i).length - 1)}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root.slice(0, SLUG_MAX - 14)}-${Date.now()}`;
}

/** First non-empty slug from the candidates (e.g. LLM slug, title, keyword). */
export function buildSlug(...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) {
    const s = slugify(c || "");
    if (s.length >= 3) return s;
  }
  return "immigration-update";
}

export function truncateAtWord(s: string, max: number): string {
  const clean = (s || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

/**
 * Meta title WITHOUT the brand: the root layout's title template appends
 * " | Verixa". Sized so the rendered title stays within 60 characters.
 */
export function buildMetaTitle(title: string, brand = BRAND): string {
  const clean = (title || "").replace(/\s+/g, " ").replace(new RegExp(`\\s*[|\\-–—]\\s*${brand}\\s*$`, "i"), "").trim();
  return truncateAtWord(clean, META_TITLE_MAX - (brand.length + 3));
}

/** Meta description ≤ 155 chars, markdown stripped. */
export function buildMetaDescription(text: string): string {
  const plain = stripMarkdown(text);
  return truncateAtWord(plain, META_DESC_MAX);
}

export function stripMarkdown(md: string): string {
  return (md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Heading {
  level: number;
  text: string;
}

export function extractHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  let inFence = false;
  for (const line of (md || "").split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2].trim() });
  }
  return out;
}

/** Heading problems: an H1 in the body (the page renders the title as H1), no H2s, or skipped levels. */
export function checkHeadingStructure(md: string): string[] {
  const hs = extractHeadings(md);
  const issues: string[] = [];
  if (hs.some((h) => h.level === 1)) issues.push("Body contains an H1; the page title is already the H1.");
  if (!hs.some((h) => h.level === 2)) issues.push("No H2 sections.");
  let prev = 1;
  for (const h of hs) {
    if (h.level > prev + 1) {
      issues.push(`Heading level skips from H${prev} to H${h.level} at "${h.text}".`);
      break;
    }
    prev = h.level;
  }
  return issues;
}

/** Demote any H1 in the body to H2 so the structure is valid. */
export function fixHeadingStructure(md: string): string {
  return (md || "").replace(/^#\s+/gm, "## ");
}

export interface InternalLink {
  label: string;
  href: string; // site-relative
  kind: "post" | "consultants";
}

/** Internal links: up to 3 related posts plus a consultant search per immigration path (max 2). */
export function buildInternalLinks(opts: {
  paths: { key: string; label: string; consultantQuery: string }[];
  related: { title: string; slug: string }[];
  excludeSlug?: string;
  consultantLabel?: (pathLabel: string) => string;
}): InternalLink[] {
  const consultantLabel = opts.consultantLabel ?? ((l: string) => `Find a licensed consultant for ${l}`);
  const posts = opts.related
    .filter((r) => r.slug && r.slug !== opts.excludeSlug)
    .slice(0, 3)
    .map<InternalLink>((r) => ({ label: r.title, href: `/blog/${r.slug}`, kind: "post" }));
  const consultants = opts.paths.slice(0, 2).map<InternalLink>((p) => ({
    label: consultantLabel(p.label),
    href: `/search?q=${encodeURIComponent(p.consultantQuery)}`,
    kind: "consultants",
  }));
  return [...posts, ...consultants];
}

export interface ArticleJsonLdInput {
  title: string;
  description: string;
  slug: string;
  image?: string | null;
  imageAlt?: string | null;
  datePublished: Date;
  dateModified?: Date;
  keywords?: string[];
  inLanguage?: string;
  citations?: string[]; // source URLs the article is based on
  section?: string;
  siteUrl?: string;
}

/** schema.org NewsArticle JSON-LD. Data-URI images are omitted (not crawlable). */
export function buildArticleJsonLd(i: ArticleJsonLdInput): Record<string, unknown> {
  const site = (i.siteUrl || getSiteUrl()).replace(/\/+$/, "");
  const url = `${site}/blog/${i.slug}`;
  const image = i.image && /^https?:\/\//.test(i.image) ? i.image : undefined;
  const org = { "@type": "Organization", name: BRAND, url: site, logo: { "@type": "ImageObject", url: `${site}/Brand/Vertixa3.png` } };
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: truncateAtWord(i.title, 110),
    description: i.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    datePublished: i.datePublished.toISOString(),
    dateModified: (i.dateModified || i.datePublished).toISOString(),
    author: { "@type": "Organization", name: `${BRAND} Editorial Team`, url: site },
    publisher: org,
    inLanguage: i.inLanguage || "en",
    isAccessibleForFree: true,
  };
  if (image) ld.image = i.imageAlt ? { "@type": "ImageObject", url: image, caption: i.imageAlt } : [image];
  if (i.keywords?.length) ld.keywords = i.keywords.join(", ");
  if (i.section) ld.articleSection = i.section;
  if (i.citations?.length) ld.citation = i.citations.map((u) => ({ "@type": "CreativeWork", url: u }));
  return ld;
}

export function buildFaqJsonLd(faqs: { q: string; a: string }[]): Record<string, unknown> | null {
  const items = faqs.filter((f) => f.q && f.a);
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: stripMarkdown(f.q),
      acceptedAnswer: { "@type": "Answer", text: stripMarkdown(f.a) },
    })),
  };
}

/** Serialize JSON-LD for a <script> tag; escapes "<" so content can't close the tag. */
export function serializeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(new RegExp("\\u2028", "g"), "\\u2028")
    .replace(new RegExp("\\u2029", "g"), "\\u2029");
}
