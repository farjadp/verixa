import { describe, expect, it } from "vitest";
import { isCiccActive, scoreLead } from "../scoring";

const none = { ciccActive: false, postedAboutMarketing: false, soloOrSmallFirm: false, activeLast21Days: false, hadProfileViews30d: false, socialProfileComplete: false };

describe("scoreLead", () => {
  it("sums Fibonacci weights", () => {
    expect(scoreLead({ ...none, ciccActive: true })).toBe(13);
    expect(scoreLead({ ciccActive: true, postedAboutMarketing: true, soloOrSmallFirm: true, activeLast21Days: true, hadProfileViews30d: true, socialProfileComplete: true })).toBe(32);
  });
  it("returns 0 for inactive licences regardless of other signals", () => {
    expect(scoreLead({ ...none, postedAboutMarketing: true, soloOrSmallFirm: true })).toBe(0);
  });
});

describe("isCiccActive", () => {
  it("accepts registry spellings of active", () => {
    expect(isCiccActive("Yes")).toBe(true);
    expect(isCiccActive("active")).toBe(true);
    expect(isCiccActive("No")).toBe(false);
    expect(isCiccActive(null)).toBe(false);
  });
});
