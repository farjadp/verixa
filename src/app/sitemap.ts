// Route: /sitemap.xml — static pages, published blog posts, and verified consultant profiles.
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/content-pipeline/seo";

export const revalidate = 3600;

const STATIC_PATHS = ["", "/blog", "/search", "/pricing", "/partnerships", "/disclaimer", "/privacy", "/terms", "/refund-policy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${site}${p}`,
    changeFrequency: p === "" || p === "/blog" ? "daily" : "monthly",
    priority: p === "" ? 1 : p === "/blog" ? 0.8 : 0.5,
  }));

  try {
    const [posts, consultants] = await Promise.all([
      prisma.blogPost.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: "desc" },
        take: 5000,
      }),
      prisma.consultantProfile.findMany({
        where: { status: "VERIFIED" },
        select: { licenseNumber: true, updatedAt: true },
        take: 5000,
      }),
    ]);
    for (const p of posts) {
      entries.push({ url: `${site}/blog/${p.slug}`, lastModified: p.updatedAt ?? p.publishedAt ?? undefined, changeFrequency: "weekly", priority: 0.7 });
    }
    for (const c of consultants) {
      entries.push({ url: `${site}/consultant/${encodeURIComponent(c.licenseNumber)}`, lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.6 });
    }
  } catch (e) {
    // Build-time or DB outage: still serve the static entries.
    console.warn("[sitemap] dynamic entries skipped:", e instanceof Error ? e.message : e);
  }
  return entries;
}
