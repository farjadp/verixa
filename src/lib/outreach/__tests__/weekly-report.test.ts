import { describe, expect, it } from "vitest";
import { parseOutreachPath } from "../stats-repo";
import { buildWeeklyReport, fmtRate, isReportDay } from "../weekly-report";
import { rate } from "../metrics";
import { at, emptyInput, sentDay } from "./fixtures/stats";

const MON = at("2026-11-30T10:00:00Z");

describe("weekly report", () => {
  it("is sent on Mondays (Toronto)", () => {
    expect(isReportDay(MON)).toBe(true);
    expect(isReportDay(at("2026-12-01T10:00:00Z"))).toBe(false);
  });

  it("formats small samples as counts", () => {
    expect(fmtRate(rate(1, 9))).toBe("1/9");
    expect(fmtRate(rate(3, 30))).toBe("10.0% (3/30)");
    expect(fmtRate(rate(0, 0))).toBe("–");
  });

  it("summarises last week against the week before, with findings and experiments", () => {
    const input = emptyInput();
    input.touches = [...sentDay("a", "2026-11-17T14:00:00Z", 8), ...sentDay("b", "2026-11-24T14:00:00Z", 10)];
    input.replies = [{ leadId: "bL1", label: "positive", receivedAt: at("2026-11-25T14:00:00Z") }];
    const r = buildWeeklyReport({ now: MON, input, findings: [{ id: "complaint", severity: "critical", title: "1 spam complaint", finding: "F.", fix: "X.", pause: true }] });
    expect(r.week).toBe("2026-W48");
    expect(r.subject).toBe("Weekly summary 2026-W48: 10 sent, 1 replies, 0 claims — action needed");
    expect(r.lines).toContain("Emails sent: 10 (last week 8, +2)");
    expect(r.lines.some((l) => l.startsWith("[CRITICAL] 1 spam complaint"))).toBe(true);
    expect(r.lines.some((l) => l.includes("Waiting for Farjad's approval"))).toBe(true);
  });
});

describe("parseOutreachPath", () => {
  it("reads profile and claim visits from page_view metadata", () => {
    expect(parseOutreachPath(JSON.stringify({ url: "/consultant/R123456?utm_source=outreach" }))).toEqual({ page: "profile", license: "R123456" });
    expect(parseOutreachPath(JSON.stringify({ url: "/claim/R%20123?utm_source=outreach" }))).toEqual({ page: "claim", license: "R 123" });
    expect(parseOutreachPath(JSON.stringify({ url: "/search?utm_source=outreach" }))).toBeNull();
    expect(parseOutreachPath("not json")).toBeNull();
    expect(parseOutreachPath(null)).toBeNull();
  });
});
