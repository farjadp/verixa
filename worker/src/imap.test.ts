import { describe, expect, it, vi } from "vitest";
import { collectReplies, extractReplyBody, isIgnorableSender, threadMessageIds, type ImapSource, type ParsedMail } from "./imap";

describe("isIgnorableSender", () => {
  const own = ["farjad@getverixa.com"];
  it.each(["farjad@getverixa.com", "Farjad@GetVerixa.com", "MAILER-DAEMON@mx.google.com", "postmaster@example.com", "noreply@x.com", "no-reply@x.com", "donotreply@x.com", "do-not-reply@x.com", "bounce+abc@mail.example.com", "bounces@example.com"])("ignores %s", (a) => {
    expect(isIgnorableSender(a, own)).toBe(true);
  });
  it.each(["jane@alvarezimmigration.ca", "reply@firm.ca", "noreplyer@firm.ca"])("keeps %s", (a) => {
    expect(isIgnorableSender(a, own)).toBe(false);
  });
  it("ignores a missing address", () => {
    expect(isIgnorableSender(undefined, own)).toBe(true);
    expect(isIgnorableSender("", own)).toBe(true);
  });
});

describe("extractReplyBody", () => {
  it("returns plain text as-is", () => {
    expect(extractReplyBody({ text: "Sounds interesting, call me.\n" })).toBe("Sounds interesting, call me.");
  });
  it("cuts a Gmail 'On ... wrote:' quote and quoted lines", () => {
    const text = "Yes please.\n\nOn Mon, Nov 9, 2026 at 9:00 AM Farjad <farjad@getverixa.com> wrote:\n> Hi Jane\n> we built Verixa\n";
    expect(extractReplyBody({ text })).toBe("Yes please.");
  });
  it("handles a wrapped 'On ... wrote:' header", () => {
    const text = "Not now.\n\nOn Mon, Nov 9, 2026 at 9:00 AM, Farjad Someone <farjad@getverixa.com>\nwrote:\n> hi";
    expect(extractReplyBody({ text })).toBe("Not now.");
  });
  it("cuts Outlook headers and Original Message separators", () => {
    expect(extractReplyBody({ text: "Please stop.\n\n-----Original Message-----\nFrom: Farjad\nSent: x\n" })).toBe("Please stop.");
    expect(extractReplyBody({ text: "Tell me more\n\nFrom: Farjad <f@getverixa.com>\nSent: Monday\nTo: Jane\nSubject: Hi\n\nHi Jane" })).toBe("Tell me more");
    expect(extractReplyBody({ text: "Ok\n________________________________\nFrom: x" })).toBe("Ok");
  });
  it("keeps a line that merely starts with From: in normal prose", () => {
    expect(extractReplyBody({ text: "From: my side this is fine.\nThanks" })).toBe("From: my side this is fine.\nThanks");
  });
  it("falls back to html, dropping blockquotes and tags", () => {
    const html = "<div>Interested!<br>Call Tuesday</div><blockquote>old quoted text</blockquote>";
    expect(extractReplyBody({ text: false, html })).toBe("Interested!\nCall Tuesday");
  });
  it("decodes basic entities in html", () => {
    expect(extractReplyBody({ html: "<p>R&amp;D &lt;ok&gt;&nbsp;fine</p>" })).toBe("R&D <ok> fine");
  });
  it("truncates to 8000 characters", () => {
    expect(extractReplyBody({ text: "a".repeat(9000) })).toHaveLength(8000);
  });
  it("returns empty for nothing", () => {
    expect(extractReplyBody({})).toBe("");
    expect(extractReplyBody({ text: "> only quote" })).toBe("");
  });
});

function mail(address: string, text: string): ParsedMail {
  return { from: { value: [{ address }] }, text };
}

