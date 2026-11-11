import { describe, expect, it } from "vitest";
import { InvalidTransitionError, newBacklogLead, transition } from "../state";
import { localParts } from "../calendar";

const TOR = "America/Toronto";
const thu = new Date("2026-11-05T15:00:00Z");
const ymd = (d: Date | null) => (d ? localParts(d, TOR).ymd : null);

describe("transition", () => {
  it("runs an email lead through 3 touches to closed, then cooldown", () => {
    let l = newBacklogLead("EMAIL", TOR, thu);
    l = transition(l, { type: "TOUCH_SENT", step: 1 }, thu);
    expect([l.state, l.touchCount, ymd(l.nextActionAt)]).toEqual(["TOUCH_1", 1, "2026-11-11"]);
    l = transition(l, { type: "TOUCH_SENT", step: 2 }, new Date("2026-11-11T15:00:00Z"));
    expect([l.state, ymd(l.nextActionAt)]).toEqual(["TOUCH_2", "2026-11-19"]); // Wed + 5 active days (Thu, Mon, Tue, Wed, Thu)
    l = transition(l, { type: "TOUCH_SENT", step: 3 }, new Date("2026-11-19T15:00:00Z"));
    l = transition(l, { type: "NO_REPLY_TIMEOUT" }, new Date("2026-11-25T15:00:00Z"));
    expect(l.state).toBe("CLOSED_NO_REPLY");
    expect(l.nextActionAt?.toISOString()).toBe("2027-02-22T15:00:00.000Z"); // +89 days
    l = transition(l, { type: "COOLDOWN_ENDED" }, new Date("2027-02-22T15:00:00Z"));
    expect([l.state, l.touchCount, l.recontactUsed]).toEqual(["BACKLOG", 0, true]);
    // second cooldown archives
    l = { ...l, state: "CLOSED_NO_REPLY" };
    expect(transition(l, { type: "COOLDOWN_ENDED" }, thu).state).toBe("ARCHIVED");
  });

  it("a touch sent Thu 10:00 with a 3-active-day wait is due Wed 00:00 local and visible to a Wed 06:00 run", () => {
    const l = transition(newBacklogLead("EMAIL", TOR, thu), { type: "TOUCH_SENT", step: 1 }, thu);
    expect(l.nextActionAt?.toISOString()).toBe("2026-11-11T05:00:00.000Z");
    const wed6am = new Date("2026-11-11T11:00:00Z");
    expect(l.nextActionAt! <= wed6am).toBe(true);
  });

  it("rejects out-of-order steps", () => {
    const l = newBacklogLead("EMAIL", TOR, thu);
    expect(() => transition(l, { type: "TOUCH_SENT", step: 2 }, thu)).toThrow(InvalidTransitionError);
  });

  it("treats the LinkedIn invite as touch 1", () => {
    let l = newBacklogLead("LINKEDIN", TOR, thu);
    l = transition(l, { type: "INVITE_SENT" }, thu);
    expect([l.state, l.touchCount]).toEqual(["INVITED", 1]);
    expect(l.nextActionAt?.toISOString()).toBe("2026-11-26T15:00:00.000Z"); // +21 days
    const accepted = transition(l, { type: "INVITE_ACCEPTED" }, thu);
    expect([accepted.state, ymd(accepted.nextActionAt)]).toEqual(["TOUCH_1", "2026-11-09"]);
    const expired = transition(l, { type: "INVITE_EXPIRED" }, thu);
    expect([expired.state, expired.channel, expired.touchCount]).toEqual(["TOUCH_1", "EMAIL", 1]);
    expect(expired.nextActionAt).toEqual(thu);
  });

  it("routes replies by label", () => {
    const sent = transition(newBacklogLead("EMAIL", TOR, thu), { type: "TOUCH_SENT", step: 1 }, thu);
    expect(transition(sent, { type: "REPLY", label: "negative" }, thu).state).toBe("OPTED_OUT");
    expect(transition(sent, { type: "REPLY", label: "positive" }, thu).state).toBe("CONVERSATION");
    expect(transition(sent, { type: "REPLY", label: "question" }, thu).state).toBe("CONVERSATION");
    const auto = transition(sent, { type: "REPLY", label: "auto_reply" }, thu);
    expect([auto.state, ymd(auto.nextActionAt)]).toEqual(["TOUCH_1", "2026-11-17"]); // due Wed 11-11 + 3 active days (Thu, Mon, Tue)
  });

  it("reverts a cancelled touch", () => {
    const sent = transition(newBacklogLead("EMAIL", TOR, thu), { type: "TOUCH_SENT", step: 1 }, thu);
    const back = transition(sent, { type: "TOUCH_CANCELLED", step: 1 }, thu);
    expect([back.state, back.touchCount, back.nextActionAt]).toEqual(["BACKLOG", 0, thu]);
  });

  it("claims and suppression win from any live state and are idempotent", () => {
    const sent = transition(newBacklogLead("X", TOR, thu), { type: "TOUCH_SENT", step: 1 }, thu);
    const claimed = transition(sent, { type: "CLAIMED" }, thu);
    expect(claimed.state).toBe("CLAIMED");
    expect(transition(claimed, { type: "SUPPRESSED" }, thu).state).toBe("CLAIMED");
    expect(transition(sent, { type: "SUPPRESSED" }, thu).state).toBe("OPTED_OUT");
  });

  it("reassigns only from backlog", () => {
    const l = newBacklogLead("X", TOR, thu);
    expect(transition(l, { type: "REASSIGN", channel: "EMAIL" }, thu).channel).toBe("EMAIL");
    const sent = transition(l, { type: "TOUCH_SENT", step: 1 }, thu);
    expect(() => transition(sent, { type: "REASSIGN", channel: "EMAIL" }, thu)).toThrow(InvalidTransitionError);
  });

  it("rejects out-of-range steps from untyped input", () => {
    let l = newBacklogLead("EMAIL", TOR, thu);
    l = transition(l, { type: "TOUCH_SENT", step: 1 }, thu);
    l = transition(l, { type: "TOUCH_SENT", step: 2 }, thu);
    l = transition(l, { type: "TOUCH_SENT", step: 3 }, thu);
    expect(() => transition(l, { type: "TOUCH_SENT", step: 4 as never }, thu)).toThrow(InvalidTransitionError);
    expect(() => transition(l, { type: "TOUCH_CANCELLED", step: 4 as never }, thu)).toThrow(InvalidTransitionError);
    expect(() => transition(newBacklogLead("EMAIL", TOR, thu), { type: "TOUCH_SENT", step: 0 as never }, thu)).toThrow(InvalidTransitionError);
    expect(() => transition(l, { type: "TOUCH_CANCELLED", step: 0 as never }, thu)).toThrow(InvalidTransitionError);
  });

  it("does not extend invite expiry or cooldown on auto-replies", () => {
    const inv = transition(newBacklogLead("LINKEDIN", TOR, thu), { type: "INVITE_SENT" }, thu);
    expect(transition(inv, { type: "REPLY", label: "auto_reply" }, thu).nextActionAt).toEqual(inv.nextActionAt);
    const closed = { ...inv, state: "CLOSED_NO_REPLY" as const };
    expect(transition(closed, { type: "REPLY", label: "auto_reply" }, thu)).toEqual(closed);
  });

  it("refuses a first touch on LinkedIn (invite only)", () => {
    expect(() => transition(newBacklogLead("LINKEDIN", TOR, thu), { type: "TOUCH_SENT", step: 1 }, thu)).toThrow(InvalidTransitionError);
  });
});
