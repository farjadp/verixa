const NOISE = [/^•/, /^(1st|2nd|3rd\+?)$/i, /degree connection/i, /^(connect|message|follow|pending|following|view .*profile)$/i, /^status is/i];

/** Turns the visible text lines of a LinkedIn people-search card into name / headline / location. */
export function parseSearchCard(lines: string[]): { name: string; headline: string; location: string } {
  const kept: string[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l || NOISE.some((re) => re.test(l)) || kept[kept.length - 1] === l) continue;
    kept.push(l);
  }
  return { name: kept[0] ?? "", headline: kept[1] ?? "", location: kept[2] ?? "" };
}

export function slugFromProfileHref(href: string): string | null {
  const m = /\/in\/([^/?#]+)/.exec(href);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

const X_RESERVED = new Set(["home", "explore", "search", "messages", "notifications", "settings", "i", "compose", "login", "signup", "tos", "privacy", "intent", "hashtag", "account"]);

/** A profile link is exactly one path segment that is not a reserved route. */
export function xHandleFromHref(href: string): string | null {
  let path = href;
  try {
    path = new URL(href, "https://x.com").pathname;
  } catch {
    // keep raw
  }
  const m = /^\/([A-Za-z0-9_]{1,15})\/?$/.exec(path);
  return m && !X_RESERVED.has(m[1].toLowerCase()) ? m[1] : null;
}

/** What the profile's controls say about inviting. A Pending control means the invite is already out. */
export function decideInvite(c: { connect: number; pending: number; more: number }): "connect" | "already_invited" | "check_more" | "unavailable" {
  if (c.pending > 0) return "already_invited";
  if (c.connect > 0) return "connect";
  return c.more > 0 ? "check_more" : "unavailable";
}

export type Sender = "us" | "them" | null;
export interface ThreadMessage {
  from: Sender;
  text: string;
}

/**
 * What the lead wrote after our last message (everything they wrote if we never wrote), joined in order.
 * Not ok when a message that matters has no known sender: the caller must not guess either way.
 */
export function inboundAfterLastOutbound(messages: ThreadMessage[]): { ok: true; text: string | null } | { ok: false; detail: string } {
  const msgs = messages.map((m) => ({ ...m, text: m.text.trim() })).filter((m) => m.text);
  let lastUs = -1;
  msgs.forEach((m, i) => {
    if (m.from === "us") lastUs = i;
  });
  const tail = msgs.slice(lastUs + 1);
  if (tail.some((m) => m.from === null)) return { ok: false, detail: "a message after our last one has no recognisable sender" };
  const text = tail.filter((m) => m.from === "them").map((m) => m.text).join("\n");
  return { ok: true, text: text || null };
}

/** Raw facts read from one LinkedIn message event: the other-party marker, the group's sender link (only on a group's first event) and the text. */
export interface LinkedInRawEvent {
  other: boolean;
  senderHref: string | null;
  text: string;
}

/** Sender per event: the other-party marker wins, then the sender link vs the lead's handle; events without either belong to the previous group. */
export function linkedinThreadMessages(raw: LinkedInRawEvent[], handle: string): ThreadMessage[] {
  const lead = handle.toLowerCase();
  let current: Sender = null;
  return raw.map((e) => {
    const slug = e.senderHref ? slugFromProfileHref(e.senderHref) : null;
    if (e.other) current = "them";
    else if (slug) current = slug.toLowerCase() === lead ? "them" : "us";
    return { from: current, text: e.text.trim() };
  });
}

/** Raw layout of one X DM entry: whether it links to the partner's profile, and the gaps between its content and the entry's edges (px). */
export interface XRawEntry {
  partnerLink: boolean;
  leftGap: number;
  rightGap: number;
  text: string;
}

const X_ALIGN_MARGIN_PX = 24;

/** Our DMs are right-aligned, theirs left-aligned. Anything not clearly one side is unknown. */
export function xThreadSender(e: Omit<XRawEntry, "text">): Sender {
  if (e.partnerLink) return "them";
  if (e.leftGap - e.rightGap > X_ALIGN_MARGIN_PX) return "us";
  if (e.rightGap - e.leftGap > X_ALIGN_MARGIN_PX) return "them";
  return null;
}

export function xThreadMessages(raw: XRawEntry[]): ThreadMessage[] {
  return raw.map((e) => ({ from: xThreadSender(e), text: e.text.trim() }));
}

/**
 * Stable keys of the unread conversations, taken once before any is opened (opening one marks it read and reorders the live list).
 * Not ok when an unread row has no key: skipping it silently would lose a reply.
 */
export function snapshotUnread(rows: { unread: boolean; key: string | null }[], cap: number): { ok: true; keys: string[] } | { ok: false; detail: string } {
  const keys: string[] = [];
  for (const r of rows) {
    if (!r.unread) continue;
    if (!r.key) return { ok: false, detail: "an unread conversation has no stable link or handle" };
    if (!keys.includes(r.key)) keys.push(r.key);
    if (keys.length >= cap) break;
  }
  return { ok: true, keys };
}

/** Absolute LinkedIn thread URL for a conversation link, or null when it is not a LinkedIn thread. */
export function linkedinThreadUrl(href: string | null): string | null {
  if (!href) return null;
  let u: URL;
  try {
    u = new URL(href, "https://www.linkedin.com");
  } catch {
    return null;
  }
  if (!/(^|\.)linkedin\.com$/.test(u.hostname)) return null;
  const m = /^\/messaging\/thread\/([^/?#]+)\/?/.exec(u.pathname);
  return m ? `https://www.linkedin.com/messaging/thread/${m[1]}/` : null;
}

/** The @handle shown in an X conversation row. */
export function xHandleFromRow(text: string): string | null {
  return /@([A-Za-z0-9_]{1,15})/.exec(text)?.[1] ?? null;
}
