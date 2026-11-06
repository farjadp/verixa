import type { Page } from "playwright";
import { SHOTS_DIR, pageLike, visit } from "../browser";
import type { SocialProfile } from "../match";
import { CheckpointError, type ProbeCheck } from "../probe";
import type { Candidate } from "../types";
import { looksLikeCheckpoint } from "./checkpoint";
import { attachPartial, ElementMissing, guarded, need } from "./guard";
import { xHandleFromHref } from "./parse";
import type { AdapterResult, ChannelAdapter, InboxEvents, SentInfo } from "./types";

// X exposes few useful ARIA roles, so some locators use data-testid (X's own stable test hooks). Roles are used wherever they exist.
const BASE = "https://x.com";
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

const dmButton = (page: Page) => page.getByRole("button", { name: /^message$/i }).first();
const composer = (page: Page) => page.getByRole("textbox", { name: /message/i }).or(page.getByTestId("dmComposerTextInput")).first();
const sendButton = (page: Page) => page.getByRole("button", { name: /^send$/i }).or(page.getByTestId("dmComposerSendButton")).first();

/**
 * Closed DMs are concluded only after giving the Message control time to render; a slow page must not read as "closed".
 * The profile header is already confirmed visible by openProfile.
 */
async function dmAvailable(page: Page): Promise<boolean> {
  return dmButton(page).waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
}

async function openProfile(page: Page, handle: string): Promise<void> {
  await visit(page, `${BASE}/${encodeURIComponent(handle)}`);
  await need(page.getByTestId("UserName"), "profile header");
}

export class XAdapter implements ChannelAdapter {
  readonly channel = "X" as const;
  constructor(private readonly page: Page) {}

  private run<T>(op: string, fn: () => Promise<T | AdapterResult<T>>): Promise<AdapterResult<T>> {
    return guarded(pageLike(this.page), SHOTS_DIR, op, fn);
  }

