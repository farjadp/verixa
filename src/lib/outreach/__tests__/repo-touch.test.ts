import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("../suppression", () => ({ isSuppressed: vi.fn() }));

import { isDeadTouch } from "../repo";

describe("isDeadTouch", () => {
  it("CANCELLED is always reusable", () => {
    for (const channel of ["EMAIL", "LINKEDIN", "X"]) expect(isDeadTouch({ channel, status: "CANCELLED", externalMessageId: null })).toBe(true);
  });
  it("FAILED email without a provider id is reusable", () => {
    expect(isDeadTouch({ channel: "EMAIL", status: "FAILED", externalMessageId: null })).toBe(true);
    expect(isDeadTouch({ channel: "EMAIL", status: "FAILED", externalMessageId: "msg_1" })).toBe(false);
  });
  it("FAILED social touches are never revived", () => {
    expect(isDeadTouch({ channel: "LINKEDIN", status: "FAILED", externalMessageId: null })).toBe(false);
    expect(isDeadTouch({ channel: "X", status: "FAILED", externalMessageId: null })).toBe(false);
  });
  it("SENT, UNCERTAIN, QUEUED are never reusable", () => {
    for (const status of ["SENT", "UNCERTAIN", "QUEUED", "SCHEDULED"]) expect(isDeadTouch({ channel: "EMAIL", status, externalMessageId: null })).toBe(false);
  });
});
