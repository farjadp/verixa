/**
 * End-to-end pipeline tests with an in-memory fake Prisma, a fake LLM, and
 * global fetch stubbed to throw — proving no network/social/email call happens.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Prisma, type PrismaClient } from "@prisma/client";
import { runContentPipeline } from "@/lib/content-pipeline/orchestrator";
import { ConfigUpdateSchema, parseConfig } from "@/lib/content-pipeline/config";
import { computeReviewScore, runDeterministicChecks } from "@/lib/content-pipeline/review-rules";
import { assembleArticle, ensureDisclaimer, hasDisclaimer } from "@/lib/content-pipeline/markdown";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";
import { sanitizeDraft, type Draft } from "@/lib/content-pipeline/agents/writer";
import { buildSocialCopy } from "@/lib/content-pipeline/agents/publisher";
import { extractListingLinks } from "@/lib/content-pipeline/agents/discovery";
import { parseLanguageSetting } from "@/lib/content-pipeline/language";
import type { Llm, PipelineDeps } from "@/lib/content-pipeline/types";

const NOW = new Date("2026-11-04T13:00:00Z");
const SRC = "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11";

// ─── In-memory fake of the Prisma surface the pipeline uses ──────────────────
type Row = Record<string, any>;

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, cond]) => {
    const v = row[k];
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      if ("in" in cond) return cond.in.includes(v);
      if ("startsWith" in cond) return typeof v === "string" && v.startsWith(cond.startsWith);
      if ("gte" in cond) return v >= cond.gte;
      if ("lt" in cond) return v < cond.lt;
      return false;
    }
    return v === cond;
  });
}

function createFakeDb(seed: { settings?: Record<string, string>; posts?: Row[]; runs?: Row[] } = {}) {
  let n = 0;
  const id = () => `cfake${String(++n).padStart(20, "0")}`;
  const t = {
    platformSetting: Object.entries(seed.settings ?? {}).map(([key, value]) => ({ key, value })),
    contentSource: [{ id: "csrc00000000000000000001", name: "IRCC", url: "https://feed.test/ircc", type: "RSS", enabled: true, trustScore: 100, lastCheckedAt: null }] as Row[],
    rawArticle: [] as Row[],
    contentJob: [] as Row[],
    blogPost: (seed.posts ?? []).map((p) => ({ id: id(), isPublished: true, targetKeyword: null, immigrationPaths: null, publishedAt: NOW, createdAt: NOW, ...p })) as Row[],
    socialJob: [] as Row[],
    contentPipelineJob: [] as Row[],
    pipelineRun: (seed.runs ?? []) as Row[],
    contentImage: [] as Row[],
  };

  const table = (name: keyof typeof t, unique?: string) => ({
    findMany: async ({ where, take }: Row = {}) => t[name].filter((r) => matches(r, where)).slice(0, take ?? Infinity),
    findFirst: async ({ where }: Row = {}) => t[name].find((r) => matches(r, where)) ?? null,
    findUnique: async ({ where }: Row) => t[name].find((r) => matches(r, where)) ?? null,
    count: async ({ where }: Row = {}) => t[name].filter((r) => matches(r, where)).length,
    create: async ({ data }: Row) => {
      if (unique && t[name].some((r) => r[unique] === data[unique])) {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" });
      }
      const row = { id: id(), createdAt: NOW, startedAt: NOW, status: undefined, ...data };
      if (row.status === undefined) delete row.status;
      t[name].push(row);
      return row;
    },
    update: async ({ where, data }: Row) => {
      const row = t[name].find((r) => matches(r, where));
      if (!row) throw new Error(`${name} not found`);
      Object.assign(row, data);
      return row;
    },
    updateMany: async ({ where, data }: Row) => {
      const rows = t[name].filter((r) => matches(r, where));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    },
    upsert: async ({ where, create, update }: Row) => {
      const row = t[name].find((r) => matches(r, where));
      if (row) return Object.assign(row, update);
      const created = { id: id(), ...create };
      t[name].push(created);
      return created;
    },
  });

  const db: Row = {
    platformSetting: table("platformSetting"),
    contentSource: table("contentSource"),
    rawArticle: table("rawArticle", "sourceUrl"),
    contentJob: table("contentJob"),
    blogPost: table("blogPost", "slug"),
    socialJob: table("socialJob", "blogPostId"),
    contentPipelineJob: table("contentPipelineJob", "dedupKey"),
    pipelineRun: table("pipelineRun"),
    contentImage: table("contentImage"),
  };
  db.$transaction = async (fn: (tx: Row) => Promise<unknown>) => fn(db);
  return { db: db as unknown as PrismaClient, tables: t };
}

// ─── Fake LLM ────────────────────────────────────────────────────────────────
const PARA =
  "Applicants should read the official IRCC guidance before they submit anything. The department says processing depends on a complete application, " +
  "so people may want to check each document against the published checklist and keep copies of everything they send to the department.";

function fakeDraft(topic: string, sourceUrl: string): Draft {
  return {
    title: topic,
    slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    summary: `IRCC announced an update: ${topic}. Here is what changed and who it affects.`,
    targetKeyword: topic.split(" ").slice(0, 3).join(" "),
    targetKeywordEn: topic.split(" ").slice(0, 3).join(" "),
    secondaryKeywords: ["IRCC update"],
    outline: ["What changed", "Who is affected", "Key dates", "What to do next"],
    sections: ["What changed", "Who is affected", "Key dates", "What to do next"].map((heading) => ({ heading, body: `${PARA} ${PARA} ${PARA}` })),
    faq: [{ question: "Who does this affect?", answer: "People applying under this program, according to IRCC." }],
    citations: [
      { title: "IRCC news release", url: sourceUrl },
      { title: "Made-up blog", url: "https://hallucinated.example/post" },
    ],
    immigrationPaths: ["not_a_real_path"],
    keyFacts: ["IRCC announced the update."],
    imagePrompt: "Applicants waiting at an immigration office",
    imageAlt: "People waiting at a Canadian immigration office",
    secondarySummary: null,
  };
}

function createFakeLlm(opts: { reviewVerdict?: "supported" | "unsupported" } = {}): Llm & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async json(_schema, name, _system, user) {
      calls.push(name);
      if (name === "article_draft") {
        const topic = /TOPIC: (.*)/.exec(user)?.[1] ?? "Topic";
        const url = /SOURCE URL: (.*)/.exec(user)?.[1] ?? "";
        return fakeDraft(topic, url) as never;
      }
      return {
        overallScore: 88,
        claims: [{ claim: "IRCC announced the update.", verdict: opts.reviewVerdict ?? "supported", note: "Stated in the release." }],
        givesLegalAdvice: false,
        summary: "Accurate and clear.",
      } as never;
    },
  };
}

function createDeps(db: PrismaClient, llm: Llm, revalidated: string[][] = []): PipelineDeps {
  return {
    db,
    llm,
    fetchFeed: async () => [
      { title: "Express Entry draw invites 5,000 CEC candidates", link: `${SRC}/express-entry-draw.html`, isoDate: NOW.toISOString(), snippet: "Express Entry round" },
      { title: "Spousal sponsorship processing times improve", link: `${SRC}/spousal-sponsorship.html`, isoDate: NOW.toISOString(), snippet: "Family sponsorship" },
      { title: "Study permit cap for 2027 announced", link: `${SRC}/study-cap.html`, isoDate: NOW.toISOString(), snippet: "Study permits" },
      { title: "Minister visits a hockey arena", link: `${SRC}/hockey.html`, isoDate: NOW.toISOString(), snippet: "Sports" },
    ],
    fetchHtml: async (url) => `<html><body><nav>menu</nav><main><h1>Release</h1><p>${PARA} Source: ${url}</p><p>${PARA}</p></main></body></html>`,
    generateImage: async () => ({ bytes: Buffer.from([1, 2, 3]), mimeType: "image/png" }),
    revalidate: (paths) => revalidated.push(paths),
    now: () => NOW,
    log: () => {},
  };
}

const EXISTING_POST = { title: "Study permit cap for 2027 announced", slug: "study-permit-cap-2027" };

describe("runContentPipeline — end to end (mocked)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", () => {
      throw new Error("Network access is disabled in tests");
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("default config: creates 2 DRAFT posts + QUEUED social jobs, skips duplicates and off-topic items", async () => {
    const { db, tables } = createFakeDb({ posts: [EXISTING_POST] });
    const revalidated: string[][] = [];
    const summary = await runContentPipeline(createDeps(db, createFakeLlm(), revalidated), { trigger: "MANUAL" });

    expect(summary).toMatchObject({ status: "COMPLETED", produced: 2, rejected: 0, failed: 0, autopublish: false });

    const created = tables.blogPost.filter((p) => p.source === "PIPELINE");
    expect(created).toHaveLength(2);
    expect(created.every((p) => p.isPublished === false && p.publishedAt === null)).toBe(true);
    expect(created.map((p) => p.title)).not.toContain(EXISTING_POST.title); // deduped against existing post
    expect(created.map((p) => p.title).join(" ")).not.toMatch(/hockey/i); // off-topic dropped

    expect(tables.socialJob).toHaveLength(2);
    for (const s of tables.socialJob) {
      expect(s.status).toBe("QUEUED");
      expect([s.linkedinStatus, s.twitterStatus, s.facebookStatus, s.telegramStatus]).toEqual(["SKIPPED", "SKIPPED", "SKIPPED", "SKIPPED"]);
    }

    expect(tables.contentPipelineJob.map((j) => j.stage)).toEqual(["READY", "READY"]);
    expect(revalidated).toEqual([]); // nothing went live
    expect(tables.pipelineRun[0]).toMatchObject({ status: "COMPLETED", published: 2 });
  });

  it("assembles SEO-ready content: disclaimer, real citation only, FAQ marker, JSON-LD, durable image URL", async () => {
    const { db, tables } = createFakeDb();
    await runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" });
    const post = tables.blogPost.find((p) => p.source === "PIPELINE")!;

    expect(hasDisclaimer(post.content)).toBe(true);
    expect(post.content.indexOf("not legal advice")).toBeLessThan(post.content.indexOf("## What changed"));
    expect(post.content).toContain(`](${SRC}/`);
    expect(post.content).not.toContain("hallucinated.example");
    expect(post.content).toContain("## Frequently Asked Questions");
    expect(post.content).toContain("<end-of-faq>");
    expect(post.content).toMatch(/\]\(\/search\?q=/); // internal consultant link

    expect(post.seoTitle).not.toMatch(/Verixa/);
    expect(post.seoDesc.length).toBeLessThanOrEqual(155);
    expect(post.slug).toMatch(/^[a-z0-9-]+$/);
    expect(JSON.parse(post.immigrationPaths)).not.toContain("not_a_real_path");
    expect(JSON.parse(post.jsonLd)).toMatchObject({ "@type": "NewsArticle", citation: [{ url: expect.stringContaining(SRC) }] });
    expect(post.coverImage).toMatch(/\/api\/content-image\/cfake/);
    expect(post.imageAlt).toBe("People waiting at a Canadian immigration office");

    // Registered in the aggregator registry so the older auto-pilot won't duplicate it.
    expect(tables.rawArticle.every((r) => r.status === "PROCESSED")).toBe(true);
  });

  it("is idempotent: a same-day rerun stops at the quota and never re-processes an item", async () => {
    const { db, tables } = createFakeDb();
    const llm = createFakeLlm();
    await runContentPipeline(createDeps(db, llm), { trigger: "CRON" });

    const again = await runContentPipeline(createDeps(db, llm), { trigger: "CRON" });
    expect(again).toMatchObject({ status: "SKIPPED" });
    expect(again.reason).toMatch(/quota/i);

    // Raise the quota: remaining feed items are new, already-processed ones are not redone.
    tables.platformSetting.push({ key: "content_pieces_per_day", value: "10" });
    const third = await runContentPipeline(createDeps(db, llm), { trigger: "CRON" });
    const slugs = tables.blogPost.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(tables.blogPost).toHaveLength(3); // 2 + the study-permit item; hockey stays off-topic
    expect(third.produced).toBe(1);
  });

  it("autopublish ON: post goes live, social job is still only QUEUED (never sent)", async () => {
    const { db, tables } = createFakeDb({ settings: { content_autopublish_enabled: "true", content_channel_linkedin: "true", content_pieces_per_day: "1" } });
    const revalidated: string[][] = [];
    const summary = await runContentPipeline(createDeps(db, createFakeLlm(), revalidated), { trigger: "CRON" });

    expect(summary).toMatchObject({ produced: 1, autopublish: true });
    expect(tables.blogPost[0]).toMatchObject({ isPublished: true, publishedAt: NOW });
    expect(tables.socialJob[0]).toMatchObject({ status: "QUEUED", linkedinStatus: "PENDING", twitterStatus: "SKIPPED" });
    expect(tables.contentPipelineJob[0].stage).toBe("PUBLISHED");
    expect(revalidated.flat()).toContain("/blog");
  });

  it("reviewer gate: unsupported claims are rejected and no post is created", async () => {
    const { db, tables } = createFakeDb();
    const summary = await runContentPipeline(createDeps(db, createFakeLlm({ reviewVerdict: "unsupported" })), { trigger: "CRON" });

    expect(summary.produced).toBe(0);
    expect(summary.rejected).toBeGreaterThan(0);
    expect(tables.blogPost).toHaveLength(0);
    expect(tables.socialJob).toHaveLength(0);
    const job = tables.contentPipelineJob[0];
    expect(job.stage).toBe("REJECTED");
    expect(job.rejectionReason).toMatch(/Unsupported by sources/);
    expect(job.draftMarkdown).toBeTruthy(); // kept for the admin to inspect
  });

  it("run lock: skips while another run is in progress", async () => {
    const { db, tables } = createFakeDb({ runs: [{ id: "crun", status: "RUNNING", startedAt: new Date(NOW.getTime() - 60_000) }] });
    const summary = await runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" });
    expect(summary).toMatchObject({ status: "SKIPPED" });
    expect(tables.blogPost).toHaveLength(0);
  });

  it("closes out a stale RUNNING run and proceeds", async () => {
    const { db, tables } = createFakeDb({ runs: [{ id: "cstale", status: "RUNNING", startedAt: new Date(NOW.getTime() - 60 * 60_000) }] });
    const summary = await runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" });
    expect(summary.status).toBe("COMPLETED");
    expect(tables.pipelineRun.find((r) => r.id === "cstale")?.status).toBe("FAILED");
  });
});

describe("config", () => {
  it("defaults to English, 2/day, auto-publish OFF, all channels OFF", () => {
    const c = parseConfig({});
    expect(c).toMatchObject({ piecesPerDay: 2, autopublish: false, strictness: "standard", minQualityScore: 70 });
    expect(c.language.primary.code).toBe("en");
    expect(Object.values(c.channels).every((v) => v === false)).toBe(true);
  });

  it("only the exact string 'true' enables auto-publish", () => {
    expect(parseConfig({ content_autopublish_enabled: "yes" }).autopublish).toBe(false);
    expect(parseConfig({ content_autopublish_enabled: "TRUE" }).autopublish).toBe(true);
  });

  it("clamps pieces per day and falls back on bad strictness", () => {
    expect(parseConfig({ content_pieces_per_day: "99" }).piecesPerDay).toBe(10);
    expect(parseConfig({ content_pieces_per_day: "abc" }).piecesPerDay).toBe(2);
    expect(parseConfig({ content_review_strictness: "chaos" }).strictness).toBe("standard");
  });

  it("switching language is a config change: Persian and bilingual", () => {
    expect(parseLanguageSetting("fa").primary).toMatchObject({ code: "fa", dir: "rtl" });
    const bi = parseLanguageSetting("en+fa");
    expect([bi.primary.code, bi.secondary?.code, bi.raw]).toEqual(["en", "fa", "en+fa"]);
    expect(parseLanguageSetting("xx").primary.code).toBe("en");
  });

  it("validates admin input", () => {
    const ok = { language: "en+fa", piecesPerDay: 2, autopublish: false, strictness: "strict", channels: { linkedin: true, twitter: false, facebook: false, telegram: false } };
    expect(ConfigUpdateSchema.safeParse(ok).success).toBe(true);
    expect(ConfigUpdateSchema.safeParse({ ...ok, language: "english" }).success).toBe(false);
    expect(ConfigUpdateSchema.safeParse({ ...ok, piecesPerDay: 50 }).success).toBe(false);
    expect(ConfigUpdateSchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
  });
});

describe("review rules", () => {
  const goodChecks = { disclaimerPresent: true, wordCount: 800, citationCount: 1, headingIssues: [], bannedPhrases: [], offSourceLinks: [] };

  it("passes a clean, supported draft", () => {
    const r = computeReviewScore({ llmScore: 85, claims: [{ claim: "x", verdict: "supported", note: "" }], checks: goodChecks, strictness: "standard", minScore: 70 });
    expect(r).toMatchObject({ passed: true, score: 85 });
  });

  it("fails any unsupported claim at standard strictness, tolerates one when lenient", () => {
    const claims = [{ claim: "Fee is $50", verdict: "unsupported" as const, note: "not in source" }];
    expect(computeReviewScore({ llmScore: 95, claims, checks: goodChecks, strictness: "standard", minScore: 70 }).passed).toBe(false);
    expect(computeReviewScore({ llmScore: 95, claims, checks: goodChecks, strictness: "lenient", minScore: 60 }).passed).toBe(true);
  });

  it("fails without a disclaimer or citation regardless of score", () => {
    expect(computeReviewScore({ llmScore: 100, claims: [], checks: { ...goodChecks, disclaimerPresent: false }, strictness: "lenient", minScore: 0 }).passed).toBe(false);
    expect(computeReviewScore({ llmScore: 100, claims: [], checks: { ...goodChecks, citationCount: 0 }, strictness: "lenient", minScore: 0 }).passed).toBe(false);
  });

  it("detects off-source links and filler phrases", () => {
    const md = "## A\nWe delve into [rules](https://canada.ca/x) and [a blog](https://random.example/y).";
    const c = runDeterministicChecks(md, ["https://www.canada.ca/x"]);
    expect(c.citationCount).toBe(1);
    expect(c.offSourceLinks).toEqual(["https://random.example/y"]);
    expect(c.bannedPhrases).toContain("delve");
  });
});

describe("markdown assembly", () => {
  it("puts the disclaimer first and keeps the FAQ block intact", () => {
    const md = assembleArticle({
      disclaimer: "General information only — not legal advice.",
      sections: [{ heading: "# What changed", body: "Text\n---\nmore" }],
      faq: [{ question: "Q?", answer: "A\n---\n<end-of-faq>" }],
      citations: [{ title: "IRCC", url: "https://canada.ca/x" }],
      internalLinks: [{ label: "Find a consultant", href: "/search?q=x", kind: "consultants" }],
      footer: "*footer*",
    });
    expect(md.startsWith("<!-- verixa:disclaimer -->\n> General information only")).toBe(true);
    expect(md).toContain("## What changed");
    expect(md).not.toContain("# # What");
    expect(md.match(/<end-of-faq>/g)).toHaveLength(1);
    // The only horizontal rule is the one after the FAQ (the blog page splits on it).
    expect(md.match(/^---$/gm)).toHaveLength(1);
    expect(md.indexOf("<end-of-faq>")).toBeLessThan(md.indexOf("---"));
  });

  it("ensureDisclaimer adds a disclaimer once", () => {
    const once = ensureDisclaimer("## Body", "General information only — not legal advice.");
    expect(ensureDisclaimer(once, "General information only — not legal advice.")).toBe(once);
  });
});

describe("writer sanitizing", () => {
  it("keeps only the real source citation and valid path keys", () => {
    const candidate = { title: "PGP opens", sourceUrl: "https://www.canada.ca/pgp.html", sourceName: "IRCC", sourceTrust: 100, publishedAt: NOW, snippet: "", paths: ["family"] };
    const d = sanitizeDraft(fakeDraft("PGP opens", "http://canada.ca/pgp.html/"), candidate);
    expect(d.citations).toEqual([{ title: "IRCC news release", url: "https://www.canada.ca/pgp.html" }]);
    expect(d.immigrationPaths).toEqual(["family"]);
  });
});

describe("discovery link extraction", () => {
  it("keeps same-host article links and drops nav/off-site links", () => {
    const html = `
      <a href="/en/news/2026/11/express-entry-draw-results.html">Express Entry draw results for November</a>
      <a href="https://other.example/news/some-article-here">An article on another website entirely</a>
      <a href="/en/search-results">Search results page link text</a>
      <a href="/en/news/2026/11/express-entry-draw-results.html#top">Express Entry draw results for November</a>
      <a href="/a">Short</a>`;
    expect(extractListingLinks(html, "https://www.canada.ca/en/news.html")).toEqual([
      { title: "Express Entry draw results for November", link: "https://www.canada.ca/en/news/2026/11/express-entry-draw-results.html" },
    ]);
  });
});

describe("social copy", () => {
  it("keeps the X post within 280 chars (links count as 23)", () => {
    const c = buildSocialCopy({ title: "A".repeat(400), summary: "s", url: "https://www.getverixa.com/blog/x", paths: ["express_entry"] });
    const counted = c.twitter.replace("https://www.getverixa.com/blog/x", "x".repeat(23));
    expect(counted.length).toBeLessThanOrEqual(280);
    expect(c.linkedin).toContain("not legal advice");
  });
});

describe("cron auth", () => {
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCronRequest("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorizedCronRequest("Bearer s3cret ", "s3cret")).toBe(false);
    expect(isAuthorizedCronRequest("s3cret", "s3cret")).toBe(false);
    expect(isAuthorizedCronRequest(null, "s3cret")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
  });
});
