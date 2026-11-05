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

  it("allows '30' (as in 'last 30 days') on step 2 only, and only with a views fact", async () => {
    const url = "https://getverixa.com/consultant/R123456";
    const body = `Hi Sara, ${"21"} views in the last 30 days: ${url}`;
    await expect(composeMessage(fakeLlm({ subject: "Hi", body }), { ...base, step: 2 })).resolves.toBeTruthy();
    await expect(composeMessage(fakeLlm({ subject: "Hi", body }), base)).rejects.toThrow(ComposeRejectedError);
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `Hi Sara, activity in the last 30 days: ${url}` }), { ...base, step: 2, profileViews30d: null })).rejects.toThrow(ComposeRejectedError);
  });

  it("rejects email without a subject", async () => {
    await expect(composeMessage(fakeLlm({ subject: null, body: "Hi Sara" }), base)).rejects.toThrow(ComposeRejectedError);
  });

  it("appends the escape line on social channels", async () => {
    const m = await composeMessage(fakeLlm({ subject: null, body: "Hi Sara, quick note: https://getverixa.com/consultant/R123456" }), { ...base, channel: "X", step: 2 });
    expect(m.body.endsWith(ESCAPE_LINE)).toBe(true);
    expect(m.subject).toBeNull();
  });

  it("keeps LinkedIn invite notes within 300 chars", async () => {
    const ok = await composeMessage(fakeLlm({ subject: null, body: "Hi Sara, your CICC listing: https://getverixa.com/consultant/R123456" }), { ...base, channel: "LINKEDIN" });
    expect(ok.body.endsWith(INVITE_ESCAPE_LINE)).toBe(true);
    expect(ok.body.length).toBeLessThanOrEqual(300);
    await expect(composeMessage(fakeLlm({ subject: null, body: "x".repeat(290) }), { ...base, channel: "LINKEDIN" })).rejects.toThrow(ComposeRejectedError);
  });

  it("allows offer numbers on touch 3", async () => {
    const offer = { planName: "Pro", freeMonths: 12, priceAfterCents: 4900, currency: "CAD", remainingSlots: 13, deadline: new Date("2027-01-31T12:00:00Z") };
    const m = await composeMessage(fakeLlm({ subject: "Founding spot", body: "12 months free, then $49/month. 13 spots left until January 31, 2027. https://getverixa.com/claim/R123456" }), { ...base, step: 3, offer });
    expect(m.body).toContain("$49");
  });
});

describe("composeMessage guards", () => {
  const ok = "Hi Sara, see https://getverixa.com/consultant/R123456";
  it("rejects extra URLs", async () => {
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `${ok} and https://evil.example/x` }), base)).rejects.toThrow(ComposeRejectedError);
  });
  it("rejects scheme-less URLs that are not exactly allowed", async () => {
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `${ok} getverixa.com/claim/R123456` }), base)).rejects.toThrow(ComposeRejectedError);
  });
  it("allows the exact URL followed by punctuation", async () => {
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `Hi Sara, see (https://getverixa.com/consultant/R123456).` }), base)).resolves.toBeDefined();
  });
  const offer3 = { planName: "Pro", freeMonths: 12, priceAfterCents: 4900, currency: "CAD", remainingSlots: null, deadline: null };
  it("does not mistake prices for URLs", async () => {
    const body = "12 months free, then $49.00/month. https://getverixa.com/claim/R123456";
    await expect(composeMessage(fakeLlm({ subject: "Hi", body }), { ...base, step: 3, offer: offer3 })).resolves.toBeDefined();
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `${body} evil.example/x` }), { ...base, step: 3, offer: offer3 })).rejects.toThrow(ComposeRejectedError);
  });
  it("accepts the URL wrapped in quotes or angle brackets", async () => {
    for (const w of ['"U"', "<U>", "'U'", "(U)"]) {
      await expect(composeMessage(fakeLlm({ subject: "Hi", body: `Hi Sara ${w.replace("U", "https://getverixa.com/consultant/R123456")}` }), base)).resolves.toBeDefined();
    }
  });
  it("rejects bare hosts but allows the profile host and emails on it", async () => {
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `${ok} visit evil.com` }), base)).rejects.toThrow(ComposeRejectedError);
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `${ok} or evil.example today` }), base)).rejects.toThrow(ComposeRejectedError);
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `${ok} at getverixa.com` }), base)).resolves.toBeDefined();
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `${ok} write farjad@getverixa.com` }), base)).resolves.toBeDefined();
  });
  it("rejects a body missing the profile link on steps 1-2", async () => {
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: "Hi Sara" }), base)).rejects.toThrow(ComposeRejectedError);
  });
  it("rejects touch 3 with neither link", async () => {
    const offer = { planName: "Pro", freeMonths: 12, priceAfterCents: 4900, currency: "CAD", remainingSlots: null, deadline: null };
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: "12 months free" }), { ...base, step: 3, offer })).rejects.toThrow(ComposeRejectedError);
  });
  it("only allows offer numbers on step 3", async () => {
    const offer = { planName: "Pro", freeMonths: 12, priceAfterCents: 4900, currency: "CAD", remainingSlots: null, deadline: null };
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: `${ok} 12 months free` }), { ...base, step: 2, offer })).rejects.toThrow(ComposeRejectedError);
  });
  it("rejects multi-line or over-long subjects", async () => {
    await expect(composeMessage(fakeLlm({ subject: "a\nBcc: x", body: ok }), base)).rejects.toThrow(ComposeRejectedError);
    await expect(composeMessage(fakeLlm({ subject: "a".repeat(79), body: ok }), base)).rejects.toThrow(ComposeRejectedError);
  });
});

describe("extractNumbers", () => {
  it("ignores digits inside URLs", () => {
    expect(extractNumbers("see https://x.com/a/R123 got 21, $49.00")).toEqual(["21", "49.00"]);
  });
});
