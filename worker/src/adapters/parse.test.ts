import { describe, expect, it } from "vitest";
import { decideInvite, parseSearchCard, slugFromProfileHref, xHandleFromHref } from "./parse";

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
