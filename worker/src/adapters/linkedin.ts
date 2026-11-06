import type { Page } from "playwright";
import { SHOTS_DIR, pageLike, visit } from "../browser";
import type { SocialProfile } from "../match";
import { CheckpointError, type ProbeCheck } from "../probe";
import type { Candidate } from "../types";
import { looksLikeCheckpoint } from "./checkpoint";
import { ElementMissing, guarded, need } from "./guard";
import { parseSearchCard, slugFromProfileHref } from "./parse";
import type { AdapterResult, ChannelAdapter, InboxEvents, SentInfo } from "./types";

const BASE = "https://www.linkedin.com";
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

async function cardsOnPage(page: Page): Promise<{ handle: string; lines: string[] }[]> {
  const raw = await page.evaluate(() => {
    const seen = new Set<string>();
    const out: { href: string; lines: string[] }[] = [];
    for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]'))) {
      if (seen.has(a.href)) continue;
      seen.add(a.href);
      const card = a.closest("li") ?? a.parentElement?.parentElement;
      out.push({ href: a.href, lines: ((card as HTMLElement | null)?.innerText ?? "").split("\n") });
    }
    return out;
  });
  const bySlug = new Map<string, { handle: string; lines: string[] }>();
  for (const r of raw) {
    const handle = slugFromProfileHref(r.href);
    if (handle && !bySlug.has(handle)) bySlug.set(handle, { handle, lines: r.lines });
  }
  return [...bySlug.values()];
}

async function openProfile(page: Page, handle: string): Promise<void> {
  await visit(page, `${BASE}/in/${encodeURIComponent(handle)}/`);
  await need(page.locator("main"), "profile page");
}

/** The Message control is a button or a link depending on the profile. */
const messageControl = (page: Page) =>
  page.locator("main").getByRole("button", { name: /^message$/i }).or(page.locator("main").getByRole("link", { name: /^message$/i })).first();

export class LinkedInAdapter implements ChannelAdapter {
  readonly channel = "LINKEDIN" as const;
  constructor(private readonly page: Page) {}

  private run<T>(op: string, fn: () => Promise<T | AdapterResult<T>>): Promise<AdapterResult<T>> {
    return guarded(pageLike(this.page), SHOTS_DIR, op, fn);
  }

  findProfile(candidate: Candidate): Promise<AdapterResult<SocialProfile[]>> {
    return this.run("find profile", async () => {
      await visit(this.page, `${BASE}/search/results/people/?keywords=${encodeURIComponent(`${candidate.fullName} RCIC`)}`);
      await need(this.page.locator("main"), "search results page");
      const hasLinks = await this.page.locator('a[href*="/in/"]').first().waitFor({ state: "visible", timeout: 8000 }).then(() => true, () => false);
      if (!hasLinks) {
        if (/no results found/i.test(await this.page.locator("main").innerText())) return [] as SocialProfile[];
        throw new ElementMissing("people search result links");
      }
      return (await cardsOnPage(this.page)).slice(0, 8).map(({ handle, lines }) => ({ handle, ...parseSearchCard(lines) }));
    });
  }

  /** WRITE ACTION: sends a connection invite with a note. */
  invite(handle: string, note: string): Promise<AdapterResult<SentInfo>> {
    return this.run("invite", async () => {
      await openProfile(this.page, handle);
      const main = this.page.locator("main");
      const connectName = /^(connect|invite .* to connect)$/i;
      let connect = main.getByRole("button", { name: connectName }).first();
      if ((await connect.count()) === 0) {
        if ((await main.getByRole("button", { name: /pending/i }).count()) > 0) throw new Error("invite not available: already pending");
        const more = main.getByRole("button", { name: /^more( actions)?$/i }).first();
        await need(more, "More actions button");
        await more.click();
        connect = this.page.getByRole("menuitem", { name: /connect/i }).first();
        if ((await connect.count()) === 0) throw new Error("invite not available: no Connect option (already connected or restricted)");
      }
      await connect.click();
      const dialog = this.page.getByRole("dialog");
      const addNote = dialog.getByRole("button", { name: /add a note/i });
      await need(addNote, "Add a note button");
      await addNote.click();
      const box = dialog.getByRole("textbox");
      await need(box, "invite note field");
      await box.fill(note);
      const send = dialog.getByRole("button", { name: /^send( invitation)?$/i });
      await need(send, "Send invitation button");
      await send.click();
      await dialog.waitFor({ state: "hidden", timeout: 8000 }).catch(() => {
        throw new ElementMissing("invite dialog closing after send");
      });
      return {} as SentInfo;
    });
  }

  /** WRITE ACTION: sends a direct message to an existing connection. */
  sendMessage(handle: string, body: string): Promise<AdapterResult<SentInfo>> {
    return this.run("send message", async () => {
      await openProfile(this.page, handle);
      const msg = messageControl(this.page);
      await need(msg, "Message button");
      await msg.click();
      const box = this.page.getByRole("textbox", { name: /write a message/i });
      await need(box, "message box");
      await box.fill(body);
      const send = this.page.getByRole("button", { name: /^send$/i }).last();
      await need(send, "Send button");
      await send.click();
      // Do not report SENT unless the text is visibly in the thread.
      const probe = body.replace(/\s+/g, " ").slice(0, 40);
      await need(this.page.getByText(probe, { exact: false }).last(), "sent message in thread");
      return {} as SentInfo;
    });
  }

