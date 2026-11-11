import { describe, expect, it } from "vitest";
import { decideInvite, inboundAfterLastOutbound, linkedinThreadMessages, linkedinThreadUrl, parseSearchCard, slugFromProfileHref, snapshotUnread, xHandleFromHref, xHandleFromRow, xThreadMessages, xThreadSender } from "./parse";

describe("parseSearchCard", () => {
  it("extracts name, headline and location, dropping degree and button noise", () => {
    const lines = ["Jose Alvarez", "Jose Alvarez", "• 2nd", "RCIC | Immigration Consultant at Alvarez Services", "Toronto, Ontario, Canada", "Connect", "2nd degree connection"];
    expect(parseSearchCard(lines)).toEqual({ name: "Jose Alvarez", headline: "RCIC | Immigration Consultant at Alvarez Services", location: "Toronto, Ontario, Canada" });
  });
  it("tolerates a short card", () => {
    expect(parseSearchCard(["Jane Doe"])).toEqual({ name: "Jane Doe", headline: "", location: "" });
    expect(parseSearchCard([])).toEqual({ name: "", headline: "", location: "" });
  });
});

describe("slugFromProfileHref", () => {
  it("reads the /in/ slug", () => {
    expect(slugFromProfileHref("https://www.linkedin.com/in/jose-alvarez-123/?miniProfileUrn=x")).toBe("jose-alvarez-123");
    expect(slugFromProfileHref("/in/J%C3%B3se/")).toBe("Jóse");
    expect(slugFromProfileHref("https://www.linkedin.com/company/foo")).toBeNull();
  });
});

describe("xHandleFromHref", () => {
  it("reads a profile handle and rejects non-profile paths", () => {
    expect(xHandleFromHref("/janedoe")).toBe("janedoe");
    expect(xHandleFromHref("https://x.com/janedoe?s=20")).toBe("janedoe");
    expect(xHandleFromHref("/search")).toBeNull();
    expect(xHandleFromHref("/janedoe/status/1")).toBeNull();
    expect(xHandleFromHref("/i/flow/login")).toBeNull();
  });
});

describe("decideInvite", () => {
  it("clicks Connect when present", () => expect(decideInvite({ connect: 1, pending: 0, more: 1 })).toBe("connect"));
  it("treats Pending as already invited (counts as sent)", () => {
    expect(decideInvite({ connect: 0, pending: 1, more: 1 })).toBe("already_invited");
    expect(decideInvite({ connect: 1, pending: 1, more: 0 })).toBe("already_invited");
  });
  it("looks under More when there is no direct Connect", () => expect(decideInvite({ connect: 0, pending: 0, more: 1 })).toBe("check_more"));
  it("is unavailable with no relevant control", () => expect(decideInvite({ connect: 0, pending: 0, more: 0 })).toBe("unavailable"));
});

describe("inboundAfterLastOutbound", () => {
  it("is null when our message is the last one", () => {
    expect(inboundAfterLastOutbound([{ from: "them", text: "hi" }, { from: "us", text: "hello" }])).toEqual({ ok: true, text: null });
  });
  it("returns their messages after our last one, joined in order", () => {
    const r = inboundAfterLastOutbound([{ from: "them", text: "old" }, { from: "us", text: "step 1" }, { from: "them", text: "not now" }, { from: "them", text: "please stop" }]);
    expect(r).toEqual({ ok: true, text: "not now\nplease stop" });
  });
  it("when we never wrote, any message from them counts", () => {
    expect(inboundAfterLastOutbound([{ from: "them", text: "who is this?" }])).toEqual({ ok: true, text: "who is this?" });
  });
  it("an empty thread has no inbound message", () => expect(inboundAfterLastOutbound([])).toEqual({ ok: true, text: null }));
  it("ignores blank messages", () => expect(inboundAfterLastOutbound([{ from: "us", text: "x" }, { from: "them", text: "  " }])).toEqual({ ok: true, text: null }));
  it("cannot decide when a message after our last one has no known sender", () => {
    expect(inboundAfterLastOutbound([{ from: "us", text: "x" }, { from: null, text: "?" }]).ok).toBe(false);
    expect(inboundAfterLastOutbound([{ from: null, text: "?" }]).ok).toBe(false);
  });
  it("an unknown sender before our last message does not matter", () => {
    expect(inboundAfterLastOutbound([{ from: null, text: "?" }, { from: "us", text: "x" }])).toEqual({ ok: true, text: null });
  });
});

