// Route: /sitemap.xml — static pages, published blog posts, and RCIC profiles the
// CICC register lists as entitled to practise (status "Yes"/"Active").
// ~11.4k consultant URLs today; one file holds up to 50,000, so no index is needed yet.
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/content-pipeline/seo";
import { ENTITLED_STATUSES } from "@/lib/seo/structured-data";

export const revalidate = 3600;

const STATIC_PATHS = ["", "/search", "/blog", "/pricing", "/partnerships", "/disclaimer", "/privacy", "/terms", "/refund-policy", "/consultant-agreement"];

/** Hard cap below the 50,000-URL sitemap limit, leaving room for static and blog entries. */
const MAX_CONSULTANTS = 45_000;
const MAX_POSTS = 4_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${site}${p}`,
    changeFrequency: p === "" || p === "/blog" ? "daily" : "monthly",
    priority: p === "" ? 1 : p === "/search" || p === "/blog" ? 0.8 : 0.3,
  }));

  // Sequential, not parallel: DATABASE_URL runs with connection_limit=1.
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: MAX_POSTS,
    });
    for (const p of posts) {
      entries.push({ url: `${site}/blog/${p.slug}`, lastModified: p.updatedAt ?? p.publishedAt ?? undefined, changeFrequency: "weekly", priority: 0.7 });
    }
  } catch (e) {
    console.warn("[sitemap] blog entries skipped:", e instanceof Error ? e.message : e);
  }

  try {
    const consultants = await prisma.consultantProfile.findMany({
      where: { status: { in: [...ENTITLED_STATUSES], mode: "insensitive" } },
      select: { licenseNumber: true, updatedAt: true },
      orderBy: { licenseNumber: "asc" },
      take: MAX_CONSULTANTS,
    });
    for (const c of consultants) {
      entries.push({ url: `${site}/consultant/${encodeURIComponent(c.licenseNumber)}`, lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.6 });
    }
  } catch (e) {
    // Build-time or DB outage: still serve the static and blog entries.
    console.warn("[sitemap] consultant entries skipped:", e instanceof Error ? e.message : e);
  }
  return entries;
}
