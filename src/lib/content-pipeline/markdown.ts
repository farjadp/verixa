// ============================================================================
// Content Pipeline — article assembly (pure; unit tested)
// Produces markdown in the shape /blog/[slug] already understands:
//   visible disclaimer → body → related links → sources → "## Frequently Asked
//   Questions" → <end-of-faq> → provenance footer (rendered in the disclaimer box).
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
  labels?: { related?: string; sources?: string };
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
    out.push(`## ${p.labels?.related || "Related resources"}`, "");
    for (const l of p.internalLinks) out.push(`- [${l.label.replace(/[[\]]/g, "")}](${l.href})`);
    out.push("");
  }

  if (p.citations.length) {
    out.push(`## ${p.labels?.sources || "Sources"}`, "");
    for (const c of p.citations) out.push(`- [${(c.title || c.url).replace(/[[\]]/g, "")}](${c.url})`);
    out.push("");
  }

  const faqs = p.faq.filter((f) => f.question?.trim() && f.answer?.trim());
  if (faqs.length) {
    // The blog page detects this exact English marker and renders its own FAQ accordion.
    out.push("## Frequently Asked Questions", "");
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
