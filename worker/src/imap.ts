import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface ParsedMail {
  from?: { value: { address?: string }[] };
  text?: string | false | null;
  html?: string | false | null;
  inReplyTo?: string;
  references?: string | string[];
  /** mailparser's header map: lowercase names; values are strings or structured `{ value, params }` objects. */
  headers?: Map<string, unknown>;
}

export interface EmailReply {
  email: string;
  body: string;
  /** In-Reply-To then References (newest first), without angle brackets. Omitted when the mail has neither header. */
  messageIds?: string[];
  /** Set only when the mail carried an auto-reply header. */
  autoReply?: true;
}

/** Thin seam over the mail server so the logic above it can be tested with fakes. */
export interface ImapSource {
  currentMaxUid(): Promise<number>;
  fetchSince(uid: number): Promise<{ uid: number; source: Buffer }[]>;
}

export interface UidState {
  getImapLastUid(): number | null;
  setImapLastUid(uid: number): void;
}

const MAX_BODY = 8000;
const MAX_IDS = 20;
const MAX_ID_LENGTH = 300;
const IGNORED_LOCAL = /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounces?(\+.*)?)$/i;

/** Own address, bounces and no-reply senders. Verixa handles bounces through the Resend webhook. */
export function isIgnorableSender(address: string | undefined, own: readonly string[]): boolean {
  if (!address) return true;
  const a = address.trim().toLowerCase();
  if (!a) return true;
  if (own.some((o) => o.trim().toLowerCase() === a)) return true;
  return IGNORED_LOCAL.test(a.split("@")[0] ?? "");
}

function htmlToText(html: string): string {
  return html
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/** The sender's new text only: quoted history, signatures separators and thread headers removed, capped at 8000 chars. */
export function extractReplyBody(mail: Pick<ParsedMail, "text" | "html">): string {
  const raw = (typeof mail.text === "string" && mail.text.trim() ? mail.text : typeof mail.html === "string" ? htmlToText(mail.html) : "").replace(/\r\n?/g, "\n");
  const lines = raw.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const next = lines[i + 1] ?? "";
    if (/^On\b.*\bwrote:\s*$/.test(l) || (/^On\b/.test(l) && /^\s*wrote:\s*$/.test(next))) break;
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(l) || /^_{10,}\s*$/.test(l)) break;
    if (/^From:\s.+/.test(l) && lines.slice(i + 1, i + 4).some((n) => /^(Sent|Date):/i.test(n))) break;
    if (l.startsWith(">")) continue;
    out.push(l);
  }
  return out.join("\n").trim().slice(0, MAX_BODY);
}

function splitIds(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(/\s+/));
}

/**
 * Message ids of the thread a mail answers, so Verixa can match the reply to the touch it answers rather than only to the sender.
 * In-Reply-To first, then References newest first (they are listed oldest first). Brackets are stripped; ids over 300 chars are dropped.
 */
export function threadMessageIds(mail: Pick<ParsedMail, "inReplyTo" | "references">): string[] {
  const ordered = [...splitIds(mail.inReplyTo), ...splitIds(mail.references).reverse()];
  const out: string[] = [];
  for (const raw of ordered) {
    const id = raw.trim().replace(/^<+/, "").replace(/>+$/, "").trim();
    if (!id || id.length > MAX_ID_LENGTH || out.includes(id)) continue;
    out.push(id);
    if (out.length === MAX_IDS) break;
  }
  return out;
}

function headerText(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(headerText).join(" ");
  if (v && typeof v === "object" && typeof (v as { value?: unknown }).value === "string") return (v as { value: string }).value;
  return "";
}

/** True for automated mail: Auto-Submitted other than "no", X-Autoreply, X-Autorespond, or Precedence auto_reply/bulk/junk. */
export function isAutoReply(mail: Pick<ParsedMail, "headers">): boolean {
  const h = mail.headers;
  if (!h) return false;
  const auto = h.has("auto-submitted") ? headerText(h.get("auto-submitted")).trim().toLowerCase() : null;
  if (auto !== null && auto !== "no") return true;
  if (h.has("x-autoreply") || h.has("x-autorespond")) return true;
  return /^(auto_reply|bulk|junk)$/.test(headerText(h.get("precedence")).trim().toLowerCase());
}

/**
 * Finds replies that arrived since the last committed UID. The first ever run only records a baseline, so old mail is never reported.
 * Call commit() after the replies were delivered to Verixa.
 */
export async function collectReplies(
  source: ImapSource,
  state: UidState,
  ownAddresses: readonly string[],
  parse: (raw: Buffer) => Promise<ParsedMail>,
): Promise<{ replies: EmailReply[]; commit: () => void }> {
  const last = state.getImapLastUid();
  if (last === null) {
    state.setImapLastUid(await source.currentMaxUid());
    return { replies: [], commit: () => {} };
  }
  const messages = (await source.fetchSince(last)).filter((m) => m.uid > last);
  const replies: EmailReply[] = [];
  for (const m of messages) {
    let parsed: ParsedMail;
    try {
      parsed = await parse(m.source);
    } catch {
      continue;
    }
    const address = parsed.from?.value?.[0]?.address;
    if (isIgnorableSender(address, ownAddresses)) continue;
    const body = extractReplyBody(parsed);
    if (!body) continue;
    const messageIds = threadMessageIds(parsed);
    replies.push({ email: (address as string).trim().toLowerCase(), body, ...(messageIds.length ? { messageIds } : {}), ...(isAutoReply(parsed) ? { autoReply: true as const } : {}) });
  }
  const highest = messages.reduce((n, m) => Math.max(n, m.uid), last);
  return { replies, commit: () => { if (highest > last) state.setImapLastUid(highest); } };
}

/** Real IMAP source. Opens INBOX read-only; fetches with BODY.PEEK so nothing is marked read. Not unit-tested (needs a live server). */
export async function withImapSource<T>(cfg: { host: string; port: number; user: string; pass: string }, fn: (s: ImapSource) => Promise<T>): Promise<T> {
  const client = new ImapFlow({ host: cfg.host, port: cfg.port, secure: cfg.port === 993, auth: { user: cfg.user, pass: cfg.pass }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX", { readOnly: true });
  try {
    const source: ImapSource = {
      currentMaxUid: async () => Math.max(0, Number(client.mailbox && typeof client.mailbox === "object" ? client.mailbox.uidNext : 1) - 1),
      fetchSince: async (uid) => {
        const out: { uid: number; source: Buffer }[] = [];
        for await (const msg of client.fetch(`${uid + 1}:*`, { uid: true, source: true }, { uid: true })) {
          if (msg.source) out.push({ uid: msg.uid, source: msg.source });
        }
        return out;
      },
    };
    return await fn(source);
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
}

export const parseMail = (raw: Buffer): Promise<ParsedMail> => simpleParser(raw) as Promise<ParsedMail>;
