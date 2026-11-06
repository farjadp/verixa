import { closeSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export class LockedError extends Error {
  constructor(readonly holderPid: number) {
    super(`another worker run is active (pid ${holderPid})`);
    this.name = "LockedError";
  }
}

export interface LockOptions {
  pid?: number;
  now?: () => number;
  isAlive?: (pid: number) => boolean;
  staleMs?: number;
  /** Test seam: runs after a stale holder was read and before the takeover starts. */
  onStaleDetected?: () => void;
}

type Holder = { pid: number; at: number };

const defaultAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
};

function readHolder(path: string): Holder | null {
  try {
    const h = JSON.parse(readFileSync(path, "utf8")) as Holder;
    return typeof h.pid === "number" && typeof h.at === "number" ? h : null;
  } catch {
    return null;
  }
}

/** Exclusive create; returns false if the file already exists. */
function tryCreate(path: string, content: string): boolean {
  try {
    const fd = openSync(path, "wx");
    writeFileSync(fd, content);
    closeSync(fd);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw e;
  }
}

const MUTEX_STALE_MS = 30_000;

/**
 * Exclusive lock file so two runs can never overlap. A dead holder or a lock older than `staleMs` is taken over, but only
 * inside a short-lived mutex file (`<path>.takeover`) and only after re-reading the holder, so two contenders can never
 * both remove the stale lock and then each create their own. Losing the takeover is reported as LockedError.
 */
export function acquireLock(path: string, opts: LockOptions = {}): () => void {
  const pid = opts.pid ?? process.pid;
  const now = opts.now ?? Date.now;
  const isAlive = opts.isAlive ?? defaultAlive;
  const staleMs = opts.staleMs ?? 6 * 3600_000;
  const mine = JSON.stringify({ pid, at: now() });
  mkdirSync(dirname(path), { recursive: true });

  const release = () => {
    if (readHolder(path)?.pid === pid) {
      try {
        unlinkSync(path);
      } catch {
        // already gone
      }
    }
  };
  const isLive = (h: Holder | null) => h !== null && isAlive(h.pid) && now() - h.at < staleMs;

  if (tryCreate(path, mine)) return release;

  const seen = readHolder(path);
  if (isLive(seen)) throw new LockedError(seen!.pid);
  opts.onStaleDetected?.();

  const mutex = `${path}.takeover`;
  if (!tryCreate(mutex, mine)) {
    // Another process is mid-takeover. A mutex that has itself been abandoned is cleared once, then we back off either way.
    try {
      if (Date.now() - statSync(mutex).mtimeMs > MUTEX_STALE_MS) unlinkSync(mutex);
    } catch {
      // gone already
    }
    throw new LockedError(readHolder(path)?.pid ?? 0);
  }
  try {
    const current = readHolder(path);
    if (isLive(current)) throw new LockedError(current!.pid); // someone took over between our read and the mutex
    try {
      unlinkSync(path);
    } catch {
      // already removed
    }
    if (!tryCreate(path, mine)) throw new LockedError(readHolder(path)?.pid ?? 0);
    return release;
  } finally {
    try {
      unlinkSync(mutex);
    } catch {
      // already gone
    }
  }
}
