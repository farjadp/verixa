import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => { cancel.mockReset(); setFlag.mockClear(); });

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
