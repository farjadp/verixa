import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileState } from "./state";

const tmp = () => join(mkdtempSync(join(tmpdir(), "wstate-")), "nested", "state.json");

describe("FileState", () => {
  it("starts empty when the file is missing", () => {
    const s = new FileState(tmp());
    expect(s.getImapLastUid()).toBeNull();
    expect(s.countActions("2026-11-09", "LINKEDIN")).toBe(0);
  });

  it("persists the IMAP UID across instances", () => {
    const p = tmp();
    new FileState(p).setImapLastUid(42);
    expect(new FileState(p).getImapLastUid()).toBe(42);
  });

  it("logs actions per day and channel and finds them by touch", () => {
    const p = tmp();
    const s = new FileState(p);
    s.recordAction("2026-11-09", { channel: "LINKEDIN", touchId: "t1", handle: "a", kind: "INVITE" });
    s.recordAction("2026-11-09", { channel: "LINKEDIN", touchId: "t2", handle: "b", kind: "TOUCH" });
    s.recordAction("2026-11-09", { channel: "X", touchId: "t3", handle: "c", kind: "TOUCH" });
    const again = new FileState(p);
    expect(again.countActions("2026-11-09", "LINKEDIN")).toBe(2);
    expect(again.countActions("2026-11-09", "X")).toBe(1);
    expect(again.countActions("2026-11-10", "X")).toBe(0);
    expect(again.hasAction("t2")).toBe(true);
    expect(again.hasAction("nope")).toBe(false);
  });

  it("prunes days older than 14 days of entries", () => {
    const p = tmp();
    const s = new FileState(p);
    s.recordAction("2026-10-01", { channel: "X", touchId: "old", handle: "a", kind: "TOUCH" });
    s.recordAction("2026-11-09", { channel: "X", touchId: "new", handle: "b", kind: "TOUCH" });
    expect(new FileState(p).hasAction("old")).toBe(false);
    expect(new FileState(p).hasAction("new")).toBe(true);
  });

  it("fails loudly on a corrupt file instead of silently resetting", () => {
    const p = tmp();
    new FileState(p).setImapLastUid(1);
    writeFileSync(p, "{not json");
    expect(() => new FileState(p)).toThrow(/corrupt/i);
  });

  it("writes valid JSON", () => {
    const p = tmp();
    new FileState(p).setImapLastUid(7);
    expect(JSON.parse(readFileSync(p, "utf8")).imapLastUid).toBe(7);
  });
});