  hasSentText(handle: string, body: string): Promise<AdapterResult<boolean>> {
    return this.run("check thread", async () => {
      await openProfile(this.page, handle);
      const msg = messageControl(this.page);
      if ((await msg.count()) === 0) return false; // not connected: nothing can have been sent
      await msg.click();
      await need(this.page.getByRole("textbox", { name: /write a message/i }), "message box");
      await this.page.waitForTimeout(1500);
      return norm(await this.page.locator("body").innerText()).includes(norm(body));
    });
  }

  readInbox(invitedHandles: string[]): Promise<AdapterResult<InboxEvents>> {
    return this.run("read inbox", async () => {
      const events: InboxEvents = { acceptedHandles: [], replies: [] };

      if (invitedHandles.length) {
        await visit(this.page, `${BASE}/mynetwork/invite-connect/connections/`);
        await need(this.page.locator("main"), "connections page");
        await this.page.locator('a[href*="/in/"]').first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
        const slugs = new Set((await cardsOnPage(this.page)).slice(0, 60).map((c) => c.handle.toLowerCase()));
        events.acceptedHandles = invitedHandles.filter((h) => slugs.has(h.toLowerCase()));
      }

      await visit(this.page, `${BASE}/messaging/`);
      await need(this.page.locator("main"), "messaging page");
      // Opening an unread conversation marks it read on LinkedIn; that is the only side effect.
      const unread = this.page.locator("main").getByRole("listitem").filter({ hasText: /unread/i });
      const n = Math.min(await unread.count(), 10);
      for (let i = 0; i < n; i++) {
        await unread.nth(i).click();
        await this.page.waitForTimeout(1200);
        const link = this.page.locator('main a[href*="/in/"]').first();
        const handle = (await link.count()) ? slugFromProfileHref((await link.getAttribute("href")) ?? "") : null;
        const last = this.page.locator("main p").last();
        const text = (await last.count()) ? (await last.innerText()).trim() : "";
        if (!handle || !text) throw new ElementMissing("conversation sender or last message");
        events.replies.push({ handle, body: text });
      }
      return events;
    });
  }

  async detectCheckpoint(): Promise<boolean> {
    if (this.page.url() === "about:blank") await visit(this.page, `${BASE}/feed/`);
    let text = "";
    try {
      text = await this.page.locator("body").innerText({ timeout: 3000 });
    } catch {
      // unreadable page: rely on URL
    }
    return looksLikeCheckpoint(this.page.url(), text).hit;
  }
}

/** Read-only checks. Nothing here clicks Connect, Message or Send, or types into any field. */
export function linkedinProbeChecks(page: Page): ProbeCheck[] {
  const assertClear = async () => {
    const text = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
    const cp = looksLikeCheckpoint(page.url(), text);
    if (cp.hit) throw new CheckpointError(`checkpoint/login wall: ${cp.detail}`);
  };
  let firstProfile: string | null = null;
  return [
    { name: "logged in (feed loads)", run: async () => { await visit(page, `${BASE}/feed/`); await assertClear(); return page.url(); } },
    {
      name: "people search returns profiles",
      run: async () => {
        await visit(page, `${BASE}/search/results/people/?keywords=${encodeURIComponent("RCIC Toronto")}`);
        await assertClear();
        await need(page.locator('a[href*="/in/"]').first(), "result links");
        const cards = (await cardsOnPage(page)).slice(0, 8);
        if (!cards.length) throw new Error("no /in/ cards");
        firstProfile = cards[0].handle;
        const p = parseSearchCard(cards[0].lines);
        return `${cards.length} cards; first: name="${p.name}" headline="${p.headline.slice(0, 40)}" location="${p.location}"`;
      },
    },
    {
      name: "profile controls resolve",
      run: async () => {
        if (!firstProfile) throw new Error("no profile from previous step");
        await openProfile(page, firstProfile);
        await assertClear();
        const main = page.locator("main");
        const counts = {
          connect: await main.getByRole("button", { name: /^(connect|invite .* to connect)$/i }).count(),
          message: (await main.getByRole("button", { name: /^message$/i }).count()) + (await main.getByRole("link", { name: /^message$/i }).count()),
          more: await main.getByRole("button", { name: /^more( actions)?$/i }).count(),
          pending: await main.getByRole("button", { name: /pending/i }).count(),
        };
        if (!Object.values(counts).some((c) => c > 0)) throw new Error(`no action buttons found ${JSON.stringify(counts)}`);
        return JSON.stringify(counts);
      },
    },
    {
      name: "messaging page loads",
      run: async () => {
        await visit(page, `${BASE}/messaging/`);
        await assertClear();
        await need(page.locator("main"), "main");
        const items = await page.locator("main").getByRole("listitem").count();
        const unread = await page.locator("main").getByRole("listitem").filter({ hasText: /unread/i }).count();
        if (items === 0) throw new Error("no conversation list items found");
        return `${items} list items, ${unread} unread`;
      },
    },
    {
      name: "connections page loads",
      run: async () => {
        await visit(page, `${BASE}/mynetwork/invite-connect/connections/`);
        await assertClear();
        await need(page.locator("main"), "main");
        return `${(await cardsOnPage(page)).length} connection links`;
      },
    },
  ];
}
