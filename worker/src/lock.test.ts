import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acquireLock, LockedError } from "./lock";

const path = () => join(mkdtempSync(join(tmpdir(), "wlock-")), "sub", "run.lock");

describe("acquireLock", () => {
  it("creates the lock and releases it", () => {
    const p = path();
    const release = acquireLock(p, { pid: 100, now: () => 1000, isAlive: () => true });
    expect(existsSync(p)).toBe(true);
    release();
    expect(existsSync(p)).toBe(false);
  });

  it("refuses while a live process holds a fresh lock", () => {
    const p = path();
    acquireLock(p, { pid: 100, now: () => 1000, isAlive: () => true });
    expect(() => acquireLock(p, { pid: 200, now: () => 2000, isAlive: () => true })).toThrow(LockedError);
  });

  it("takes over a lock whose process is dead", () => {
    const p = path();
    acquireLock(p, { pid: 100, now: () => 1000, isAlive: () => true });
    expect(() => acquireLock(p, { pid: 200, now: () => 2000, isAlive: () => false })).not.toThrow();
  });

  it("takes over a stale lock even if the pid looks alive (pid reuse)", () => {
    const p = path();
    acquireLock(p, { pid: 100, now: () => 0, isAlive: () => true });
    expect(() => acquireLock(p, { pid: 200, now: () => 7 * 3600_000, isAlive: () => true })).not.toThrow();
  });

  it("treats an unreadable lock file as stale", () => {
    const p = path();
    acquireLock(p, { pid: 1, now: () => 0, isAlive: () => true })();
    writeFileSync(p, "garbage");
    expect(() => acquireLock(p, { pid: 2, now: () => 1, isAlive: () => true })).not.toThrow();
  });

  it("release only removes our own lock", () => {
    const p = path();
    const release = acquireLock(p, { pid: 100, now: () => 0, isAlive: () => true });
    writeFileSync(p, JSON.stringify({ pid: 999, at: 0 }));
    release();
    expect(existsSync(p)).toBe(true);
  });

  it("two contenders taking over the same stale lock: exactly one wins, the other never steals the winner's lock", () => {
    const p = path();
    acquireLock(p, { pid: 100, now: () => 0, isAlive: () => false })(); // leave nothing
    writeFileSync(p, JSON.stringify({ pid: 100, at: 0 })); // stale holder
    const now = () => 10_000;
    let winner: (() => void) | undefined;
    // B has read the stale lock; before it acts, A takes over.
    expect(() =>
      acquireLock(p, {
        pid: 200, now, isAlive: (pid) => pid === 300,
        onStaleDetected: () => { winner = acquireLock(p, { pid: 300, now, isAlive: (pid) => pid === 300 }); },
      }),
    ).toThrow(LockedError);
    expect(JSON.parse(readFileSync(p, "utf8")).pid).toBe(300);
    winner!();
    expect(existsSync(p)).toBe(false);
  });

  it("a takeover leaves no mutex file behind", () => {
    const p = path();
    acquireLock(p, { pid: 1, now: () => 0, isAlive: () => true });
    acquireLock(p, { pid: 2, now: () => 10, isAlive: () => false });
    expect(existsSync(`${p}.takeover`)).toBe(false);
  });
});
