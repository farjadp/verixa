import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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
}

const defaultAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
};

/** Exclusive lock file so two runs can never overlap. Dead holders and locks older than `staleMs` are taken over. Returns release(). */
export function acquireLock(path: string, opts: LockOptions = {}): () => void {
  const pid = opts.pid ?? process.pid;
  const now = opts.now ?? Date.now;
  const isAlive = opts.isAlive ?? defaultAlive;
  const staleMs = opts.staleMs ?? 6 * 3600_000;
  mkdirSync(dirname(path), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(path, "wx");
      writeFileSync(fd, JSON.stringify({ pid, at: now() }));
      closeSync(fd);
      return () => {
        try {
          if ((JSON.parse(readFileSync(path, "utf8")) as { pid: number }).pid === pid) unlinkSync(path);
        } catch {
          // already gone or unreadable: nothing of ours to remove
        }
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      let holder: { pid: number; at: number } | null = null;
      try {
        holder = JSON.parse(readFileSync(path, "utf8")) as { pid: number; at: number };
      } catch {
        holder = null;
      }
      if (holder && typeof holder.pid === "number" && isAlive(holder.pid) && now() - holder.at < staleMs) throw new LockedError(holder.pid);
      try {
        unlinkSync(path);
      } catch {
        // someone else removed it; retry
      }
    }
  }
  throw new Error(`could not acquire lock ${path}`);
}
