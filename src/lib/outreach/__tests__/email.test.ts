import { beforeEach, describe, expect, it } from "vitest";
import { OutreachConfigError, buildOutreachEmail } from "../email";

const env = {
  OUTREACH_FROM_EMAIL: "Farjad from Verixa <farjad@outreach.example.test>",
  OUTREACH_MAILING_ADDRESS: "1 Test St, Newmarket, ON L3Y 0A0, Canada",
  OUTREACH_REPLY_TO: "farjad@example.test",
} as unknown as NodeJS.ProcessEnv;

describe("buildOutreachEmail", () => {
  beforeEach(() => { process.env.UNSUBSCRIBE_SECRET = "s"; process.env.NEXT_PUBLIC_APP_URL = "https://example.test"; });

  it("adds CASL identity, address and unsubscribe, plus one-click headers", () => {
    const m = buildOutreachEmail({ to: "rcic@firm.ca", subject: "Your listing", body: "Hi <Sara>,\nline two" }, env);
    expect(m.from).toBe(env.OUTREACH_FROM_EMAIL);
    expect(m.replyTo).toBe("farjad@example.test");
    expect(m.text).toContain("1 Test St, Newmarket, ON L3Y 0A0, Canada");
    expect(m.text).toMatch(/Unsubscribe: https:\/\/example\.test\/api\/unsubscribe\?email=rcic%40firm\.ca&token=/);
    expect(m.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/example\.test\/api\/unsubscribe\?email=rcic%40firm\.ca&token=[0-9a-f]{24}>$/);
    expect(m.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(m.html).toContain("Hi &lt;Sara&gt;,<br>line two");
  });

  it("refuses to build without sender, address or reply-to", () => {
    for (const k of ["OUTREACH_FROM_EMAIL", "OUTREACH_MAILING_ADDRESS", "OUTREACH_REPLY_TO"] as const) {
      expect(() => buildOutreachEmail({ to: "a@b.ca", subject: "s", body: "b" }, { ...env, [k]: "" })).toThrow(OutreachConfigError);
    }
  });
});
