// Route: /robots.txt
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/content-pipeline/seo";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    // "/api/content-image/" (cover images) stays crawlable: the longer allow rule beats "/api/".
    rules: [{ userAgent: "*", allow: ["/", "/api/content-image/"], disallow: ["/dashboard", "/api/", "/login", "/register", "/reset-password", "/forgot-password", "/unsubscribe"] }],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
