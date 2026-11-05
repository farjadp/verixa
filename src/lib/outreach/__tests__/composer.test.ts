import { describe, expect, it } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { ComposeRejectedError, ESCAPE_LINE, INVITE_ESCAPE_LINE, composeMessage, extractNumbers, type ComposeInput } from "../composer";

const fakeLlm = (out: { subject: string | null; body: string }): Llm => ({ json: async () => out as never });

const base: ComposeInput = {
  channel: "EMAIL", step: 1, firstName: "Sara", city: "Toronto",
  profileUrl: "https://getverixa.com/consultant/R123456", claimUrl: "https://getverixa.com/claim/R123456",
  profileViews30d: 21, offer: null,
};

describe("composeMessage", () => {
  it("returns subject + body for email without an escape line (the footer handles it)", async () => {
    const m = await composeMessage(fakeLlm({ subject: "Your Verixa listing", body: "Hi Sara, your listing got 21 views: https://getverixa.com/consultant/R123456" }), base);
    expect(m).toEqual({ subject: "Your Verixa listing", body: "Hi Sara, your listing got 21 views: https://getverixa.com/consultant/R123456" });
  });

  it("rejects invented numbers", async () => {
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: "Your profile got 340 views" }), base)).rejects.toThrow(ComposeRejectedError);
  });

  it("rejects email without a subject", async () => {
    await expect(composeMessage(fakeLlm({ subject: null, body: "Hi Sara" }), base)).rejects.toThrow(ComposeRejectedError);
  });

  it("appends the escape line on social channels", async () => {
    const m = await composeMessage(fakeLlm({ subject: null, body: "Hi Sara, quick note." }), { ...base, channel: "X", step: 2 });
    expect(m.body.endsWith(ESCAPE_LINE)).toBe(true);
    expect(m.subject).toBeNull();
  });

  it("keeps LinkedIn invite notes within 300 chars", async () => {
    const ok = await composeMessage(fakeLlm({ subject: null, body: "Hi Sara, your CICC listing is on Verixa." }), { ...base, channel: "LINKEDIN" });
    expect(ok.body.endsWith(INVITE_ESCAPE_LINE)).toBe(true);
    expect(ok.body.length).toBeLessThanOrEqual(300);
    await expect(composeMessage(fakeLlm({ subject: null, body: "x".repeat(290) }), { ...base, channel: "LINKEDIN" })).rejects.toThrow(ComposeRejectedError);
  });

  it("allows offer numbers on touch 3", async () => {
    const offer = { planName: "Pro", freeMonths: 12, priceAfterCents: 4900, currency: "CAD", remainingSlots: 13, deadline: new Date("2027-01-31T12:00:00Z") };
    const m = await composeMessage(fakeLlm({ subject: "Founding spot", body: "12 months free, then $49/month. 13 spots left until January 31, 2027." }), { ...base, step: 3, offer });
    expect(m.body).toContain("$49");
  });
});

describe("extractNumbers", () => {
  it("ignores digits inside URLs", () => {
    expect(extractNumbers("see https://x.com/a/R123 got 21, $49.00")).toEqual(["21", "49.00"]);
  });
});