function setup(uids: Record<number, ParsedMail>, last: number | null, maxUid = 100) {
  const source: ImapSource = {
    currentMaxUid: vi.fn(async () => maxUid),
    fetchSince: vi.fn(async (uid: number) => Object.keys(uids).map(Number).filter((u) => u > uid).sort((a, b) => a - b).map((u) => ({ uid: u, source: Buffer.from(String(u)) }))),
  };
  let stored = last;
  const state = { getImapLastUid: () => stored, setImapLastUid: (u: number) => { stored = u; } };
  const parse = async (b: Buffer) => uids[Number(b.toString())];
  return { source, state, parse, stored: () => stored };
}

describe("collectReplies", () => {
  it("first run only sets a baseline and returns nothing", async () => {
    const s = setup({ 5: mail("a@b.ca", "old") }, null, 77);
    const r = await collectReplies(s.source, s.state, ["me@x.com"], s.parse);
    expect(r.replies).toEqual([]);
    expect(s.stored()).toBe(77);
    expect(s.source.fetchSince).not.toHaveBeenCalled();
  });

  it("returns new replies and commits the highest UID only on commit()", async () => {
    const s = setup({ 11: mail("jane@firm.ca", "Yes!"), 12: mail("noreply@x.com", "auto"), 13: mail("me@x.com", "mine"), 14: mail("bob@firm.ca", "> quoted only") }, 10);
    const r = await collectReplies(s.source, s.state, ["me@x.com"], s.parse);
    expect(r.replies).toEqual([{ email: "jane@firm.ca", body: "Yes!" }]);
    expect(s.stored()).toBe(10);
    r.commit();
    expect(s.stored()).toBe(14);
  });

  it("lowercases the sender address", async () => {
    const s = setup({ 11: mail("Jane@Firm.CA", "hi") }, 10);
    expect((await collectReplies(s.source, s.state, [], s.parse)).replies[0].email).toBe("jane@firm.ca");
  });

  it("does nothing when there is no new mail", async () => {
    const s = setup({}, 10);
    const r = await collectReplies(s.source, s.state, [], s.parse);
    expect(r.replies).toEqual([]);
    r.commit();
    expect(s.stored()).toBe(10);
  });

  it("skips a message that fails to parse but still advances past it", async () => {
    const s = setup({ 11: mail("a@b.ca", "x"), 12: mail("c@d.ca", "ok") }, 10);
    const parse = async (b: Buffer) => { if (b.toString() === "11") throw new Error("bad mime"); return s.parse(b); };
    const r = await collectReplies(s.source, s.state, [], parse);
    expect(r.replies).toEqual([{ email: "c@d.ca", body: "ok" }]);
    r.commit();
    expect(s.stored()).toBe(12);
  });

  it("passes the thread message ids through with the reply", async () => {
    const s = setup({ 11: { ...mail("jane@firm.ca", "Yes"), inReplyTo: "<re_abc@resend.dev>", references: ["<first@x.com>", "<re_abc@resend.dev>"] } }, 10);
    const r = await collectReplies(s.source, s.state, [], s.parse);
    expect(r.replies).toEqual([{ email: "jane@firm.ca", body: "Yes", messageIds: ["re_abc@resend.dev", "first@x.com"] }]);
  });
});

describe("threadMessageIds", () => {
  it("returns nothing when there are no thread headers", () => {
    expect(threadMessageIds({})).toEqual([]);
  });
  it("puts In-Reply-To first, then References newest first; strips brackets, dedupes, splits a space-separated string", () => {
    expect(threadMessageIds({ inReplyTo: " <b@x> ", references: "<a@x> <b@x>\n <c@x>" })).toEqual(["b@x", "c@x", "a@x"]);
  });
  it("accepts ids without brackets", () => {
    expect(threadMessageIds({ inReplyTo: "plain-id@x", references: ["<a@x>"] })).toEqual(["plain-id@x", "a@x"]);
  });
  it("caps at 20 ids and drops ids over 300 characters", () => {
    const refs = Array.from({ length: 30 }, (_, i) => `<id${i}@x>`);
    const long = `<${"a".repeat(301)}@x>`;
    const out = threadMessageIds({ inReplyTo: long, references: refs });
    expect(out).toHaveLength(20);
    expect(out[0]).toBe("id29@x");
    expect(out.every((id) => id.length <= 300)).toBe(true);
  });
});
