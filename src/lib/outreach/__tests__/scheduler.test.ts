import { describe, expect, it } from "vitest";
import { planTasks, type SchedulableLead } from "../scheduler";

const TOR = "America/Toronto";
const now = new Date("2026-11-05T15:00:00Z"); // Thu 10:00 Toronto
const past = new Date("2026-11-04T15:00:00Z");

function lead(id: string, over: Partial<SchedulableLead> = {}): SchedulableLead {
  return { id, score: 13, state: "BACKLOG", channel: "EMAIL", touchCount: 0, nextActionAt: null, backlogSince: past, recontactUsed: false, timezone: TOR, ...over };
}

describe("planTasks", () => {
  it("caps sends at 5 minus already sent, follow-ups first, then best score", () => {
    const leads = [
      lead("b1", { score: 18 }), lead("b2", { score: 31 }), lead("b3", { score: 13 }),
      lead("f1", { state: "TOUCH_1", touchCount: 1, nextActionAt: past }),
    ];
    const tasks = planTasks({ channel: "EMAIL", leads, now, sentToday: 2, offerAvailable: true });
    expect(tasks).toEqual([
      { kind: "TOUCH", leadId: "f1", step: 2 },
      { kind: "TOUCH", leadId: "b2", step: 1 },
      { kind: "TOUCH", leadId: "b1", step: 1 },
    ]);
  });

  it("uses INVITE for LinkedIn backlog", () => {
    const tasks = planTasks({ channel: "LINKEDIN", leads: [lead("l1", { channel: "LINKEDIN" })], now, sentToday: 0, offerAvailable: true });
    expect(tasks).toEqual([{ kind: "INVITE", leadId: "l1", step: 1 }]);
  });

  it("skips leads outside their send window, unless activeDayOnly", () => {
    const van = lead("v1", { timezone: "America/Vancouver" }); // 07:00 in Vancouver
    expect(planTasks({ channel: "EMAIL", leads: [van], now, sentToday: 0, offerAvailable: true })).toEqual([]);
    expect(planTasks({ channel: "EMAIL", leads: [van], now, sentToday: 0, offerAvailable: true, activeDayOnly: true })).toHaveLength(1);
  });

  it("sends nothing on rest days but still does maintenance", () => {
    const fri = new Date("2026-11-06T15:00:00Z");
    const old = lead("old", { backlogSince: new Date("2026-10-01T15:00:00Z") });
    expect(planTasks({ channel: "EMAIL", leads: [old, lead("x")], now: fri, sentToday: 0, offerAvailable: true })).toEqual([{ kind: "ARCHIVE", leadId: "old" }]);
  });

  it("closes after touch 3, and after touch 2 when no offer exists", () => {
    const t3 = lead("t3", { state: "TOUCH_3", touchCount: 3, nextActionAt: past });
    const t2 = lead("t2", { state: "TOUCH_2", touchCount: 2, nextActionAt: past });
    const tasks = planTasks({ channel: "EMAIL", leads: [t3, t2], now, sentToday: 0, offerAvailable: false });
    expect(tasks).toEqual([{ kind: "CLOSE", leadId: "t3" }, { kind: "CLOSE", leadId: "t2" }]);
  });

  it("expires invites and ends cooldowns", () => {
    const inv = lead("i", { channel: "LINKEDIN", state: "INVITED", touchCount: 1, nextActionAt: past });
    const cool = lead("c", { channel: "LINKEDIN", state: "CLOSED_NO_REPLY", touchCount: 3, nextActionAt: past });
    expect(planTasks({ channel: "LINKEDIN", leads: [inv, cool], now, sentToday: 5, offerAvailable: true }))
      .toEqual([{ kind: "EXPIRE_INVITE", leadId: "i" }, { kind: "RECONTACT", leadId: "c" }]);
  });
});
