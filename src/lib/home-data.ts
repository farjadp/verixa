// ============================================================================
// Homepage data layer. Every query is capped and wrapped; each block degrades
// on its own (the page must never SSR-500, and one failing query must not
// blank the others). Returned shapes are plain JSON for client components.
// ============================================================================
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailable, markDatabaseUnavailable } from "@/lib/db-availability";
import { PATHWAYS, type PathwayKey } from "@/lib/home-pathways";

export interface HomeConsultant {
  licenseNumber: string;
  fullName: string;
  company: string | null;
  city: string | null;
  province: string | null;
  avatarImage: string | null;
  languages: string[];
  /** Claimed and identity-verified on Verixa (linked user account). */
  claimed: boolean;
}

export interface HomeArticle {
  slug: string;
  title: string;
  summary: string;
  category: string;
  coverImage: string | null;
  publishedAt: string | null;
  paths: string[];
}

export interface HomeData {
  consultantCount: number | null;
  consultantsByRoute: Record<PathwayKey, HomeConsultant[]>;
  articlesByRoute: Record<PathwayKey, HomeArticle[]>;
  latestArticles: HomeArticle[];
}

const PER_ROUTE_CONSULTANTS = 4;
const PER_ROUTE_ARTICLES = 3;
const TRACKER_ARTICLES = 5;

const consultantSelect = {
  licenseNumber: true,
  fullName: true,
  company: true,
  city: true,
  province: true,
  avatarImage: true,
  languages: true,
  userId: true,
} as const;

// `immigrationPaths` is selected separately: it only exists once the content
// pipeline migration has run, and the homepage must work before that too.
const articleBaseSelect = {
  slug: true,
  title: true,
  summary: true,
  category: true,
  coverImage: true,
  publishedAt: true,
} as const;

type ConsultantRow = {
  licenseNumber: string; fullName: string; company: string | null; city: string | null;
  province: string | null; avatarImage: string | null; languages: string | null; userId: string | null;
};
type ArticleRow = {
  slug: string; title: string; summary: string; category: string; coverImage: string | null;
  publishedAt: Date | null; immigrationPaths?: string | null;
};

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    /* comma-separated legacy value */
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function toConsultant(row: ConsultantRow): HomeConsultant {
  return {
    licenseNumber: row.licenseNumber,
    fullName: row.fullName,
    company: row.company,
    city: row.city,
    province: row.province,
    avatarImage: row.avatarImage,
    languages: parseList(row.languages).slice(0, 3),
    claimed: row.userId !== null,
  };
}

function toArticle(row: ArticleRow): HomeArticle {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    coverImage: row.coverImage,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    paths: parseList(row.immigrationPaths),
  };
}

function emptyRoutes<T>(): Record<PathwayKey, T[]> {
  return { pr: [], study: [], work: [], family: [], pnp: [], quebec: [] };
}

/** Top up a per-route list from a fallback pool, skipping duplicates. */
function fill<T>(primary: T[], pool: T[], limit: number, id: (x: T) => string): T[] {
  const seen = new Set(primary.map(id));
  const out = [...primary];
  for (const item of pool) {
    if (out.length >= limit) break;
    if (!seen.has(id(item))) { out.push(item); seen.add(id(item)); }
  }
  return out.slice(0, limit);
}

/** Run a query block; on failure log, flag connectivity problems, and return the fallback. */
async function safely<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    markDatabaseUnavailable(error);
    console.error(`Home: ${label} failed`, error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function loadConsultants(): Promise<Record<PathwayKey, HomeConsultant[]>> {
  // Fallback pool: newest claimed profiles (real people on Verixa), then newest overall.
  const claimedPool = await prisma.consultantProfile.findMany({
    where: { userId: { not: null }, status: { not: "PENDING" } },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: consultantSelect,
  });
  const anyPool = claimedPool.length >= PER_ROUTE_CONSULTANTS
    ? []
    : await prisma.consultantProfile.findMany({
        where: { status: { not: "PENDING" } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: consultantSelect,
      });
  const pool = [...claimedPool, ...anyPool].map(toConsultant);

  // One query for every route (the connection pool may allow a single
  // connection), then bucket in memory by specialization key.
  const allKeys = PATHWAYS.flatMap((p) => p.specializationKeys);
  const specialized = await prisma.consultantProfile.findMany({
    where: {
      status: { not: "PENDING" },
      OR: allKeys.map((k) => ({ specializations: { contains: `"${k}"` } })),
    },
    orderBy: [{ userId: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: PER_ROUTE_CONSULTANTS * PATHWAYS.length * 3,
    select: { ...consultantSelect, specializations: true },
  });

  const byRoute = emptyRoutes<HomeConsultant>();
  for (const p of PATHWAYS) {
    const wanted = new Set(p.specializationKeys);
    const matches = specialized
      .filter((row) => parseList(row.specializations).some((k) => wanted.has(k)))
      .slice(0, PER_ROUTE_CONSULTANTS)
      .map(toConsultant);
    byRoute[p.key] = fill(matches, pool, PER_ROUTE_CONSULTANTS, (c) => c.licenseNumber);
  }
  return byRoute;
}

async function loadLatestArticles(): Promise<HomeArticle[]> {
  const rows = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: TRACKER_ARTICLES,
    select: articleBaseSelect,
  });
  return rows.map(toArticle);
}

/** Needs the content-pipeline columns; callers fall back to `latest` when they are missing. */
async function loadArticlesByRoute(latest: HomeArticle[]): Promise<Record<PathwayKey, HomeArticle[]>> {
  const rows = await prisma.blogPost.findMany({
    where: { isPublished: true, immigrationPaths: { not: null } },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 60,
    select: { ...articleBaseSelect, immigrationPaths: true },
  });
  const tagged = rows.map(toArticle);

  const byRoute = emptyRoutes<HomeArticle>();
  for (const p of PATHWAYS) {
    const wanted = new Set(p.contentPaths);
    const matches = tagged.filter((a) => a.paths.some((k) => wanted.has(k))).slice(0, PER_ROUTE_ARTICLES);
    byRoute[p.key] = fill(matches, latest, PER_ROUTE_ARTICLES, (a) => a.slug);
  }
  return byRoute;
}

export async function getHomeData(): Promise<HomeData> {
  const empty: HomeData = {
    consultantCount: null,
    consultantsByRoute: emptyRoutes<HomeConsultant>(),
    articlesByRoute: emptyRoutes<HomeArticle>(),
    latestArticles: [],
  };
  if (isDatabaseUnavailable()) return empty;

  const [consultantCount, consultantsByRoute, latestArticles] = await Promise.all([
    safely("consultant count", null, () => prisma.consultantProfile.count()),
    safely("consultants by route", empty.consultantsByRoute, loadConsultants),
    safely("latest articles", [], loadLatestArticles),
  ]);

  const fallbackByRoute = emptyRoutes<HomeArticle>();
  for (const p of PATHWAYS) fallbackByRoute[p.key] = latestArticles.slice(0, PER_ROUTE_ARTICLES);
  const articlesByRoute = latestArticles.length === 0
    ? fallbackByRoute
    : await safely("articles by route", fallbackByRoute, () => loadArticlesByRoute(latestArticles));

  return { consultantCount, consultantsByRoute, articlesByRoute, latestArticles };
}
