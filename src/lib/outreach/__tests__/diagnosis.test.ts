import { describe, expect, it } from "vitest";
import { diagnose, previousActiveDay } from "../diagnosis";
import type { StatsRun } from "../metrics";
import { NOW, at, emptyInput, sentDay, touch } from "./fixtures/stats";

const ids = (input: ReturnType<typeof emptyInput>, emailOn = true) => diagnose({ now: NOW, input, emailOn }).map((f) => `${f.id}:${f.severity}:${f.pause}`);
const run = (iso: string, over: Partial<StatsRun> = {}): StatsRun => ({ status: "ok", scheduled: 10, dryRun: 0, failed: 0, followUpsHeld: 0, detail: null, startedAt: at(iso), ...over });

describe("diagnose", () => {
  it("finds nothing on a clean week", () => {
    const input = emptyInput();
    input.touches = [...sentDay("m", "2026-11-23T14:00:00Z", 10), ...sentDay("t", "2026-11-24T14:00:00Z", 10)];
    input.runs = [run("2026-11-24T11:00:00Z"), run("2026-11-25T11:00:00Z")];
    expect(ids(input)).toEqual([]);
  });

  it("pauses on a fresh spam complaint, but only reports an old one", () => {
    const input = emptyInput();
    input.touches = [touch("c", "C", 1, "2026-11-25T14:00:00Z", { complainedAt: at("2026-11-26T09:00:00Z") })];
    expect(ids(input)).toContain("complaint:critical:true");
    input.touches = [touch("c", "C", 1, "2026-11-23T14:00:00Z", { complainedAt: at("2026-11-24T09:00:00Z") })];
    expect(ids(input)).toContain("complaint:critical:false");
  });

  it("warns at 2 hard bounces in the last 30 sends and pauses at 3", () => {
    const input = emptyInput();
    const hard = { deliveredAt: null, bounceType: "hard" };
    input.touches = [
      ...sentDay("ok", "2026-11-24T14:00:00Z", 20),
      touch("h1", "H1", 1, "2026-11-25T14:00:00Z", { ...hard, bouncedAt: at("2026-11-25T14:01:00Z") }),
      touch("h2", "H2", 1, "2026-11-25T14:10:00Z", { ...hard, bouncedAt: at("2026-11-25T14:11:00Z"), email: "x@other.ca" }),
    ];
    expect(ids(input)).toContain("hard_bounce:warn:false");
    input.touches.push(touch("h3", "H3", 1, "2026-11-25T15:00:00Z", { ...hard, bouncedAt: at("2026-11-25T15:01:00Z"), email: "y@third.ca" }));
    expect(ids(input)).toContain("hard_bounce:critical:true");
  });

  it("flags a soft-bounce streak and a domain cluster", () => {
    const input = emptyInput();
    const soft = (i: number) => touch(`s${i}`, `S${i}`, 1, `2026-11-25T14:0${i}:00Z`, { deliveredAt: null, bouncedAt: at(`2026-11-25T14:0${i}:30Z`), bounceType: "soft", bounceReason: "421 rate limited", email: `p${i}@gmail.com` });
    input.touches = [...sentDay("ok", "2026-11-24T14:00:00Z", 5), soft(1), soft(2), soft(3)];
    const found = diagnose({ now: NOW, input, emailOn: true });
    expect(found.find((f) => f.id === "soft_streak")?.severity).toBe("warn");
    const domain = found.find((f) => f.id === "bounce_domain:gmail.com");
    expect(domain?.finding).toContain("421 rate limited");
    input.touches.push(soft(4), soft(5));
    expect(ids(input)).toContain("soft_streak:critical:false");
  });

  it("pauses when sends get no webhook events at all", () => {
    const input = emptyInput();
    input.touches = sentDay("n", "2026-11-26T12:00:00Z", 6, { deliveredAt: null });
    expect(ids(input)).toContain("webhook_silent:critical:true");
    input.touches = [...sentDay("d", "2026-11-25T12:00:00Z", 4), ...sentDay("n", "2026-11-25T13:00:00Z", 8, { deliveredAt: null })];
    expect(ids(input)).toContain("webhook_partial:warn:false");
  });

  it("does not judge sends younger than 2 hours", () => {
    const input = emptyInput();
    input.touches = sentDay("n", "2026-11-26T14:00:00Z", 6, { deliveredAt: null });
    expect(ids(input).some((x) => x.startsWith("webhook"))).toBe(false);
  });

  it("warns when unsubscribes pass 4% of at least 40 contacted people", () => {
    const input = emptyInput();
    input.touches = [...sentDay("a", "2026-11-17T14:00:00Z", 20), ...sentDay("b", "2026-11-18T14:00:00Z", 20)];
    input.unsubscribes = ["aL0", "aL1", "bL2"].map((leadId) => ({ leadId, at: at("2026-11-19T10:00:00Z") }));
    expect(ids(input)).toContain("unsubscribe:warn:false");
    input.unsubscribes = input.unsubscribes.slice(0, 1);
    expect(ids(input)).not.toContain("unsubscribe:warn:false");
  });

  it("reports a reply-rate collapse only with 80+ people in both 4-week windows", () => {
    const input = emptyInput();
    input.touches = [...sentDay("p", "2026-10-07T14:00:00Z", 90), ...sentDay("c", "2026-11-10T14:00:00Z", 90)];
    input.replies = Array.from({ length: 18 }, (_, i) => ({ leadId: `pL${i}`, label: "positive", receivedAt: at("2026-10-09T10:00:00Z") }));
    expect(ids(input)).toContain("reply_collapse:info:false");
    input.touches = input.touches.slice(0, 120);
    expect(ids(input)).not.toContain("reply_collapse:info:false");
  });

  it("knows the previous active day", () => {
    expect(previousActiveDay(at("2026-11-26T10:00:00Z"))).toBe("2026-11-25"); // Thu → Wed
    expect(previousActiveDay(at("2026-11-30T10:00:00Z"))).toBe("2026-11-26"); // Mon → Thu
  });

  it("flags a missed cron day, a failed run, held follow-ups and compose failures", () => {
    const input = emptyInput();
    input.runs = [run("2026-11-23T11:00:00Z"), run("2026-11-24T11:00:00Z")]; // nothing on Wed 25
    expect(ids(input)).toContain("cron_missed:critical:false");
    expect(ids(input, false)).not.toContain("cron_missed:critical:false");
    input.runs.push(run("2026-11-25T11:00:00Z", { status: "error", detail: "UNSUBSCRIBE_SECRET is not set" }));
    expect(ids(input)).toEqual(["cron_error:critical:false"]);
    input.runs.push(run("2026-11-26T11:00:00Z", { scheduled: 2, failed: 4, followUpsHeld: 3 }));
    expect(ids(input)).toEqual(expect.arrayContaining(["followups_held:warn:false", "compose_failures:warn:false"]));
  });

  it("does not call the cron missed before any run history exists", () => {
    const input = emptyInput();
    input.runs = [run("2026-11-26T11:00:00Z")];
    expect(ids(input)).toEqual([]);
  });
});
