import { describe, it, expect } from "vitest";
import { stripBrand, pageMetadata, noindexMetadata } from "@/lib/seo/metadata";

describe("stripBrand", () => {
  it("removes trailing brand suffixes, including doubled and qualified ones", () => {
    expect(stripBrand("Disclaimer | Verixa")).toBe("Disclaimer");
    expect(stripBrand("Blog | Verixa | Verixa")).toBe("Blog");
    expect(stripBrand("Express Entry | Verixa Insights")).toBe("Express Entry");
    expect(stripBrand("Jane Doe - Verixa")).toBe("Jane Doe");
  });
  it("leaves titles that only mention the brand elsewhere", () => {
    expect(stripBrand("Why Verixa checks the CICC register")).toBe("Why Verixa checks the CICC register");
  });
});

describe("pageMetadata", () => {
  it("sets canonical, og and twitter titles with the brand once", () => {
    const m = pageMetadata({ title: "Pricing | Verixa", description: "d", path: "/pricing" });
    expect(m.title).toBe("Pricing");
    expect(m.alternates?.canonical).toBe("/pricing");
    expect((m.openGraph as { title: string }).title).toBe("Pricing | Verixa");
    expect((m.twitter as { card: string }).card).toBe("summary_large_image");
    expect(m.robots).toBeUndefined();
  });
  it("marks noindex pages but keeps links followable", () => {
    expect(pageMetadata({ title: "x", noindex: true }).robots).toEqual({ index: false, follow: true });
    expect(noindexMetadata("Sign in | Verixa")).toEqual({ title: "Sign in", robots: { index: false, follow: true } });
  });
});
