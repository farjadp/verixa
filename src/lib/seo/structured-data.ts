// ============================================================================
// Site-wide SEO helpers (pure, no I/O; unit tested)
// schema.org JSON-LD builders for Organization, WebSite, BreadcrumbList and
// consultant profiles, plus the CICC register status rules used for indexing.
// ============================================================================

import { BRAND, getSiteUrl } from "@/lib/content-pipeline/seo";

export const ORG_DESCRIPTION =
  "Verixa is a Canadian marketplace for licensed immigration consultants (RCICs). Every profile is built from the public register of the College of Immigration and Citizenship Consultants (CICC).";

/** Path of the logo used in JSON-LD and as the default share image. Case matters: the folder is /Brand. */
export const LOGO_PATH = "/Brand/Vertixa3.png";

function origin(siteUrl?: string): string {
  return (siteUrl || getSiteUrl()).replace(/\/+$/, "");
}

/**
 * CICC register "entitled to practise" flag. The synced register stores
 * "Yes" / "No" (and a legacy "Active"). Anything else counts as not entitled.
 */
export function isEntitledToPractise(status: string | null | undefined): boolean {
  const s = (status || "").trim().toLowerCase();
  return s === "yes" || s === "active";
}

/** Register status values that should be in the sitemap and indexed. */
export const ENTITLED_STATUSES = ["Yes", "Active"] as const;

export function buildOrganizationJsonLd(siteUrl?: string): Record<string, unknown> {
  const site = origin(siteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site}/#organization`,
    name: BRAND,
    url: site,
    logo: { "@type": "ImageObject", url: `${site}${LOGO_PATH}` },
    description: ORG_DESCRIPTION,
    areaServed: { "@type": "Country", name: "Canada" },
    knowsAbout: [
      "Canadian immigration",
      "Regulated Canadian Immigration Consultants (RCIC)",
      "Express Entry",
      "Study permits",
      "Work permits",
      "Family sponsorship",
      "Provincial Nominee Programs",
    ],
  };
}

export function buildWebSiteJsonLd(siteUrl?: string): Record<string, unknown> {
  const site = origin(siteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site}/#website`,
    name: BRAND,
    url: site,
    inLanguage: "en-CA",
    publisher: { "@id": `${site}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface Crumb {
  name: string;
  path: string; // site-relative, e.g. "/blog"
}

export function buildBreadcrumbJsonLd(crumbs: Crumb[], siteUrl?: string): Record<string, unknown> | null {
  const items = crumbs.filter((c) => c.name && c.path);
  if (items.length < 2) return null;
  const site = origin(siteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.path === "/" ? site : `${site}${c.path}`,
    })),
  };
}

export interface ConsultantJsonLdInput {
  licenseNumber: string;
  fullName: string;
  status: string;
  company?: string | null;
  province?: string | null;
  specializations?: string[];
  languages?: string[];
  siteUrl?: string;
}

/**
 * Person JSON-LD for an RCIC profile. Only emitted for consultants the register
 * lists as entitled to practise; returns null otherwise so a page never claims
 * a credential the register does not show. Contact details are left out on
 * purpose (they come from the register and are not ours to republish), and so is
 * aggregateRating: schema.org Person has no such property and Google ignores
 * self-hosted review markup on a business's own listings.
 */
export function buildConsultantJsonLd(i: ConsultantJsonLdInput): Record<string, unknown> | null {
  if (!i.licenseNumber || !i.fullName || !isEntitledToPractise(i.status)) return null;
  const site = origin(i.siteUrl);
  const url = `${site}/consultant/${encodeURIComponent(i.licenseNumber)}`;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#person`,
    name: i.fullName,
    url,
    jobTitle: "Regulated Canadian Immigration Consultant (RCIC)",
    identifier: { "@type": "PropertyValue", propertyID: "CICC licence number", value: i.licenseNumber },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "license",
      name: "Regulated Canadian Immigration Consultant licence",
      identifier: i.licenseNumber,
      recognizedBy: {
        "@type": "Organization",
        name: "College of Immigration and Citizenship Consultants",
        url: "https://college-ic.ca",
      },
    },
    knowsAbout: i.specializations?.length ? i.specializations : ["Canadian immigration"],
    areaServed: i.province ? { "@type": "AdministrativeArea", name: i.province } : { "@type": "Country", name: "Canada" },
    mainEntityOfPage: url,
  };
  if (i.company) ld.worksFor = { "@type": "Organization", name: i.company };
  if (i.languages?.length) ld.knowsLanguage = i.languages;
  return ld;
}
