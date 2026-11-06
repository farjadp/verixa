import { describe, expect, it, vi } from "vitest";
import { ElementMissing, guarded, need, type PageLike } from "./guard";

function page(url = "https://www.linkedin.com/in/x/", text = "fine", shotFails = false): PageLike & { shots: string[] } {
  const shots: string[] = [];
  return {
    shots,
    url: () => url,
    bodyText: async () => text,
    screenshot: async (p: string) => { if (shotFails) throw new Error("no shot"); shots.push(p); },
  };
}
const now = () => Date.UTC(2026, 10, 9, 14, 0, 0);

describe("guarded", () => {
  it("passes a value through as ok", async () => {
    expect(await guarded(page(), "/s", "op", async () => 7, now)).toEqual({ status: "ok", value: 7 });
  });

  it("maps a missing element to broken with a screenshot path", async () => {
    const p = page();
    const r = await guarded(p, "/s", "send message", async () => { throw new ElementMissing("Send button"); }, now);
    expect(r.status).toBe("broken");
    if (r.status === "broken") {
      expect(r.detail).toContain("Send button");
      expect(r.screenshot).toMatch(/^\/s\/.*send-message\.png$/);
      expect(p.shots).toEqual([r.screenshot]);
    }
  });

  it("maps a Playwright-style TimeoutError to broken", async () => {
    const e = Object.assign(new Error("waiting for locator"), { name: "TimeoutError" });
    expect((await guarded(page(), "/s", "op", async () => { throw e; }, now)).status).toBe("broken");
  });

  it("reports a checkpoint (by url) in preference to broken", async () => {
    const r = await guarded(page("https://www.linkedin.com/checkpoint/challenge/1"), "/s", "op", async () => { throw new ElementMissing("x"); }, now);
    expect(r).toMatchObject({ status: "checkpoint" });
  });

  it("reports a checkpoint by page text", async () => {
    const r = await guarded(page("https://x.com/home", "Please verify you are human"), "/s", "op", async () => { throw new ElementMissing("x"); }, now);
    expect(r.status).toBe("checkpoint");
  });

  it("still returns broken if the screenshot fails", async () => {
    const r = await guarded(page(undefined, undefined, true), "/s", "op", async () => { throw new ElementMissing("x"); }, now);
    expect(r).toMatchObject({ status: "broken", screenshot: undefined });
  });

  it("rethrows ordinary errors so the runner reports FAILED", async () => {
    await expect(guarded(page(), "/s", "op", async () => { throw new Error("invite not available: Pending"); }, now)).rejects.toThrow("Pending");
  });

  it("passes through an explicit result returned by the body", async () => {
    const r = await guarded(page(), "/s", "op", async () => ({ status: "dmsClosed" as const }), now);
    expect(r).toEqual({ status: "dmsClosed" });
  });
});

describe("need", () => {
  it("resolves when the locator becomes visible", async () => {
    const loc = { waitFor: vi.fn(async () => {}) };
    await need(loc, "thing");
    expect(loc.waitFor).toHaveBeenCalledWith({ state: "visible", timeout: 8000 });
  });
  it("throws ElementMissing when it does not", async () => {
    const loc = { waitFor: vi.fn(async () => { throw new Error("timeout"); }) };
    await expect(need(loc, "Send button")).rejects.toBeInstanceOf(ElementMissing);
  });
});
