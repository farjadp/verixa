import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import type { PageLike } from "./adapters/guard";

export const SHOTS_DIR = resolve(process.cwd(), ".state/shots");

/** The founder's own Chrome with a persistent profile: headed, real fingerprint, sessions survive between runs. */
export async function openContext(profileDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(resolve(profileDir), { channel: "chrome", headless: false, viewport: null });
}

export function pageLike(page: Page): PageLike {
  return {
    url: () => page.url(),
    bodyText: () => page.locator("body").innerText({ timeout: 3000 }),
    screenshot: async (path) => {
      await mkdir(SHOTS_DIR, { recursive: true });
      await page.screenshot({ path });
    },
  };
}

export async function visit(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => {});
}
