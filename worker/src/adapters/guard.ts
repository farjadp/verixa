import type { AdapterResult } from "./types";
import { looksLikeCheckpoint } from "./checkpoint";

/** The slice of a Playwright Page the guard needs; lets tests use a plain fake. */
export interface PageLike {
  url(): string;
  bodyText(): Promise<string>;
  screenshot(path: string): Promise<void>;
}

export class ElementMissing extends Error {
  constructor(what: string) {
    super(`expected element not found: ${what}`);
    this.name = "ElementMissing";
  }
}

/** Waits for a locator to be visible; a miss is ElementMissing (adapter broken), never a guess at another selector. */
export async function need(loc: { waitFor(o: { state: "visible"; timeout: number }): Promise<unknown> }, what: string, timeout = 8000): Promise<void> {
  try {
    await loc.waitFor({ state: "visible", timeout });
  } catch {
    throw new ElementMissing(what);
  }
}

/** Keeps whatever a multi-step read collected before it failed, so the caller can still report it. */
export function attachPartial<T>(r: AdapterResult<T>, partial: T): AdapterResult<T> {
  return r.status === "broken" || r.status === "checkpoint" ? { ...r, partial } : r;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Runs one adapter operation. A checkpoint wins over everything; a missing element becomes `broken` with a screenshot;
 * any other error is rethrown so the runner records the task as FAILED. Never retries.
 */
export async function guarded<T>(
  page: PageLike,
  shotsDir: string,
  op: string,
  fn: () => Promise<T | AdapterResult<T>>,
  now: () => number = Date.now,
): Promise<AdapterResult<T>> {
  try {
    const v = await fn();
    if (v && typeof v === "object" && "status" in v && ["ok", "dmsClosed", "checkpoint", "broken"].includes((v as { status: string }).status)) return v as AdapterResult<T>;
    return { status: "ok", value: v as T };
  } catch (e) {
    let text = "";
    try {
      text = await page.bodyText();
    } catch {
      // page may be gone; URL check below still runs
    }
    const cp = looksLikeCheckpoint(page.url(), text);
    if (cp.hit) return { status: "checkpoint", detail: cp.detail };
    const err = e as Error;
    if (err.name === "ElementMissing" || err.name === "TimeoutError") {
      let shot: string | undefined = `${shotsDir}/${now()}-${slug(op)}.png`;
      try {
        await page.screenshot(shot);
      } catch {
        shot = undefined;
      }
      return { status: "broken", detail: `${op}: ${err.message}`.slice(0, 600), screenshot: shot };
    }
    throw e;
  }
}
