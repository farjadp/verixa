// ============================================================================
// Content Pipeline — article assembly (pure; unit tested)
// Produces markdown in the shape /blog/[slug] already understands:
//   visible disclaimer → body → related links → sources → "## <localized FAQ
//   heading>" → <end-of-faq> → provenance footer (rendered in the disclaimer box).
// The blog page recognises every FAQ heading in language.ts FAQ_HEADINGS.
// ============================================================================
import type { InternalLink } from "./seo";
import { fixHeadingStructure } from "./seo";

export interface ArticleParts {
  disclaimer: string;
  sections: { heading: string; body: string }[];
  faq: { question: string; answer: string }[];
  citations: { title: string; url: string }[];
  internalLinks: InternalLink[];
  secondarySummary?: string | null;
  secondaryLanguageName?: string | null;
  footer: string;
  labels: { related: string; sources: string; faq: string };
}

/** Lines that are only "---"/"***" would end the FAQ block early on the blog page. */
function sanitizeBlock(s: string): string {
  return fixHeadingStructure((s || "").trim())
    .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, "")
    .replace(/<end-of-faq>/gi, "")
    .trim();
}

function cleanHeading(s: string): string {
  return (s || "").replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
}

const DISCLAIMER_MARKER = "<!-- verixa:disclaimer -->";

export function hasDisclaimer(md: string): boolean {
  return md.includes(DISCLAIMER_MARKER) || /not legal advice|مشاوره حقوقی محسوب نمی|avis juridique/i.test(md);
}

/** Prepend the visible disclaimer callout if the markdown doesn't already carry one. */
export function ensureDisclaimer(md: string, disclaimer: string): string {
  if (hasDisclaimer(md)) return md;
  return `${DISCLAIMER_MARKER}\n> ${disclaimer}\n\n${md.trim()}`;
}

export function assembleArticle(p: ArticleParts): string {
  const out: string[] = [];
  out.push(DISCLAIMER_MARKER, `> ${p.disclaimer}`, "");

  if (p.secondarySummary && p.secondaryLanguageName) {
    out.push(`> **${p.secondaryLanguageName}:** ${p.secondarySummary.replace(/\n+/g, " ").trim()}`, "");
  }

  for (const s of p.sections) {
    const heading = cleanHeading(s.heading);
    const body = sanitizeBlock(s.body);
    if (!heading || !body) continue;
    out.push(`## ${heading}`, "", body, "");
  }

  if (p.internalLinks.length) {
    out.push(`## ${p.labels.related}`, "");
    for (const l of p.internalLinks) out.push(`- [${l.label.replace(/[[\]]/g, "")}](${l.href})`);
    out.push("");
  }

  if (p.citations.length) {
    out.push(`## ${p.labels.sources}`, "");
    for (const c of p.citations) out.push(`- [${(c.title || c.url).replace(/[[\]]/g, "")}](${c.url})`);
    out.push("");
  }

  const faqs = p.faq.filter((f) => f.question?.trim() && f.answer?.trim());
  if (faqs.length) {
    // The blog page detects this heading (see FAQ_HEADINGS) and renders its own FAQ accordion.
    out.push(`## ${p.labels.faq}`, "");
    for (const f of faqs) out.push(`### ${cleanHeading(f.question)}`, sanitizeBlock(f.answer), "");
    out.push("<end-of-faq>", "");
  }

  out.push("---", "", p.footer.trim());
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function wordCount(md: string): number {
  const text = md.replace(/<!--[\s\S]*?-->/g, " ").replace(/[#>*_`[\]()|-]/g, " ");
  return text.split(/\s+/).filter(Boolean).length;
}

// ─── Editorial cleanup: drop sentences the reviewer marked as speculation ────

/** Letters and digits only, lowercased: tolerant of punctuation/spacing drift in LLM quotes. */
function normalizeSentence(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function matchesAny(sentence: string, targets: string[]): boolean {
  const n = normalizeSentence(sentence);
  if (n.length < 12) return false;
  return targets.some((t) => {
    if (!t) return false;
    if (n === t) return true;
    // A quote that is a near-complete prefix/substring of the sentence (or vice versa).
    const [short, long] = n.length < t.length ? [n, t] : [t, n];
    return short.length >= 20 && long.includes(short) && short.length / long.length >= 0.8;
  });
}

const SENTENCE_SPLIT = /(?<=[.!?؟])\s+/u;
const PROSE_SKIP = /^\s*(#|<|>|---|\*Prepared|\*این مطلب|\*Préparé|\|)/u;
const LINK_ONLY_ITEM = /^\s*[-*]\s*\[[^\]]*\]\([^)]*\)\s*$/;

/**
 * Pure: remove the given sentences from prose lines and list items (never from
 * headings, the disclaimer callout, tables, link lists or the footer), then drop
 * headings left with no content and an FAQ block left empty.
 */
export function removeSentences(md: string, sentences: string[], faqHeadings: string[] = []): { markdown: string; removed: number } {
  const targets = sentences.map(normalizeSentence).filter((t) => t.length >= 12);
  if (!targets.length) return { markdown: md, removed: 0 };

  let removed = 0;
  const lines: string[] = [];
  for (const line of md.split("\n")) {
    if (!line.trim() || PROSE_SKIP.test(line) || LINK_ONLY_ITEM.test(line)) {
      lines.push(line);
      continue;
    }
    const bullet = /^(\s*(?:[-*]|\d+\.)\s+)/.exec(line)?.[1] ?? "";
    const parts = line.slice(bullet.length).split(SENTENCE_SPLIT);
    const kept = parts.filter((p) => {
      const drop = matchesAny(p, targets);
      if (drop) removed++;
      return !drop;
    });
    if (kept.length) lines.push(bullet + kept.join(" "));
  }

  // Drop headings that no longer have content, repeating until stable.
  const level = (l: string) => /^(#{2,6})\s/.exec(l)?.[1].length ?? 0;
  const isBoundary = (l: string | undefined, lvl: number) =>
    l === undefined || /^---\s*$/.test(l) || /^<end-of-faq>/i.test(l) || (level(l) > 0 && level(l) <= lvl);
  let out = lines;
  for (let changed = true; changed; ) {
    changed = false;
    const next: string[] = [];
    for (let i = 0; i < out.length; i++) {
      const lvl = level(out[i]);
      if (lvl) {
        let j = i + 1;
        while (j < out.length && !out[j].trim()) j++;
        if (isBoundary(out[j], lvl)) {
          changed = true;
          continue;
        }
      }
      next.push(out[i]);
    }
    out = next;
  }

  // An FAQ marker with no FAQ heading left above it is orphaned.
  const faqSet = new Set(faqHeadings.map((h) => h.toLowerCase()));
  const hasFaqHeading = out.some((l) => /^##\s/.test(l) && faqSet.has(l.replace(/^##\s+/, "").trim().toLowerCase()));
  if (!hasFaqHeading) out = out.filter((l) => !/^<end-of-faq>/i.test(l));

  return { markdown: out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n", removed };
}