  findProfile(candidate: Candidate): Promise<AdapterResult<SocialProfile[]>> {
    return this.run("find profile", async () => {
      await visit(this.page, `${BASE}/search?q=${encodeURIComponent(`${candidate.fullName} RCIC`)}&f=user`);
      await need(this.page.locator("main"), "search page");
      const cells = this.page.getByTestId("UserCell");
      const any = await cells.first().waitFor({ state: "visible", timeout: 8000 }).then(() => true, () => false);
      if (!any) {
        if (/no results/i.test(await this.page.locator("main").innerText())) return [] as SocialProfile[];
        throw new ElementMissing("user search results");
      }
      const out: SocialProfile[] = [];
      for (let i = 0; i < Math.min(await cells.count(), 8); i++) {
        const cell = cells.nth(i);
        const hrefs = await cell.locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));
        const handle = hrefs.map(xHandleFromHref).find((h): h is string => !!h);
        if (!handle) continue;
        const lines = (await cell.innerText()).split("\n").map((l) => l.trim()).filter(Boolean);
        const name = lines[0] ?? "";
        const bio = lines.filter((l) => l !== name && !l.startsWith("@") && !/^(follow|following|follows you)$/i.test(l)).join(" ");
        out.push({ handle, name, bio });
      }
      return out;
    });
  }

  invite(): Promise<AdapterResult<SentInfo>> {
    throw new Error("X has no connection invites");
  }

  /** WRITE ACTION: sends a DM. Closed DMs (no Message button on a loaded profile) resolve to dmsClosed. */
  sendMessage(handle: string, body: string): Promise<AdapterResult<SentInfo>> {
    return this.run("send message", async () => {
      await openProfile(this.page, handle);
      const dm = dmButton(this.page);
      if (!(await dmAvailable(this.page))) return { status: "dmsClosed" as const };
      await dm.click();
      const box = composer(this.page);
      await need(box, "DM composer");
      await box.fill(body);
      const send = sendButton(this.page);
      await need(send, "DM send button");
      await send.click();
      await need(this.page.getByText(body.replace(/\s+/g, " ").slice(0, 40), { exact: false }).last(), "sent DM in thread");
      return {} as SentInfo;
    });
  }

  hasSentText(handle: string, body: string): Promise<AdapterResult<boolean>> {
    return this.run("check thread", async () => {
      await openProfile(this.page, handle);
      const dm = dmButton(this.page);
      if (!(await dmAvailable(this.page))) return false; // DMs closed: nothing can have been sent
      await dm.click();
      await need(composer(this.page), "DM composer");
      await this.page.waitForTimeout(1500);
      return norm(await this.page.locator("body").innerText()).includes(norm(body));
    });
  }

  async readInbox(): Promise<AdapterResult<InboxEvents>> {
    const events: InboxEvents = { acceptedHandles: [], replies: [] };
    try {
      return attachPartial(await this.readInboxInto(events), events);
    } catch (e) {
      return { status: "broken", detail: `read inbox: ${(e as Error).message}`.slice(0, 600), partial: events };
    }
  }

  private readInboxInto(events: InboxEvents): Promise<AdapterResult<InboxEvents>> {
    return this.run("read inbox", async () => {
      await visit(this.page, `${BASE}/messages`);
      await need(this.page.locator("main"), "messages page");
      const unread = this.page.getByTestId("conversation").filter({ has: this.page.locator('[aria-label*="unread" i]') });
      const n = Math.min(await unread.count(), 10);
      for (let i = 0; i < n; i++) {
        const item = unread.nth(i);
        const handle = /@([A-Za-z0-9_]{1,15})/.exec(await item.innerText())?.[1];
        await item.click();
        const last = this.page.getByTestId("messageEntry").last();
        await need(last, "last message in conversation");
        if (!handle) throw new ElementMissing("@handle in conversation row");
        events.replies.push({ handle, body: (await last.innerText()).trim() });
      }
      return events;
    });
  }

  async detectCheckpoint(): Promise<boolean> {
    if (this.page.url() === "about:blank") await visit(this.page, `${BASE}/home`);
    let text = "";
    try {
      text = await this.page.locator("body").innerText({ timeout: 3000 });
    } catch {
      // unreadable page: rely on URL
    }
    return looksLikeCheckpoint(this.page.url(), text).hit;
  }
}

/** Read-only checks. Nothing here clicks Message or Send, or types into any field. */
export function xProbeChecks(page: Page): ProbeCheck[] {
  const assertClear = async () => {
    const text = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
    const cp = looksLikeCheckpoint(page.url(), text);
    if (cp.hit) throw new CheckpointError(`checkpoint/login wall: ${cp.detail}`);
  };
  let firstHandle: string | null = null;
  return [
    { name: "logged in (home loads)", run: async () => { await visit(page, `${BASE}/home`); await assertClear(); return page.url(); } },
    {
      name: "people search returns users",
      run: async () => {
        await visit(page, `${BASE}/search?q=${encodeURIComponent("RCIC Toronto")}&f=user`);
        await assertClear();
        const cells = page.getByTestId("UserCell");
        await need(cells.first(), "UserCell results");
        const hrefs = await cells.first().locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));
        firstHandle = hrefs.map(xHandleFromHref).find((h): h is string => !!h) ?? null;
        if (!firstHandle) throw new Error("could not read a handle from the first result");
        return `${await cells.count()} cells; first handle @${firstHandle}`;
      },
    },
    {
      name: "profile header and DM control resolve",
      run: async () => {
        if (!firstHandle) throw new Error("no handle from previous step");
        await openProfile(page, firstHandle);
        await assertClear();
        return `DM button visible after 5s: ${await dmAvailable(page)} (false means DMs closed for this user)`;
      },
    },
    {
      name: "messages page loads",
      run: async () => {
        await visit(page, `${BASE}/messages`);
        await assertClear();
        await need(page.locator("main"), "main");
        return `${await page.getByTestId("conversation").count()} conversations`;
      },
    },
  ];
}
