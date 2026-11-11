import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cancel = vi.fn();
const setFlag = vi.fn(async (..._a: unknown[]) => {});
const settings = { enabled: false, dryRun: true, channels: { LINKEDIN: false, X: false, EMAIL: false } };

vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { role: "ADMIN" } })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/outreach/deps", () => ({ realDeps: () => ({}) }));
vi.mock("@/lib/outreach/engine", () => ({ cancelScheduledEmails: (...a: unknown[]) => cancel(...a) }));
vi.mock("@/lib/outreach/settings", () => ({
  getHeartbeat: vi.fn(), getOutreachSettings: vi.fn(async () => settings), setOutreachFlag: (...a: unknown[]) => setFlag(...a),
}));

import { toggleOutreachFlag } from "@/actions/outreach.actions";

describe("toggleOutreachFlag", () => {
  beforeEach(() => { cancel.mockReset(); setFlag.mockClear(); vi.stubEnv("OUTREACH_ALERT_EMAIL", "founder@example.test"); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("refuses to turn outreach on while OUTREACH_ALERT_EMAIL is unset, without writing the flag", async () => {
    for (const v of ["", "   "]) {
      vi.stubEnv("OUTREACH_ALERT_EMAIL", v);
      await expect(toggleOutreachFlag("enabled", true)).rejects.toThrow("Set OUTREACH_ALERT_EMAIL before enabling outreach");
    }
    expect(setFlag).not.toHaveBeenCalled();
  });

  it("always allows turning outreach off, even without OUTREACH_ALERT_EMAIL", async () => {
    vi.stubEnv("OUTREACH_ALERT_EMAIL", "");
    cancel.mockResolvedValue({ cancelled: 0, failed: 0 });
    await toggleOutreachFlag("enabled", false);
    expect(setFlag).toHaveBeenCalledWith("enabled", false);
  });

  it("turns outreach on when OUTREACH_ALERT_EMAIL is set", async () => {
    await toggleOutreachFlag("enabled", true);
    expect(setFlag).toHaveBeenCalledWith("enabled", true);
  });

  it("returns cancelFailed instead of throwing when Resend cancels fail", async () => {
    cancel.mockResolvedValue({ cancelled: 0, failed: 2 });
    expect(await toggleOutreachFlag("enabled", false)).toEqual({ settings, cancelFailed: 2 });
    expect(setFlag).toHaveBeenCalledWith("enabled", false);
  });

  it("does not cancel when turning something on, and rejects invalid input", async () => {
    expect(await toggleOutreachFlag("EMAIL", true)).toEqual({ settings, cancelFailed: 0 });
    expect(cancel).not.toHaveBeenCalled();
    await expect(toggleOutreachFlag("bogus" as never, true)).rejects.toThrow("Invalid");
  });
});
