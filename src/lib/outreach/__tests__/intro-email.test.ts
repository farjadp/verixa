import { beforeEach, describe, expect, it } from "vitest";
import { buildOutreachEmail } from "../email";
import { buildIntroEmail, displayName } from "../intro-email";

const urls = { profileUrl: "https://getverixa.com/consultant/R123?utm_source=outreach", claimUrl: "https://getverixa.com/claim/R123?utm_source=outreach" };
const env = {
  OUTREACH_FROM_EMAIL: "Farjad at Verixa <farjad@getverixa.com>",
  OUTREACH_MAILING_ADDRESS: "1 Test St, Newmarket, ON",
  OUTREACH_REPLY_TO: "farjad@example.test",
  OUTREACH_SENDER_LEGAL_NAME: "VisaRoads Inc.",
} as unknown as NodeJS.ProcessEnv;

describe("intro email (touch 1, design B)", () => {
  beforeEach(() => { process.env.UNSUBSCRIBE_SECRET = "s"; process.env.NEXT_PUBLIC_APP_URL = "https://example.test"; });

  it("normalises registry-cased names and keeps mixed case", () => {
    expect(displayName("SARAH")).toBe("Sarah");
    expect(displayName("marie-claude")).toBe("Marie-Claude");
    expect(displayName("O'NEIL,")).toBe("O'Neil");
    expect(displayName("DeShawn")).toBe("DeShawn");
    expect(displayName("  ")).toBe("");
  });

  it("personalises subject, greeting and city, with both links and the free line", () => {
    const m = buildIntroEmail({ firstName: "SARAH", city: "TORONTO", ...urls });
    expect(m.subject).toBe("Your CICC listing is on Verixa, Sarah");
    expect(m.body).toMatch(/^Hi Sarah,/);
    expect(m.body).toContain("Take bookings from clients in Toronto and beyond");
    expect(m.body).toContain("Joining is free right now");
    expect(m.body).toContain(`Claim your profile: ${urls.claimUrl}`);
    expect(m.body).toContain(`Or view it first: ${urls.profileUrl}`);
    expect(m.html).toContain(`href="${urls.claimUrl}"`);
    expect(m.subject.length).toBeLessThanOrEqual(78);
  });

  it("falls back without a name or city", () => {
    const m = buildIntroEmail({ firstName: "", city: null, ...urls });
    expect(m.subject).toBe("Your CICC listing is on Verixa");
    expect(m.body).toMatch(/^Hi,/);
    expect(m.body).toContain("clients across Canada");
  });

  it("escapes registry data in the html", () => {
    const m = buildIntroEmail({ firstName: "<b>x</b>", city: "A&B", ...urls });
    expect(m.html).not.toContain("<b>x</b>");
    expect(m.html).toContain("A&amp;b");
  });

  it("is wrapped in the branded layout with the CASL footer and unsubscribe", () => {
    const intro = buildIntroEmail({ firstName: "Sarah", city: "Toronto", ...urls });
    const built = buildOutreachEmail({ to: "s@firm.ca", subject: intro.subject, body: intro.body, html: intro.html }, env);
    expect(built.html).toContain('bgcolor="#0F2A44"');
    expect(built.html).toContain("operated by VisaRoads Inc.");
    expect(built.html).toContain("1 Test St, Newmarket, ON");
    expect(built.html).toMatch(/href="https:\/\/example\.test\/api\/unsubscribe\?email=s%40firm\.ca&amp;token=/);
    expect(built.text).toContain("Unsubscribe: https://example.test/api/unsubscribe");
    expect(built.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});
