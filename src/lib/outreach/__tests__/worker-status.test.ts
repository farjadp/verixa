import { describe, expect, it } from "vitest";
import { computeWorkerStatus } from "../worker-status";
import type { OutreachSettings } from "../settings";

const settings = (o: Partial<OutreachSettings> & { li?: boolean; x?: boolean } = {}): OutreachSettings => ({
  enabled: o.enabled ?? true,
  dryRun: o.dryRun ?? false,
  channels: { LINKEDIN: o.li ?? true, X: o.x ?? true, EMAIL: false },
});

describe("computeWorkerStatus", () => {
  it("is enabled only when global and channel flags are both on", () => {
    expect(computeWorkerStatus(settings(), "LINKEDIN", []).enabled).toBe(true);
    expect(computeWorkerStatus(settings({ enabled: false }), "LINKEDIN", []).enabled).toBe(false);
    expect(computeWorkerStatus(settings({ li: false }), "LINKEDIN", []).enabled).toBe(false);
    expect(computeWorkerStatus(settings({ li: false }), "X", []).enabled).toBe(true);
    expect(computeWorkerStatus(settings({ x: false }), "X", []).enabled).toBe(false);
  });

  it("passes dryRun through", () => {
    expect(computeWorkerStatus(settings({ dryRun: true }), "X", []).dryRun).toBe(true);
    expect(computeWorkerStatus(settings({ dryRun: false }), "X", []).dryRun).toBe(false);
  });

  it("returns handles of INVITED leads only, deduped, skipping nulls", () => {
    const leads = [
      { id: "L1", state: "INVITED", externalHandle: "a" },
      { id: "L1b", state: "INVITED", externalHandle: "a" },
      { id: "L2", state: "INVITED", externalHandle: null },
      { id: "L3", state: "TOUCH_1", externalHandle: "b" },
      { id: "L4", state: "INVITED", externalHandle: "c" },
    ] as const;
    const st = computeWorkerStatus(settings(), "LINKEDIN", [...leads]);
    expect(st.invitedHandles).toEqual(["a", "c"]);
    // leadId is needed to report INVITE_ACCEPTED
    expect(st.invitedLeads).toEqual([{ leadId: "L1", handle: "a" }, { leadId: "L1b", handle: "a" }, { leadId: "L4", handle: "c" }]);
  });
});
