import { describe, expect, it } from "vitest";
import { armResults, cohorts, dayKey, funnel, rate, sentTime, series, weekKey } from "../metrics";
import { NOW, at, emptyInput, touch } from "./fixtures/stats";

describe("metrics", () => {
  it("uses Toronto days and ISO weeks", () => {
    expect(dayKey(at("2026-11-17T03:00:00Z"))).toBe("2026-11-16"); // 22:00 Mon in Toronto
    expect(weekKey(at("2026-11-16T15:00:00Z"))).toBe("2026-W47");
    expect(weekKey(at("2026-11-23T04:59:00Z"))).toBe("2026-W47"); // still Sunday in Toronto
    expect(weekKey(at("2027-01-01T15:00:00Z"))).toBe("2026-W53");
  });

  it("hides the rate below 30 and keeps the Wilson interval", () => {
    expect(rate(2, 10).value).toBeNull();
    expect(rate(3, 30).value).toBeCloseTo(0.1);
    const r = rate(3, 30);
    expect(r.low).toBeGreaterThan(0.03);
    expect(r.high).toBeLessThan(0.27);
    expect(rate(0, 0)).toMatchObject({ k: 0, n: 0, value: null });
  });

  it("counts SENT and past SCHEDULED touches as sent, never dry runs, failures or future sends", () => {
    expect(sentTime(touch("a", "L", 1, "2026-11-24T14:00:00Z"), NOW)).not.toBeNull();
    expect(sentTime(touch("b", "L", 1, "2026-11-24T14:00:00Z", { status: "SCHEDULED", sentAt: null }), NOW)).not.toBeNull();
    expect(sentTime(touch("c", "L", 1, "2026-11-27T14:00:00Z", { status: "SCHEDULED", sentAt: null }), NOW)).toBeNull();
    for (const status of ["DRY_RUN", "FAILED", "CANCELLED", "QUEUED", "UNCERTAIN"]) {
      expect(sentTime(touch("d", "L", 1, "2026-11-24T14:00:00Z", { status }), NOW)).toBeNull();
    }
  });

  it("builds a daily series with delivery, bounces, complaints and per-person replies", () => {
    const input = emptyInput();
    input.touches = [
      touch("t1", "A", 1, "2026-11-24T14:00:00Z"),
      touch("t2", "B", 1, "2026-11-24T14:10:00Z", { deliveredAt: null, bouncedAt: at("2026-11-24T14:11:00Z"), bounceType: "hard" }),
      touch("t3", "C", 1, "2026-11-24T14:20:00Z", { complainedAt: at("2026-11-24T18:00:00Z") }),
      touch("t4", "D", 1, "2026-11-24T14:30:00Z", { status: "DRY_RUN" }),
    ];
    input.replies = [
      { leadId: "A", label: "positive", receivedAt: at("2026-11-25T15:00:00Z") },
      { leadId: "A", label: "question", receivedAt: at("2026-11-25T16:00:00Z") },
      { leadId: "A", label: "positive", receivedAt: at("2026-11-25T17:00:00Z") },
      { leadId: "Z", label: "positive", receivedAt: at("2026-11-25T17:00:00Z") }, // never contacted: ignored
    ];
    const days = series(input, NOW, "day", 3);
    expect(days.map((d) => d.key)).toEqual(["2026-11-24", "2026-11-25", "2026-11-26"]);
    expect(days[0]).toMatchObject({ sent: 3, people: 3, delivered: 2, hardBounces: 1, complaints: 1 });
    expect(days[1]).toMatchObject({ humanReplies: 1, replies: { positive: 1, question: 1, negative: 0, auto_reply: 0 } });
  });

  it("counts opt-outs once per person across negative replies and unsubscribes", () => {
    const input = emptyInput();
    input.touches = [touch("t1", "A", 1, "2026-11-24T14:00:00Z")];
    input.replies = [{ leadId: "A", label: "negative", receivedAt: at("2026-11-24T16:00:00Z") }];
    input.unsubscribes = [{ leadId: "A", at: at("2026-11-24T17:00:00Z") }, { leadId: "A", at: at("2026-11-20T17:00:00Z") }];
    const [day] = series(input, NOW, "day", 3);
    expect(day).toMatchObject({ optOuts: 1, unsubscribes: 1 });
    expect(funnel(input, NOW).optOut).toBe(1);
  });

  it("builds the funnel and only credits claims and clicks after first contact", () => {
    const input = emptyInput();
    input.leads = [
      { id: "A", createdAt: at("2026-11-10T00:00:00Z"), state: "CLAIMED", claimedAt: at("2026-11-20T00:00:00Z") },
      { id: "B", createdAt: at("2026-11-10T00:00:00Z"), state: "CLAIMED", claimedAt: at("2026-11-11T00:00:00Z") }, // organic, before contact
      { id: "C", createdAt: at("2026-11-10T00:00:00Z"), state: "BACKLOG", claimedAt: null },
    ];
    input.touches = [
      touch("a1", "A", 1, "2026-11-16T14:00:00Z"), touch("a2", "A", 2, "2026-11-19T14:00:00Z"),
      touch("b1", "B", 1, "2026-11-16T14:00:00Z"),
    ];
    input.clicks = [{ leadId: "A", at: at("2026-11-19T15:00:00Z"), page: "claim" }, { leadId: "B", at: at("2026-11-12T15:00:00Z"), page: "profile" }];
    expect(funnel(input, NOW)).toMatchObject({ leads: 3, touch1: 2, touch2: 1, touch3: 0, clicked: 1, claimed: 1 });
  });

  it("groups cohorts by the week of first contact", () => {
    const input = emptyInput();
    input.touches = [
      touch("a1", "A", 1, "2026-11-16T14:00:00Z"), touch("a2", "A", 2, "2026-11-24T14:00:00Z"),
      touch("b1", "B", 1, "2026-11-23T14:00:00Z"),
    ];
    input.replies = [{ leadId: "B", label: "question", receivedAt: at("2026-11-24T14:00:00Z") }];
    const c = cohorts(input, NOW);
    expect(c.map((x) => x.week)).toEqual(["2026-W48", "2026-W47"]);
    expect(c[1]).toMatchObject({ size: 1, touch2: 1, humanReply: 0, ageDays: 10 });
    expect(c[0]).toMatchObject({ size: 1, humanReply: 1 });
  });

  it("scores A/B arms on human replies to touch 1 before touch 2", () => {
    const input = emptyInput();
    const v = (arm: string) => ({ variant: `exp:${arm}` });
    input.touches = [
      touch("a1", "A", 1, "2026-11-16T14:00:00Z", v("A")), touch("a2", "A", 2, "2026-11-19T14:00:00Z"),
      touch("b1", "B", 1, "2026-11-16T14:00:00Z", v("B")),
      touch("c1", "C", 1, "2026-11-16T14:00:00Z", v("B")),
      touch("x1", "X", 1, "2026-11-16T14:00:00Z"), // no experiment
    ];
    input.replies = [
      { leadId: "A", label: "positive", receivedAt: at("2026-11-20T14:00:00Z") }, // after touch 2: not credited
      { leadId: "B", label: "question", receivedAt: at("2026-11-17T14:00:00Z") },
      { leadId: "C", label: "auto_reply", receivedAt: at("2026-11-17T14:00:00Z") },
    ];
    expect(armResults(input, NOW, "exp").sort((a, b) => a.armId.localeCompare(b.armId))).toEqual([
      { armId: "A", sent: 1, replies: 0 }, { armId: "B", sent: 2, replies: 1 },
    ]);
  });
});
