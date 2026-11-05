/**
 * End-to-end pipeline tests with an in-memory fake Prisma, a fake LLM, and
 * global fetch stubbed to throw — proving no network/social/email call happens.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Prisma, type PrismaClient } from "@prisma/client";
import { RUN_LOCK_MS, regenerateJob, retryJob, runContentPipeline, runSingleSource } from "@/lib/content-pipeline/orchestrator";
import { ConfigUpdateSchema, parseConfig } from "@/lib/content-pipeline/config";
import { computeReviewScore, minWordsFor, runDeterministicChecks } from "@/lib/content-pipeline/review-rules";
import { assembleArticle, ensureDisclaimer, hasDisclaimer, removeSentences } from "@/lib/content-pipeline/markdown";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";
import { buildWriterPrompt, sanitizeDraft, targetLength, type Draft } from "@/lib/content-pipeline/agents/writer";
import { buildSocialCopy, categoryFor } from "@/lib/content-pipeline/agents/publisher";
import { pickRelatedPosts } from "@/lib/content-pipeline/agents/seo-agent";
import { buildImagePrompt } from "@/lib/content-pipeline/agents/image";
import { extractListingLinks, extractOfficialLinks } from "@/lib/content-pipeline/agents/discovery";
import { FAQ_HEADINGS, LANGUAGE_PROFILES, parseLanguageSetting } from "@/lib/content-pipeline/language";
import { dedupKeyFor } from "@/lib/content-pipeline/dedup";
import type { FeedItem, Llm, PipelineDeps } from "@/lib/content-pipeline/types";

const NOW = new Date("2026-11-04T13:00:00Z");
const SRC = "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11";
const EN = LANGUAGE_PROFILES.en.labels;

// ─── In-memory fake of the Prisma surface the pipeline uses ──────────────────
type Row = Record<string, unknown>;
type Cond = { in?: unknown[]; startsWith?: string; gte?: unknown; lt?: unknown; increment?: number };

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function isCond(v: unknown): v is Cond {
  return typeof v === "object" && v !== null && !(v instanceof Date) && !Array.isArray(v);
}

function compare(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return NaN;
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, cond]) => {
    const v = row[k];
    if (cond === null) return v === null || v === undefined;
    if (isCond(cond)) {
      if (cond.in) return cond.in.includes(v);
      if (cond.startsWith !== undefined) return typeof v === "string" && v.startsWith(cond.startsWith);
      if (cond.gte !== undefined) return compare(v, cond.gte) >= 0;
      if (cond.lt !== undefined) return compare(v, cond.lt) < 0;
      return false;
    }
    return v === cond;
  });
}

function applyData(row: Row, data: Row): Row {
  for (const [k, v] of Object.entries(data)) {
    row[k] = isCond(v) && v.increment !== undefined ? (Number(row[k]) || 0) + v.increment : v;
  }
  row.updatedAt = NOW;
  return row;
}

const DEFAULTS: Record<string, Row> = {
  contentPipelineJob: { status: "ACTIVE", attempts: 1 },
  pipelineRun: { status: "RUNNING", lockKey: null },
};

interface Seed {
  settings?: Record<string, string>;
  posts?: Row[];
  runs?: Row[];
  jobs?: Row[];
  sources?: Row[];
}

const IRCC_SOURCE = { id: "csrc00000000000000000001", name: "IRCC", url: "https://feed.test/ircc", type: "RSS", enabled: true, trustScore: 100, lastCheckedAt: null };

function createFakeDb(seed: Seed = {}) {
  let n = 0;
  const id = () => `cfake${String(++n).padStart(20, "0")}`;
  const t: Record<string, Row[]> = {
    platformSetting: Object.entries(seed.settings ?? {}).map(([key, value]) => ({ key, value })),
    contentSource: seed.sources ?? [IRCC_SOURCE],
    rawArticle: [],
    contentJob: [],
    blogPost: (seed.posts ?? []).map((p) => ({ id: id(), isPublished: true, targetKeyword: null, immigrationPaths: null, publishedAt: NOW, createdAt: NOW, ...p })),
    socialJob: [],
    contentPipelineJob: (seed.jobs ?? []).map((j) => ({ id: id(), createdAt: NOW, updatedAt: NOW, ...DEFAULTS.contentPipelineJob, ...j })),
    pipelineRun: seed.runs ?? [],
    contentImage: [],
  };

  const table = (name: string, unique?: string) => ({
    findMany: async ({ where, take }: Row = {}) => t[name].filter((r) => matches(r, where as Row)).slice(0, (take as number) ?? Infinity),
    findFirst: async ({ where }: Row = {}) => t[name].find((r) => matches(r, where as Row)) ?? null,
    findUnique: async ({ where }: Row) => t[name].find((r) => matches(r, where as Row)) ?? null,
    count: async ({ where }: Row = {}) => t[name].filter((r) => matches(r, where as Row)).length,
    create: async ({ data }: Row) => {
      const d = data as Row;
      if (unique && d[unique] != null && t[name].some((r) => r[unique] === d[unique])) {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" });
      }
      const row: Row = { id: id(), createdAt: NOW, updatedAt: NOW, startedAt: NOW, ...DEFAULTS[name], ...d };
      t[name].push(row);
      return row;
    },
    update: async ({ where, data }: Row) => {
      const row = t[name].find((r) => matches(r, where as Row));
      if (!row) throw new Error(`${name} not found`);
      return applyData(row, data as Row);
    },
    updateMany: async ({ where, data }: Row) => {
      const rows = t[name].filter((r) => matches(r, where as Row));
      rows.forEach((r) => applyData(r, data as Row));
      return { count: rows.length };
    },
    upsert: async ({ where, create, update }: Row) => {
      const row = t[name].find((r) => matches(r, where as Row));
      if (row) return applyData(row, update as Row);
      const created: Row = { id: id(), ...(create as Row) };
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
    pipelineRun: table("pipelineRun", "lockKey"),
    contentImage: table("contentImage"),
  };
  db.$transaction = async (fn: (tx: Row) => Promise<unknown>) => fn(db);
  return { db: db as unknown as PrismaClient, tables: t };
}

// ─── Fake LLM ────────────────────────────────────────────────────────────────
const PARA =
  "Applicants should read the official IRCC guidance before they submit anything. The department says processing depends on a complete application, " +
  "so people may want to check each document against the published checklist and keep copies of everything they send to the department.";

function fakeDraft(topic: string, sourceUrl: string, title = topic): Draft {
  return {
    title,
    metaTitle: title.slice(0, 50),
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    summary: `IRCC announced an update: ${title}. Here is what changed and who it affects.`,
    targetKeyword: title.split(" ").slice(0, 3).join(" "),
    targetKeywordEn: title.split(" ").slice(0, 3).join(" "),
    secondaryKeywords: ["IRCC update"],
    outline: ["What changed", "Who is affected", "Key dates", "What to do next"],
    sections: ["What changed", "Who is affected", "Key dates", "What to do next"].map((heading) => ({ heading, body: `${PARA} ${PARA} ${PARA}` })),
    faq: [{ question: "Who does this affect?", answer: "People applying under this program, according to IRCC." }],
    citations: [
      { title: "IRCC news release", url: sourceUrl },
      { title: "Made-up blog", url: "https://hallucinated.example/post" },
    ],
    immigrationPaths: ["not_a_real_path"],
    articleType: "news",
    keyFacts: ["IRCC announced the update."],
    imagePrompt: "Applicants waiting at an immigration office",
    imageAlt: "People waiting at a Canadian immigration office",
    secondarySummary: null,
  };
}

interface FakeLlmOptions {
  verdict?: "supported" | "unsupported";
  speculative?: string[]; // sentences the fake reviewer asks to remove
  prompts?: { name: string; system: string; user: string }[];
  failOnceFor?: string[]; // topics whose first draft call throws
  titleFor?: (topic: string) => string;
}

function createFakeLlm(opts: FakeLlmOptions = {}): Llm & { calls: string[]; setVerdict(v: "supported" | "unsupported"): void } {
  const calls: string[] = [];
  const failing = new Set(opts.failOnceFor ?? []);
  let verdict = opts.verdict ?? "supported";
  return {
    calls,
    setVerdict: (v) => {
      verdict = v;
    },
    async json<T>(_schema: unknown, name: string, system: string, user: string): Promise<T> {
      calls.push(name);
      opts.prompts?.push({ name, system, user });
      if (name === "article_draft") {
        const topic = /TOPIC: (.*)/.exec(user)?.[1] ?? "Topic";
        const url = /SOURCE URL: (.*)/.exec(user)?.[1] ?? "";
        if (failing.delete(topic)) throw new Error("OpenAI timeout (simulated)");
        return fakeDraft(topic, url, opts.titleFor?.(topic) ?? topic) as unknown as T;
      }
      return {
        overallScore: 88,
        claims: [{ claim: "IRCC announced the update.", verdict, note: "Stated in the release." }],
        speculativeSentences: opts.speculative ?? [],
        givesLegalAdvice: false,
        summary: "Accurate and clear.",
      } as unknown as T;
    },
  };
}

const DEFAULT_FEED: FeedItem[] = [
  { title: "Express Entry draw invites 5,000 CEC candidates", link: `${SRC}/express-entry-draw.html`, isoDate: NOW.toISOString(), snippet: "Express Entry round" },
  { title: "Spousal sponsorship processing times improve", link: `${SRC}/spousal-sponsorship.html`, isoDate: NOW.toISOString(), snippet: "Family sponsorship" },
  { title: "Study permit cap for 2027 announced", link: `${SRC}/study-cap.html`, isoDate: NOW.toISOString(), snippet: "Study permits" },
  { title: "Minister visits a hockey arena", link: `${SRC}/hockey.html`, isoDate: NOW.toISOString(), snippet: "Sports" },
];

function createDeps(
  db: PrismaClient,
  llm: Llm,
  extra: { revalidated?: string[][]; feeds?: Record<string, FeedItem[]>; images?: { count: number } } = {}
): PipelineDeps {
  return {
    db,
    llm,
    fetchFeed: async (url) => extra.feeds?.[url] ?? DEFAULT_FEED,
    fetchHtml: async (url) => `<html><body><nav>menu</nav><main><h1>Release</h1><p>${PARA} Source: ${url}</p><p>${PARA}</p></main></body></html>`,
    generateImage: async () => {
      if (extra.images) extra.images.count++;
      return { bytes: Buffer.from([1, 2, 3]), mimeType: "image/png" };
    },
    revalidate: (paths) => extra.revalidated?.push(paths),
    now: () => NOW,
    log: () => {},
  };
}

const EXISTING_POST = { title: "Study permit cap for 2027 announced", slug: "study-permit-cap-2027" };
const pipelinePosts = (t: Record<string, Row[]>) => t.blogPost.filter((p) => p.source === "PIPELINE");

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
    const summary = await runContentPipeline(createDeps(db, createFakeLlm(), { revalidated }), { trigger: "MANUAL" });

    expect(summary).toMatchObject({ status: "COMPLETED", produced: 2, rejected: 0, failed: 0, autopublish: false });

    const created = pipelinePosts(tables);
    expect(created).toHaveLength(2);
    expect(created.every((p) => p.isPublished === false && p.publishedAt === null)).toBe(true);
    expect(created.map((p) => p.title)).not.toContain(EXISTING_POST.title);
    expect(created.map((p) => str(p.title)).join(" ")).not.toMatch(/hockey/i);
    expect(created.every((p) => p.language === "en")).toBe(true);

    expect(tables.socialJob).toHaveLength(2);
    for (const s of tables.socialJob) {
      expect(s.status).toBe("QUEUED");
      expect([s.linkedinStatus, s.twitterStatus, s.facebookStatus, s.telegramStatus]).toEqual(["SKIPPED", "SKIPPED", "SKIPPED", "SKIPPED"]);
    }

    expect(tables.contentPipelineJob.map((j) => j.stage)).toEqual(["READY", "READY"]);
    expect(revalidated).toEqual([]);
    expect(tables.pipelineRun[0]).toMatchObject({ status: "COMPLETED", published: 2, lockKey: null });
  });

  it("assembles SEO-ready content: disclaimer, real citation only, FAQ marker, JSON-LD, durable image URL", async () => {
    const { db, tables } = createFakeDb();
    await runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" });
    const post = pipelinePosts(tables)[0];
    const content = str(post.content);

    expect(hasDisclaimer(content)).toBe(true);
    expect(content.indexOf("not legal advice")).toBeLessThan(content.indexOf("## What changed"));
    expect(content).toContain(`](${SRC}/`);
    expect(content).not.toContain("hallucinated.example");
    expect(content).toContain(`## ${EN.faq}`);
    expect(content).toContain("<end-of-faq>");
    expect(content).toMatch(/\]\(\/search\?q=/);

    expect(str(post.seoTitle)).not.toMatch(/Verixa/);
    expect(str(post.seoDesc).length).toBeLessThanOrEqual(155);
    expect(str(post.slug)).toMatch(/^[a-z0-9-]+$/);
    expect(JSON.parse(str(post.immigrationPaths))).not.toContain("not_a_real_path");
    expect(JSON.parse(str(post.jsonLd))).toMatchObject({ "@type": "NewsArticle", citation: [{ url: expect.stringContaining(SRC) }] });
    expect(str(post.coverImage)).toMatch(/\/api\/content-image\/cfake/);
    expect(post.imageAlt).toBe("People waiting at a Canadian immigration office");
    expect(tables.rawArticle.every((r) => r.status === "PROCESSED")).toBe(true);
  });

  it("is idempotent: a same-day rerun stops at the quota and never re-processes an item", async () => {
    const { db, tables } = createFakeDb();
    const llm = createFakeLlm();
    await runContentPipeline(createDeps(db, llm), { trigger: "CRON" });

    const again = await runContentPipeline(createDeps(db, llm), { trigger: "CRON" });
    expect(again).toMatchObject({ status: "SKIPPED" });
    expect(again.reason).toMatch(/quota/i);

    tables.platformSetting.push({ key: "content_pieces_per_day", value: "10" });
    const third = await runContentPipeline(createDeps(db, llm), { trigger: "CRON" });
    const slugs = tables.blogPost.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(tables.blogPost).toHaveLength(3);
    expect(third.produced).toBe(1);
  });

  it("autopublish ON: post goes live, social job is still only QUEUED (never sent)", async () => {
    const { db, tables } = createFakeDb({ settings: { content_autopublish_enabled: "true", content_channel_linkedin: "true", content_pieces_per_day: "1" } });
    const revalidated: string[][] = [];
    const summary = await runContentPipeline(createDeps(db, createFakeLlm(), { revalidated }), { trigger: "CRON" });

    expect(summary).toMatchObject({ produced: 1, autopublish: true });
    expect(tables.blogPost[0]).toMatchObject({ isPublished: true, publishedAt: NOW });
    expect(tables.socialJob[0]).toMatchObject({ status: "QUEUED", linkedinStatus: "PENDING", twitterStatus: "SKIPPED" });
    expect(tables.contentPipelineJob[0].stage).toBe("PUBLISHED");
    expect(revalidated.flat()).toContain("/blog");
  });

  it("reviewer gate: unsupported claims are rejected and no post is created", async () => {
    const { db, tables } = createFakeDb();
    const summary = await runContentPipeline(createDeps(db, createFakeLlm({ verdict: "unsupported" })), { trigger: "CRON" });

    expect(summary.produced).toBe(0);
    expect(summary.rejected).toBeGreaterThan(0);
    expect(tables.blogPost).toHaveLength(0);
    expect(tables.socialJob).toHaveLength(0);
    const job = tables.contentPipelineJob[0];
    expect(job.stage).toBe("REJECTED");
    expect(str(job.rejectionReason)).toMatch(/Unsupported by sources/);
    expect(job.draftMarkdown).toBeTruthy();
  });

  it("images off: skips image generation entirely", async () => {
    const { db, tables } = createFakeDb({ settings: { content_images_enabled: "false" } });
    const images = { count: 0 };
    const summary = await runContentPipeline(createDeps(db, createFakeLlm(), { images }), { trigger: "CRON" });
    expect(summary.produced).toBe(2);
    expect(images.count).toBe(0);
    expect(tables.contentImage).toHaveLength(0);
    expect(pipelinePosts(tables).every((p) => p.coverImage === null)).toBe(true);
  });

  it("Persian config localizes headings, footer, social copy, and stores the language", async () => {
    const { db, tables } = createFakeDb({ settings: { content_language: "fa", content_pieces_per_day: "1" } });
    await runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" });
    const fa = LANGUAGE_PROFILES.fa.labels;
    const post = pipelinePosts(tables)[0];
    const content = str(post.content);
    expect(post.language).toBe("fa");
    expect(content).toContain(`## ${fa.faq}`);
    expect(content).toContain(`## ${fa.sources}`);
    expect(content).toContain(`## ${fa.related}`);
    expect(content).toContain("را وریکسا بر اساس اطلاعات رسمی");
    expect(content).not.toContain("Find a licensed consultant");
    expect(content).not.toContain("Prepared by Verixa");
    expect(content).not.toContain("تیم تحریریه");
    expect(str(tables.socialJob[0].linkedinCopy)).toContain(fa.readMore);
    expect(str(tables.socialJob[0].linkedinCopy)).toContain(`#${fa.hashtag}`);
    expect(JSON.parse(str(post.jsonLd)).inLanguage).toBe("fa");
  });
});

describe("dedup across sources and drafts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", () => {
      throw new Error("Network access is disabled in tests");
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("the same event from IRCC and CIC News becomes one post, from the higher-trust source", async () => {
    const CIC = { id: "csrc00000000000000000002", name: "CIC News", url: "https://feed.test/cic", type: "RSS", enabled: true, trustScore: 70, lastCheckedAt: null };
    const { db, tables } = createFakeDb({ sources: [IRCC_SOURCE, CIC], settings: { content_pieces_per_day: "5" } });
    const feeds = {
      [IRCC_SOURCE.url]: [{ title: "Canada modernizes the asylum system to support timely decisions", link: `${SRC}/asylum.html`, isoDate: NOW.toISOString(), snippet: "" }],
      [CIC.url]: [
        { title: "IRCC changes asylum system to speed up decisions", link: "https://www.cicnews.com/2026/11/asylum-1.html", isoDate: new Date(NOW.getTime() + 6 * 3600_000).toISOString(), snippet: "" },
      ],
    };
    const summary = await runContentPipeline(createDeps(db, createFakeLlm(), { feeds }), { trigger: "CRON" });
    expect(summary.produced).toBe(1);
    expect(pipelinePosts(tables)).toHaveLength(1);
    expect(tables.contentPipelineJob[0].sourceUrl).toBe(`${SRC}/asylum.html`);
    expect(summary.log.join("\n")).toMatch(/same event as "Canada modernizes/);
  });

  it("re-checks the written draft: a reworded headline that becomes an existing post is skipped", async () => {
    const existing = { title: "Spousal sponsorship processing times improve", slug: "spousal-sponsorship-processing-times-improve" };
    const feeds = { [IRCC_SOURCE.url]: [{ title: "Family class backlog update for partners", link: `${SRC}/partners.html`, isoDate: NOW.toISOString(), snippet: "sponsorship" }] };
    const { db, tables } = createFakeDb({ posts: [existing] });
    const llm = createFakeLlm({ titleFor: () => "Spousal sponsorship processing times improve" });
    const summary = await runContentPipeline(createDeps(db, llm, { feeds }), { trigger: "CRON" });

    expect(summary.produced).toBe(0);
    expect(pipelinePosts(tables)).toHaveLength(0);
    expect(tables.contentPipelineJob[0]).toMatchObject({ stage: "SKIPPED_DUPLICATE", status: "DONE" });
    expect(str(tables.contentPipelineJob[0].rejectionReason)).toContain(existing.slug);
    expect(llm.calls).not.toContain("editorial_review"); // stopped before spending on review/image
  });
});

describe("recovery, retries and locking", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", () => {
      throw new Error("Network access is disabled in tests");
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("a FAILED job is retried automatically by the next run", async () => {
    const { db, tables } = createFakeDb();
    const llm = createFakeLlm({ failOnceFor: [DEFAULT_FEED[0].title] });
    const first = await runContentPipeline(createDeps(db, llm), { trigger: "CRON" });
    expect(first).toMatchObject({ produced: 2, failed: 1 });
    const failedJob = tables.contentPipelineJob.find((j) => j.topic === DEFAULT_FEED[0].title)!;
    expect(failedJob).toMatchObject({ stage: "FAILED", status: "ERROR", attempts: 1 });

    tables.platformSetting.push({ key: "content_pieces_per_day", value: "10" });
    const second = await runContentPipeline(createDeps(db, llm), { trigger: "CRON" });
    expect(second.produced).toBe(1);
    expect(failedJob).toMatchObject({ stage: "READY", status: "DONE", attempts: 2, rejectionReason: null });
    expect(tables.contentPipelineJob).toHaveLength(3); // the row was reused, not duplicated
  });

  it("stops auto-retrying after MAX_JOB_ATTEMPTS", async () => {
    const item = DEFAULT_FEED[0];
    const { db, tables } = createFakeDb({
      jobs: [{ dedupKey: dedupKeyFor({ sourceUrl: item.link, title: item.title }), topic: item.title, stage: "FAILED", status: "ERROR", attempts: 3 }],
    });
    await runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" });
    expect(tables.contentPipelineJob[0]).toMatchObject({ stage: "FAILED", attempts: 3 });
    expect(pipelinePosts(tables).map((p) => p.title)).not.toContain(item.title);
  });

  it("closes out a timed-out run and its ACTIVE jobs, plus orphaned ACTIVE jobs", async () => {
    const old = new Date(NOW.getTime() - 4 * RUN_LOCK_MS);
    const { db, tables } = createFakeDb({
      runs: [{ id: "cstale", status: "RUNNING", lockKey: "RUNNING", startedAt: old }],
      jobs: [
        { dedupKey: "topic:mid-flight", topic: "Mid-flight", stage: "WRITING", status: "ACTIVE", pipelineRunId: "cstale", updatedAt: old },
        { dedupKey: "topic:orphan", topic: "Orphan", stage: "IMAGE", status: "ACTIVE", pipelineRunId: null, updatedAt: old },
        { dedupKey: "topic:done", topic: "Done", stage: "READY", status: "DONE", pipelineRunId: "cstale", updatedAt: old },
      ],
    });
    const summary = await runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" });

    expect(summary.status).toBe("COMPLETED"); // lock was freed, so this run proceeded
    expect(tables.pipelineRun.find((r) => r.id === "cstale")).toMatchObject({ status: "FAILED", lockKey: null });
    for (const topic of ["Mid-flight", "Orphan"]) {
      expect(tables.contentPipelineJob.find((j) => j.topic === topic)).toMatchObject({ stage: "FAILED", status: "ERROR", rejectionReason: "Run timed out" });
    }
    expect(tables.contentPipelineJob.find((j) => j.topic === "Done")).toMatchObject({ stage: "READY", status: "DONE" });
  });

  it("run lock: skips while another run holds the lock", async () => {
    const { db, tables } = createFakeDb({ runs: [{ id: "crun", status: "RUNNING", lockKey: "RUNNING", startedAt: new Date(NOW.getTime() - 60_000) }] });
    const summary = await runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" });
    expect(summary).toMatchObject({ status: "SKIPPED", reason: "Another pipeline run is in progress." });
    expect(tables.blogPost).toHaveLength(0);
  });

  it("run lock is atomic: two simultaneous runs → one runs, one skips", async () => {
    const { db, tables } = createFakeDb();
    const results = await Promise.all([
      runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" }),
      runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "MANUAL" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["COMPLETED", "SKIPPED"]);
    expect(pipelinePosts(tables)).toHaveLength(2);
    expect(tables.pipelineRun).toHaveLength(1);
  });

  it("admin retry re-runs a rejected draft and refuses jobs that already have a post", async () => {
    const { db, tables } = createFakeDb({ settings: { content_pieces_per_day: "1" } });
    const llm = createFakeLlm({ verdict: "unsupported" });
    const deps = createDeps(db, llm);
    await runContentPipeline(deps, { trigger: "CRON" });
    const rejected = tables.contentPipelineJob.find((j) => j.stage === "REJECTED")!;
    expect(rejected).toBeDefined();

    llm.setVerdict("supported");
    const retried = await retryJob(deps, str(rejected.id));
    expect(retried).toEqual({ ok: true, outcome: "produced" });
    expect(rejected).toMatchObject({ stage: "READY", attempts: 2, blogPostId: expect.any(String) });
    expect(pipelinePosts(tables)).toHaveLength(1);

    expect(await retryJob(deps, str(rejected.id))).toMatchObject({ ok: false });
  });
});

describe("config", () => {
  it("defaults to English, 2/day, auto-publish OFF, images ON, all channels OFF", () => {
    const c = parseConfig({});
    expect(c).toMatchObject({ piecesPerDay: 2, autopublish: false, imagesEnabled: true, strictness: "standard", minQualityScore: 70 });
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

  it("every language's FAQ heading is recognised by the blog page", () => {
    for (const p of Object.values(LANGUAGE_PROFILES)) expect(FAQ_HEADINGS).toContain(p.labels.faq);
  });

  it("validates admin input", () => {
    const ok = { language: "en+fa", piecesPerDay: 2, autopublish: false, strictness: "strict", imagesEnabled: false, channels: { linkedin: true, twitter: false, facebook: false, telegram: false } };
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
      labels: EN,
    });
    expect(md.startsWith("<!-- verixa:disclaimer -->\n> General information only")).toBe(true);
    expect(md).toContain("## What changed");
    expect(md).not.toContain("# # What");
    expect(md.match(/<end-of-faq>/g)).toHaveLength(1);
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
    const c = buildSocialCopy({ title: "A".repeat(400), summary: "s", url: "https://www.getverixa.com/blog/x", paths: ["express_entry"], labels: EN });
    const counted = c.twitter.replace("https://www.getverixa.com/blog/x", "x".repeat(23));
    expect(counted.length).toBeLessThanOrEqual(280);
    expect(c.linkedin).toContain("not legal advice");
    expect(c.linkedin).toContain("#CanadaImmigration #ExpressEntry");
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


// ─── Accuracy fixes (asylum-reforms test article, 2026-11-05) ────────────────

describe("thin official sources", () => {
  const UPDATE = "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/updates/asylum.html";
  const LINKED = (n: number) => `https://www.canada.ca/en/immigration-refugees-citizenship/corporate/refugee/page-${n}.html`;
  const thinUpdate = `<html><body><main><h1>Program delivery update</h1>
    <p>Instructions were updated on November 3, 2026.</p>
    <ul>${[1, 2, 3, 4, 5].map((n) => `<li><a href="${LINKED(n).replace("https://www.canada.ca", "")}">Processing in-Canada claims: part ${n}</a></li>`).join("")}
    <li><a href="https://other.example/x">An off-site page that should not be followed</a></li>
    <li><a href="/en/services/benefits.html">A page from another department section</a></li></ul>
    <section id="wb-dtmd"><a href="/en/report-problem.html">Report a problem or mistake</a></section></main></body></html>`;

  it("extractOfficialLinks keeps same-section official links only (max 4, no off-site/other sections/page details)", () => {
    const links = extractOfficialLinks(thinUpdate, UPDATE);
    expect(links.map((l) => l.url)).toEqual([1, 2, 3, 4].map(LINKED));
    expect(links[0].title).toBe("Processing in-Canada claims: part 1");
  });

  it("enriches a thin source with linked pages and lets the writer cite them", async () => {
    const { db, tables } = createFakeDb();
    const prompts: { name: string; system: string; user: string }[] = [];
    const deps = createDeps(db, createFakeLlm({ prompts }));
    deps.fetchHtml = async (url) =>
      url === UPDATE ? thinUpdate : `<html><body><main><p>Linked page ${url}. ${PARA} ${PARA}</p></main></body></html>`;
    const r = await runSingleSource(deps, { url: UPDATE, title: "Asylum instructions updated", sourceName: "IRCC", publishedAt: NOW });
    expect(r.produced).toBe(1);
    const writer = prompts.find((p) => p.name === "article_draft")!;
    expect(writer.user).toContain(`RELATED OFFICIAL PAGE: Processing in-Canada claims: part 1\nURL: ${LINKED(1)}`);
    expect(writer.system).toContain("never pad a thin source");
    const job = tables.contentPipelineJob[0];
    expect(JSON.parse(str(job.reviewNotes)).relatedSources).toHaveLength(4);
  });

  it("length targets follow the source; the gate's minimum drops for thin sources", () => {
    expect(targetLength(250)).toEqual({ min: 200, max: 275 });
    expect(targetLength(3000)).toEqual({ min: 600, max: 1100 });
    expect(minWordsFor(150)).toBe(200);
    expect(minWordsFor(2000)).toBe(350);
    const goodChecks = { disclaimerPresent: true, wordCount: 260, citationCount: 1, headingIssues: [], bannedPhrases: [], offSourceLinks: [] };
    expect(computeReviewScore({ llmScore: 90, claims: [], checks: goodChecks, strictness: "standard", minScore: 70, minWords: 200 }).flags).toEqual([]);
    expect(computeReviewScore({ llmScore: 90, claims: [], checks: goodChecks, strictness: "standard", minScore: 70 }).flags[0]).toMatch(/Too short/);
  });

  it("sanitizeDraft allows citations to the given related pages, source first, nothing else", () => {
    const candidate = { title: "Update", sourceUrl: UPDATE, sourceName: "IRCC", sourceTrust: 100, publishedAt: NOW, snippet: "", paths: ["refugee"] };
    const draft = { ...fakeDraft("Update", UPDATE), citations: [{ title: "Part 2", url: LINKED(2) + "?x=1" }, { title: "Blog", url: "https://random.example/a" }, { title: "Update", url: UPDATE }] };
    const d = sanitizeDraft(draft, candidate, [{ title: "Part 2", url: LINKED(2) }]);
    expect(d.citations.map((c) => c.url)).toEqual([UPDATE, LINKED(2)]);
  });

  it("the writer prompt forbids invented purposes and staff-guidance framing errors", () => {
    const { system } = buildWriterPrompt({
      candidate: { title: "t", sourceUrl: UPDATE, sourceName: "IRCC", sourceTrust: 100, publishedAt: NOW, snippet: "", paths: [] },
      sourceText: "word ".repeat(250),
      language: parseLanguageSetting("en"),
    });
    expect(system).toContain("aims to streamline");
    expect(system).toContain("guidance written for IRCC or CBSA staff");
    expect(system).toContain("200-275 words");
  });
});

describe("editor removes speculation", () => {
  const md = [
    "<!-- verixa:disclaimer -->",
    "> General information only — not legal advice.",
    "",
    "## What changed",
    "",
    "IRCC updated its intake instructions on November 3, 2026. These changes aim to streamline the process and ensure efficiency.",
    "",
    "## Why it matters",
    "",
    "The reforms are designed to enhance oversight of decisions.",
    "",
    "## Sources",
    "",
    "- [IRCC](https://www.canada.ca/x)",
    "",
    "## Frequently Asked Questions",
    "",
    "### Why were the rules changed?",
    "To provide more flexibility for claimants.",
    "",
    "<end-of-faq>",
    "",
    "---",
    "",
    "*Prepared by Verixa from official information published by IRCC (2026-11-05).*",
    "",
  ].join("\n");

  it("drops quoted sentences, then headings and FAQ blocks left empty, and keeps facts", () => {
    const { markdown, removed } = removeSentences(
      md,
      ["These changes aim to streamline the process and ensure efficiency", "The reforms are designed to enhance oversight of decisions.", "To provide more flexibility for claimants."],
      FAQ_HEADINGS
    );
    expect(removed).toBe(3);
    expect(markdown).toContain("IRCC updated its intake instructions on November 3, 2026.");
    expect(markdown).not.toContain("streamline");
    expect(markdown).not.toContain("## Why it matters");
    expect(markdown).not.toContain("Frequently Asked Questions");
    expect(markdown).not.toContain("<end-of-faq>");
    expect(markdown).toContain("## Sources");
    expect(markdown).toContain("*Prepared by Verixa");
    expect(markdown.startsWith("<!-- verixa:disclaimer -->\n> General information only")).toBe(true);
  });

  it("never touches headings, the disclaimer, links or the footer, and ignores fragments", () => {
    expect(removeSentences(md, ["What changed", "IRCC", "Prepared by Verixa from official information published by IRCC (2026-11-05)."]).removed).toBe(0);
  });

  it("runs inside the reviewer: the stored draft has the speculative sentence removed", async () => {
    const { db, tables } = createFakeDb({ settings: { content_pieces_per_day: "1" } });
    const sentence = "The department says processing depends on a complete application, so people may want to check each document against the published checklist and keep copies of everything they send to the department.";
    await runContentPipeline(createDeps(db, createFakeLlm({ speculative: [sentence] })), { trigger: "CRON" });
    const post = pipelinePosts(tables)[0];
    expect(str(post.content)).not.toContain("keep copies of everything they send");
    expect(str(post.content)).toContain("Applicants should read the official IRCC guidance");
  });
});

describe("related links, category, image prompt", () => {
  it("does not link unrelated posts that only share generic words", () => {
    const posts = [
      { title: "Canada Announces Overhaul of Express Entry System: What Immigrants Need to Know", slug: "ee", immigrationPaths: '["express_entry"]' },
      { title: "New AAIP Fee: Understanding the Impact on Alberta's Worker EOI System", slug: "aaip", immigrationPaths: '["pnp"]' },
      { title: "Refugee claim withdrawals before IRB referral explained", slug: "ref", immigrationPaths: '["refugee"]' },
    ];
    expect(pickRelatedPosts({ title: "Canada Updates In-Canada Asylum System Procedures", immigrationPaths: ["refugee"] }, posts)).toEqual([{ title: posts[2].title, slug: "ref" }]);
    expect(pickRelatedPosts({ title: "Canada Updates In-Canada Asylum System Procedures", immigrationPaths: ["general"] }, posts.slice(0, 2))).toEqual([]);
  });

  it("news goes to UPDATES_POLICY, guides to IMMIGRATION_GUIDES", () => {
    expect(categoryFor(["refugee"], "news")).toBe("UPDATES_POLICY");
    expect(categoryFor(["refugee"], "guide")).toBe("IMMIGRATION_GUIDES");
  });

  it("cover image prompt bans flags, uniforms and officials", () => {
    const p = buildImagePrompt("An immigration officer reviewing files");
    expect(p).toContain("NO flags");
    expect(p).toContain("NO uniforms");
    expect(p).toContain("officers or officials");
  });
});

describe("regenerate a draft in place", () => {
  it("rewrites the same unpublished post (same id and slug) and refreshes a QUEUED social job", async () => {
    const { db, tables } = createFakeDb({ settings: { content_pieces_per_day: "1" } });
    const llm = createFakeLlm();
    await runContentPipeline(createDeps(db, llm), { trigger: "CRON" });
    const job = tables.contentPipelineJob.find((j) => j.stage === "READY")!;
    const post = tables.blogPost.find((p) => p.id === job.blogPostId)!;
    const before = { id: post.id, slug: post.slug, count: pipelinePosts(tables).length };
    post.content = "old";

    post.coverImage = "https://www.getverixa.com/api/content-image/keep-me";
    const noImage = { ...createDeps(db, llm), generateImage: async () => null };
    const r = await regenerateJob(noImage, str(job.id));
    expect(r).toEqual({ ok: true, outcome: "produced" });
    expect(tables.blogPost.find((p) => p.id === before.id)!.coverImage).toBe("https://www.getverixa.com/api/content-image/keep-me");
    const after = tables.blogPost.find((p) => p.id === before.id)!;
    expect(after.slug).toBe(before.slug);
    expect(str(after.content)).not.toBe("old");
    expect(pipelinePosts(tables)).toHaveLength(before.count);
    expect(tables.contentPipelineJob.find((j) => j.id === job.id)!.stage).toBe("READY");
  });

  it("refuses a published post", async () => {
    const { db, tables } = createFakeDb({ settings: { content_pieces_per_day: "1", content_autopublish_enabled: "true" } });
    await runContentPipeline(createDeps(db, createFakeLlm()), { trigger: "CRON" });
    const job = tables.contentPipelineJob.find((j) => j.blogPostId)!;
    job.stage = "READY";
    const r = await regenerateJob(createDeps(db, createFakeLlm()), str(job.id));
    expect(r.ok).toBe(false);
  });
});
