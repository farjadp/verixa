// ============================================================================
// Per-page Metadata builder (pure; unit tested)
// Next.js replaces a parent's openGraph/twitter objects instead of merging
// them, so a page that sets only `title` would otherwise inherit the home
// page's og:title. This fills title, description, canonical, OG and X together.
// ============================================================================
import type { Metadata } from "next";
import { BRAND } from "@/lib/content-pipeline/seo";

export const DEFAULT_SHARE_IMAGE = "/og-default.png";

export interface PageMetaInput {
  /** Title WITHOUT the brand; the root layout template appends " | Verixa". */
  title: string;
  description?: string;
  /** Site-relative canonical path, e.g. "/pricing". Omit for no canonical. */
  path?: string;
  image?: { url: string; alt?: string; width?: number; height?: number } | null;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
}

/** Strip a trailing " | Verixa" / " - Verixa" (and repeats) so the layout template adds it only once. */
export function stripBrand(title: string, brand = BRAND): string {
  const re = new RegExp(`(\\s*[|\\-–—]\\s*${brand}(\\s+\\w+)?)+\\s*$`, "i");
  return (title || "").replace(/\s+/g, " ").replace(re, "").trim();
}

export function pageMetadata(i: PageMetaInput): Metadata {
  const title = stripBrand(i.title);
  const fullTitle = `${title} | ${BRAND}`;
  const image = i.image ?? { url: DEFAULT_SHARE_IMAGE, width: 1200, height: 630, alt: BRAND };
  const meta: Metadata = {
    title,
    description: i.description,
    openGraph: {
      type: i.type ?? "website",
      locale: "en_CA",
      siteName: BRAND,
      title: fullTitle,
      description: i.description,
      url: i.path,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: i.description,
      images: [image.url],
    },
  };
  if (i.path) meta.alternates = { canonical: i.path };
  if (i.noindex) meta.robots = { index: false, follow: true };
  return meta;
}

/** Metadata for pages that must never be indexed (auth, booking, claim, utility). */
export function noindexMetadata(title: string): Metadata {
  return { title: stripBrand(title), robots: { index: false, follow: true } };
}
