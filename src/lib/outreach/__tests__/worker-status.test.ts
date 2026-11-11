import { describe, expect, it } from "vitest";
import { computeSendable, computeWorkerStatus, toWorkerCandidates } from "../worker-status";
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

  it("returns handles of the invited leads, deduped, skipping nulls, plus lead ids", () => {
    const invited = [
      { id: "L1", externalHandle: "a" },
      { id: "L1b", externalHandle: "a" },
      { id: "L2", externalHandle: null },
      { id: "L4", externalHandle: "c" },
    ];
    const st = computeWorkerStatus(settings(), "LINKEDIN", invited);
    expect(st.invitedHandles).toEqual(["a", "c"]);
    expect(st.invitedLeads).toEqual([{ leadId: "L1", handle: "a" }, { leadId: "L1b", handle: "a" }, { leadId: "L4", handle: "c" }]);
  });
});

describe("computeSendable", () => {
  const base = { touchStatus: "QUEUED", leadState: "BACKLOG", claimed: false, suppressed: false } as const;
  it("is sendable for a queued touch on an active, unclaimed, unsuppressed lead", () => {
    expect(computeSendable(base)).toEqual({ sendable: true });
    expect(computeSendable({ ...base, leadState: "TOUCH_1" }).sendable).toBe(true);
  });
  it.each([
    [{ touchStatus: "CANCELLED" }, /touch/],
    [{ touchStatus: "SENT" }, /touch/],
    [{ touchStatus: "DRY_RUN" }, /touch/],
    [{ leadState: "OPTED_OUT" }, /lead is/],
    [{ leadState: "CONVERSATION" }, /lead is/],
    [{ leadState: "CLAIMED" }, /lead is/],
    [{ leadState: "ARCHIVED" }, /lead is/],
    [{ claimed: true }, /claimed/],
    [{ suppressed: true }, /suppressed/],
  ])("is not sendable: %j", (over, reason) => {
    const r = computeSendable({ ...base, ...over });
    expect(r.sendable).toBe(false);
    expect(r.reason).toMatch(reason);
  });
});

describe("toWorkerCandidates", () => {
  const p = (o: Partial<{ province: string | null; country: string | null }> = {}) => ({
    id: "P1", fullName: "Ana Li", company: null, city: "Vancouver", licenseNumber: "R1",
    province: o.province === undefined ? "BC" : o.province, country: o.country === undefined ? "Canada" : o.country,
  });

  it("gives a BC consultant the Vancouver zone derived from the province", () => {
    expect(toWorkerCandidates([p()])).toEqual([
      { consultantProfileId: "P1", fullName: "Ana Li", company: null, city: "Vancouver", province: "BC", licenseNumber: "R1", timezone: "America/Vancouver" },
    ]);
  });

  it("uses the same rules as email: full province names work, unknown or non-Canadian profiles are dropped", () => {
    expect(toWorkerCandidates([p({ province: "Alberta", country: null })])[0].timezone).toBe("America/Edmonton");
    expect(toWorkerCandidates([p({ province: null })])).toEqual([]);
    expect(toWorkerCandidates([p({ province: "CA", country: "USA" })])).toEqual([]);
  });
});
