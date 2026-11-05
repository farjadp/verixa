import { describe, it, expect } from "vitest";
import {
  isEntitledToPractise,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  buildBreadcrumbJsonLd,
  buildConsultantJsonLd,
} from "@/lib/seo/structured-data";

const site = "https://example.test";

type Ld = {
  "@type": string;
  url: string;
  areaServed: { "@type": string; name: string };
  hasCredential: { identifier: string; recognizedBy: { name: string } };
  worksFor: { name: string };
  knowsLanguage: string[];
};

describe("isEntitledToPractise", () => {
  it("accepts the register's Yes and legacy Active, case-insensitively", () => {
    expect(isEntitledToPractise("Yes")).toBe(true);
    expect(isEntitledToPractise(" active ")).toBe(true);
  });
  it("rejects No, empty and unknown values", () => {
    expect(isEntitledToPractise("No")).toBe(false);
    expect(isEntitledToPractise("")).toBe(false);
    expect(isEntitledToPractise(null)).toBe(false);
    expect(isEntitledToPractise("VERIFIED")).toBe(false);
  });
});

describe("Organization / WebSite", () => {
  it("links WebSite.publisher to the Organization @id and uses the case-correct logo path", () => {
    const org = buildOrganizationJsonLd(site);
    const web = buildWebSiteJsonLd(site);
    expect(org["@id"]).toBe(`${site}/#organization`);
    expect((org.logo as { url: string }).url).toBe(`${site}/Brand/Vertixa3.png`);
    expect(web.publisher).toEqual({ "@id": `${site}/#organization` });
  });
  it("SearchAction points at /search?q=", () => {
    const web = buildWebSiteJsonLd(site) as { potentialAction: { target: { urlTemplate: string } } };
    expect(web.potentialAction.target.urlTemplate).toBe(`${site}/search?q={search_term_string}`);
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("numbers items from 1 and maps / to the origin", () => {
    const ld = buildBreadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }], site) as {
      itemListElement: { position: number; item: string }[];
    };
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(ld.itemListElement[0].item).toBe(site);
    expect(ld.itemListElement[1].item).toBe(`${site}/blog`);
  });
  it("returns null for fewer than two crumbs", () => {
    expect(buildBreadcrumbJsonLd([{ name: "Home", path: "/" }], site)).toBeNull();
  });
});

describe("buildConsultantJsonLd", () => {
  const base = { licenseNumber: "R123456", fullName: "Jane Doe", status: "Yes", siteUrl: site };
  it("builds a Person with the CICC licence credential", () => {
    const ld = buildConsultantJsonLd(base) as Ld;
    expect(ld["@type"]).toBe("Person");
    expect(ld.url).toBe(`${site}/consultant/R123456`);
    expect(ld.hasCredential.identifier).toBe("R123456");
    expect(ld.hasCredential.recognizedBy.name).toMatch(/College of Immigration and Citizenship Consultants/);
    expect(ld.areaServed).toEqual({ "@type": "Country", name: "Canada" });
    expect(ld).not.toHaveProperty("email");
    expect(ld).not.toHaveProperty("aggregateRating");
  });
  it("returns null for consultants not entitled to practise", () => {
    expect(buildConsultantJsonLd({ ...base, status: "No" })).toBeNull();
  });
  it("adds employer, province and languages when known", () => {
    const ld = buildConsultantJsonLd({ ...base, company: "Acme Immigration", province: "Ontario", languages: ["English", "Farsi"] }) as Ld;
    expect(ld.worksFor.name).toBe("Acme Immigration");
    expect(ld.areaServed.name).toBe("Ontario");
    expect(ld.knowsLanguage).toEqual(["English", "Farsi"]);
  });
});
