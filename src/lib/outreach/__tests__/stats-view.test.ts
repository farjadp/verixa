import { describe, expect, it } from "vitest";
import { buildOutreachStats } from "../stats-view";
import { NOW, at, emptyInput, sentDay, touch } from "./fixtures/stats";

describe("buildOutreachStats", () => {
  it("returns plain JSON for the admin page, with recent bounces and runs newest first", () => {
    const input = emptyInput();
    input.touches = [
      ...sentDay("a", "2026-11-24T14:00:00Z", 5),
      touch("b", "B", 1, "2026-11-25T14:00:00Z", { deliveredAt: null, bouncedAt: at("2026-11-25T14:01:00Z"), bounceType: "hard", bounceReason: "550", email: "x@rogers.com" }),
      touch("u", "U", 1, "2026-11-25T14:00:00Z", { status: "UNCERTAIN" }),
    ];
    input.runs = [
      { status: "ok", scheduled: 5, dryRun: 0, failed: 0, followUpsHeld: 0, detail: null, startedAt: at("2026-11-24T11:00:00Z") },
      { status: "ok", scheduled: 2, dryRun: 0, failed: 0, followUpsHeld: 0, detail: null, startedAt: at("2026-11-25T11:00:00Z") },
    ];
    const s = buildOutreachStats(input, NOW, true);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(s.days).toHaveLength(14);
    expect(s.weeks).toHaveLength(8);
    expect(s.bounces).toEqual([{ at: "2026-11-25T14:01:00.000Z", type: "hard", domain: "rogers.com", reason: "550", step: 1 }]);
    expect(s.runs[0].startedAt).toBe("2026-11-25T11:00:00.000Z");
    expect(s.uncertain).toBe(1);
    expect(s.experiments[0].status).toBe("waiting_approval");
  });
});
