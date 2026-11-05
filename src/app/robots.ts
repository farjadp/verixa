// Route: /robots.txt
// Auth and booking pages are NOT disallowed here: they carry a noindex meta tag,
// which crawlers can only see if they are allowed to fetch the page.
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/content-pipeline/seo";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        // Longer allow rules beat "/api/": cover images and the share/logo image stay fetchable
        // (Twitterbot and Googlebot-Image honour robots.txt).
        allow: ["/", "/api/content-image/", "/api/assets/logo"],
        disallow: ["/dashboard", "/api/"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
