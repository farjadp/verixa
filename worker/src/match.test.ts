import { describe, expect, it } from "vitest";
import { deriveSignals, pickMatch, scoreMatch } from "./match";

const candidate = { consultantProfileId: "c1", fullName: "José Álvarez", company: "Alvarez Immigration Services Inc.", city: "Toronto", province: "ON", licenseNumber: "R123456", timezone: "America/Toronto" };

describe("scoreMatch", () => {
  it("accepts exact name plus RCIC keyword (diacritics-insensitive)", () => {
    const s = scoreMatch(candidate, { handle: "jose", name: "Jose Alvarez", headline: "RCIC | Immigration Consultant", bio: "" });
    expect(s).toBeGreaterThanOrEqual(0.8);
  });

  it("ignores middle names and credentials in the display name", () => {
    const s = scoreMatch(candidate, { handle: "j", name: "Jose M. Alvarez, RCIC", headline: "Regulated Canadian Immigration Consultant" });
    expect(s).toBeGreaterThanOrEqual(0.8);
  });

  it("rejects a same-name person who is not an immigration consultant", () => {
    const s = scoreMatch(candidate, { handle: "j", name: "Jose Alvarez", headline: "Dentist at Smile Co", location: "Toronto" });
    expect(s).toBeLessThan(0.8);
  });

  it("rejects an RCIC with only a matching first name", () => {
    const s = scoreMatch(candidate, { handle: "j", name: "Jose Martinez", headline: "RCIC" });
    expect(s).toBeLessThan(0.8);
  });

  it("company and city overlap raise confidence", () => {
    const base = scoreMatch(candidate, { handle: "j", name: "Jose Alvarez", headline: "Immigration consultant" });
    const more = scoreMatch(candidate, { handle: "j", name: "Jose Alvarez", headline: "Immigration consultant at Alvarez Immigration Services", location: "Toronto, Ontario" });
    expect(more).toBeGreaterThan(base);
  });

  it("is always within 0..1", () => {
    const s = scoreMatch(candidate, { handle: "j", name: "Jose Alvarez", headline: "RCIC immigration consultant Alvarez Immigration Services", location: "Toronto" });
    expect(s).toBeLessThanOrEqual(1);
    expect(scoreMatch(candidate, { handle: "j", name: "" })).toBe(0);
  });
});

describe("pickMatch", () => {
  const good = (handle: string) => ({ handle, name: "Jose Alvarez", headline: "RCIC" });
  it("returns the single accepted profile", () => {
    const r = pickMatch(candidate, [good("a"), { handle: "b", name: "Someone Else", headline: "RCIC" }]);
    expect(r?.profile.handle).toBe("a");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.8);
  });
  it("returns null when nothing reaches 0.8", () => {
    expect(pickMatch(candidate, [{ handle: "b", name: "Someone Else", headline: "RCIC" }])).toBeNull();
    expect(pickMatch(candidate, [])).toBeNull();
  });
  it("rejects ambiguity: two profiles at or above 0.8", () => {
    expect(pickMatch(candidate, [good("a"), good("b")])).toBeNull();
  });
});

describe("deriveSignals", () => {
  it("is all false when nothing is known", () => {
    expect(deriveSignals("")).toEqual({ postedAboutMarketing: false, soloOrSmallFirm: false, activeLast21Days: false, socialProfileComplete: false, hadProfileViews30d: false });
  });
  it("detects marketing and solo keywords", () => {
    const s = deriveSignals("Founder and sole practitioner. I write about marketing my immigration practice.");
    expect(s.postedAboutMarketing).toBe(true);
    expect(s.soloOrSmallFirm).toBe(true);
  });
  it("does not call a large firm solo", () => {
    expect(deriveSignals("Founder. 250 employees across 12 offices.").soloOrSmallFirm).toBe(false);
  });
  it("activity and completeness only when evidence is supplied", () => {
    expect(deriveSignals("x".repeat(300), { lastActivityDaysAgo: 5, hasPhoto: true })).toMatchObject({ activeLast21Days: true, socialProfileComplete: true });
    expect(deriveSignals("x".repeat(300), { lastActivityDaysAgo: 40, hasPhoto: true }).activeLast21Days).toBe(false);
    expect(deriveSignals("x".repeat(300)).socialProfileComplete).toBe(false);
  });
  it("never claims profile views (server-side data)", () => {
    expect(deriveSignals("anything").hadProfileViews30d).toBe(false);
  });
});
