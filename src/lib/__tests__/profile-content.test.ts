import { describe, it, expect } from "vitest";
import { sanitizeBio, bioTextLength, isSafeImageUrl, normalizeWebsite, parseLimit } from "@/lib/profile-content";

describe("sanitizeBio", () => {
  it("removes scripts and event handlers", () => {
    const out = sanitizeBio('<p onclick="x()">Hi<script>alert(1)</script><img src=x onerror=alert(1)></p>');
    expect(out).toBe("<p>Hi</p>");
  });
  it("drops style and class (overlay phishing)", () => {
    expect(sanitizeBio('<p style="position:fixed;inset:0" class="x">Hi</p>')).toBe("<p>Hi</p>");
  });
  it("keeps safe links and forces rel/target", () => {
    const out = sanitizeBio('<a href="https://example.com">site</a>');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('href="https://example.com"');
  });
  it("strips javascript: links", () => {
    expect(sanitizeBio('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript");
  });
  it("handles empty input", () => expect(sanitizeBio(null)).toBe(""));
});

describe("bioTextLength", () => {
  it("counts visible text only", () => expect(bioTextLength("<p>Hello <b>world</b></p>")).toBe(11));
});

describe("isSafeImageUrl", () => {
  it.each([
    ["/api/content-image/cmnkywo490000p60j0oj5xvg2", true],
    ["/uploads/consultants/c_1_2_ab.png", true],
    ["https://cdn.example.com/a.jpg", true],
    ["", true],
    ["http://example.com/a.jpg", false],
    ["javascript:alert(1)", false],
    ["/uploads/consultants/evil.html", false],
  ])("%s → %s", (url, ok) => expect(isSafeImageUrl(url)).toBe(ok));
});

describe("normalizeWebsite", () => {
  it("adds https", () => expect(normalizeWebsite("example.com")).toBe("https://example.com/"));
  it("rejects javascript", () => expect(normalizeWebsite("javascript:alert(1)")).toBeNull());
  it("rejects hostnames without a dot", () => expect(normalizeWebsite("localhost")).toBeNull());
  it("allows empty (clear)", () => expect(normalizeWebsite("  ")).toBe(""));
});

describe("parseLimit", () => {
  it("unlimited", () => expect(parseLimit("unlimited", 3)).toBe(Infinity));
  it("number", () => expect(parseLimit("5", 3)).toBe(5));
  it("fallback", () => expect(parseLimit(null, 3)).toBe(3));
});
