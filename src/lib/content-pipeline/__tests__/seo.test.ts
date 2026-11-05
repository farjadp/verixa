import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildArticleJsonLd,
  buildFaqJsonLd,
  buildInternalLinks,
  buildMetaDescription,
  buildMetaTitle,
  buildSlug,
  checkHeadingStructure,
  fixHeadingStructure,
  getSiteUrl,
  META_DESC_MAX,
  serializeJsonLd,
  slugify,
  SLUG_MAX,
  uniqueSlug,
} from "@/lib/content-pipeline/seo";

describe("slugify", () => {
  it("makes lowercase hyphenated ASCII slugs", () => {
    expect(slugify("Express Entry: 4,000 ITAs Issued!")).toBe("express-entry-4-000-itas-issued");
  });

  it("folds accents and '&'", () => {
    expect(slugify("Québec & Montréal PEQ")).toBe("quebec-and-montreal-peq");
  });

  it("cuts long titles on a word boundary within the limit", () => {
    const s = slugify("Canada announces a sweeping overhaul of the Parents and Grandparents Program for the 2027 intake year");
    expect(s.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(s.endsWith("-")).toBe(false);
    expect("canada-announces-a-sweeping-overhaul-of-the-parents-and-grandparents-program".startsWith(s)).toBe(true);
  });

  it("returns empty for non-Latin titles so callers fall back", () => {
    expect(slugify("قرعه‌کشی جدید اکسپرس انتری")).toBe("");
  });
});

describe("buildSlug / uniqueSlug", () => {
  it("uses the first candidate that produces a usable slug", () => {
    expect(buildSlug("", "قرعه‌کشی جدید", "Express Entry draw")).toBe("express-entry-draw");
    expect(buildSlug(null, undefined)).toBe("immigration-update");
  });

  it("appends a counter when taken", () => {
    expect(uniqueSlug("pgp-2026", new Set())).toBe("pgp-2026");
    expect(uniqueSlug("pgp-2026", new Set(["pgp-2026"]))).toBe("pgp-2026-2");
    expect(uniqueSlug("pgp-2026", new Set(["pgp-2026", "pgp-2026-2"]))).toBe("pgp-2026-3");
  });
});

describe("meta tags", () => {
  it("meta title omits the brand (layout template adds it) and fits 60 chars with it", () => {
    const t = buildMetaTitle("Express Entry draw results for November 2026 explained in detail for applicants");
    expect(t).not.toMatch(/Verixa/);
    expect(`${t} | Verixa`.length).toBeLessThanOrEqual(60);
  });

  it("strips an LLM-added brand suffix", () => {
    expect(buildMetaTitle("PGP 2026 opens | Verixa")).toBe("PGP 2026 opens");
  });

  it("meta description strips markdown and stays within the limit", () => {
    const d = buildMetaDescription(`**Big news:** the [IRCC](https://canada.ca) has ${"announced new rules ".repeat(20)}`);
    expect(d.length).toBeLessThanOrEqual(META_DESC_MAX);
    expect(d).not.toMatch(/[*[\]()]/);
    expect(d.startsWith("Big news: the IRCC has")).toBe(true);
  });
});

describe("heading structure", () => {
  it("accepts H2/H3 bodies", () => {
    expect(checkHeadingStructure("## What changed\ntext\n### Details\ntext\n## Next steps")).toEqual([]);
  });

  it("flags H1, missing H2 and skipped levels", () => {
    expect(checkHeadingStructure("# Title\n## A")[0]).toMatch(/H1/);
    expect(checkHeadingStructure("just text")).toContain("No H2 sections.");
    expect(checkHeadingStructure("## A\n#### Deep").some((i) => /skips/.test(i))).toBe(true);
  });

  it("ignores # lines inside code fences and demotes H1s", () => {
    expect(checkHeadingStructure("## A\n```\n# not a heading\n```")).toEqual([]);
    expect(fixHeadingStructure("# Title\ntext")).toBe("## Title\ntext");
  });
});

describe("internal links", () => {
  it("links up to 3 related posts and 2 consultant searches, excluding the post itself", () => {
    const links = buildInternalLinks({
      paths: [
        { key: "express_entry", label: "Express Entry", consultantQuery: "Express Entry" },
        { key: "work", label: "Work Permits", consultantQuery: "Work Permit" },
        { key: "study", label: "Study Permits", consultantQuery: "Study Permit" },
      ],
      related: [
        { title: "Self", slug: "self" },
        { title: "A", slug: "a" },
        { title: "B", slug: "b" },
        { title: "C", slug: "c" },
        { title: "D", slug: "d" },
      ],
      excludeSlug: "self",
    });
    expect(links.filter((l) => l.kind === "post").map((l) => l.href)).toEqual(["/blog/a", "/blog/b", "/blog/c"]);
    expect(links.filter((l) => l.kind === "consultants").map((l) => l.href)).toEqual(["/search?q=Express%20Entry", "/search?q=Work%20Permit"]);
  });
});

describe("JSON-LD", () => {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test/";
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });

  it("uses NEXT_PUBLIC_APP_URL without a trailing slash", () => {
    expect(getSiteUrl()).toBe("https://example.test");
  });

  it("builds a NewsArticle with canonical URL, dates, language and citations", () => {
    const ld = buildArticleJsonLd({
      title: "PGP 2026 intake opens",
      description: "What changed",
      slug: "pgp-2026",
      image: "https://example.test/api/content-image/c123",
      imageAlt: "Family at an airport",
      datePublished: new Date("2026-11-04T13:00:00Z"),
      keywords: ["PGP 2026", "sponsor parents"],
      inLanguage: "fa",
      citations: ["https://www.canada.ca/x.html"],
    });
    expect(ld).toMatchObject({
      "@type": "NewsArticle",
      url: "https://example.test/blog/pgp-2026",
      mainEntityOfPage: { "@id": "https://example.test/blog/pgp-2026" },
      datePublished: "2026-11-04T13:00:00.000Z",
      dateModified: "2026-11-04T13:00:00.000Z",
      inLanguage: "fa",
      keywords: "PGP 2026, sponsor parents",
      image: { url: "https://example.test/api/content-image/c123", caption: "Family at an airport" },
      citation: [{ "@type": "CreativeWork", url: "https://www.canada.ca/x.html" }],
    });
  });

  it("omits data-URI images", () => {
    const ld = buildArticleJsonLd({ title: "t", description: "d", slug: "s", image: "data:image/png;base64,AAA", datePublished: new Date() });
    expect(ld.image).toBeUndefined();
  });

  it("builds FAQPage only when there are answered questions", () => {
    expect(buildFaqJsonLd([])).toBeNull();
    expect(buildFaqJsonLd([{ q: "**Who** qualifies?", a: "See [IRCC](https://x)." }])).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [{ name: "Who qualifies?", acceptedAnswer: { text: "See IRCC." } }],
    });
  });

  it("serializes safely for a <script> tag", () => {
    const out = serializeJsonLd({ headline: "</script><script>alert(1)</script>", x: "a\u2028b" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("\u2028");
    expect(JSON.parse(out)).toEqual({ headline: "</script><script>alert(1)</script>", x: "a\u2028b" });
  });
});