describe("linkedinThreadMessages", () => {
  it("uses the other-party marker, then the sender link, and carries the sender through a message group", () => {
    const raw = [
      { other: false, senderHref: "https://www.linkedin.com/in/farjad-pd/", text: "Hi Jose, step 1" },
      { other: false, senderHref: null, text: "and a follow-up line" },
      { other: false, senderHref: "/in/Jose-Alvarez-123/", text: "Thanks, not interested" },
      { other: false, senderHref: null, text: "Regards, Jose" },
      { other: true, senderHref: "/in/ACoAAB123/", text: "one more" },
    ];
    expect(linkedinThreadMessages(raw, "jose-alvarez-123")).toEqual([
      { from: "us", text: "Hi Jose, step 1" },
      { from: "us", text: "and a follow-up line" },
      { from: "them", text: "Thanks, not interested" },
      { from: "them", text: "Regards, Jose" },
      { from: "them", text: "one more" },
    ]);
  });
  it("a first message with neither marker nor link has no known sender", () => {
    expect(linkedinThreadMessages([{ other: false, senderHref: null, text: "x" }], "h")).toEqual([{ from: null, text: "x" }]);
  });
});

describe("xThreadSender / xThreadMessages", () => {
  it("a link to the partner's profile means them", () => expect(xThreadSender({ partnerLink: true, leftGap: 400, rightGap: 0 })).toBe("them"));
  it("right-aligned content is us, left-aligned is them", () => {
    expect(xThreadSender({ partnerLink: false, leftGap: 300, rightGap: 8 })).toBe("us");
    expect(xThreadSender({ partnerLink: false, leftGap: 8, rightGap: 300 })).toBe("them");
  });
  it("roughly centred or zero-width content is unknown", () => {
    expect(xThreadSender({ partnerLink: false, leftGap: 10, rightGap: 12 })).toBeNull();
    expect(xThreadSender({ partnerLink: false, leftGap: 0, rightGap: 0 })).toBeNull();
  });
  it("maps raw entries to messages", () => {
    expect(xThreadMessages([{ partnerLink: false, leftGap: 300, rightGap: 4, text: " hello " }, { partnerLink: false, leftGap: 4, rightGap: 300, text: "no thanks" }])).toEqual([
      { from: "us", text: "hello" },
      { from: "them", text: "no thanks" },
    ]);
  });
});

describe("snapshotUnread", () => {
  it("keeps unread rows' keys in order, deduped, capped", () => {
    const rows = [
      { unread: true, key: "a" }, { unread: false, key: "b" }, { unread: true, key: "c" }, { unread: true, key: "a" },
      ...Array.from({ length: 20 }, (_, i) => ({ unread: true, key: `k${i}` })),
    ];
    const r = snapshotUnread(rows, 10);
    expect(r).toEqual({ ok: true, keys: ["a", "c", "k0", "k1", "k2", "k3", "k4", "k5", "k6", "k7"] });
  });
  it("fails when an unread row has no stable key", () => {
    expect(snapshotUnread([{ unread: true, key: "a" }, { unread: true, key: null }], 10).ok).toBe(false);
  });
  it("is empty when nothing is unread", () => expect(snapshotUnread([{ unread: false, key: null }], 10)).toEqual({ ok: true, keys: [] }));
});

describe("linkedinThreadUrl", () => {
  it("normalises a conversation link to an absolute thread URL", () => {
    expect(linkedinThreadUrl("/messaging/thread/2-abc==/?foo=1")).toBe("https://www.linkedin.com/messaging/thread/2-abc==/");
    expect(linkedinThreadUrl("https://www.linkedin.com/messaging/thread/2-xyz/")).toBe("https://www.linkedin.com/messaging/thread/2-xyz/");
  });
  it("rejects anything that is not a thread", () => {
    expect(linkedinThreadUrl("/in/jose/")).toBeNull();
    expect(linkedinThreadUrl("https://evil.example/messaging/thread/2-abc/")).toBeNull();
    expect(linkedinThreadUrl(null)).toBeNull();
  });
});

describe("xHandleFromRow", () => {
  it("reads the @handle from a conversation row's text", () => {
    expect(xHandleFromRow("Jane Doe\n@janedoe\n· 2h\nThanks!")).toBe("janedoe");
    expect(xHandleFromRow("no handle here")).toBeNull();
  });
});
