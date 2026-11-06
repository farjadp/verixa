import { describe, expect, it } from "vitest";
import { looksLikeCheckpoint } from "./checkpoint";

describe("looksLikeCheckpoint", () => {
  it.each([
    "https://www.linkedin.com/checkpoint/challenge/abc",
    "https://www.linkedin.com/authwall?trk=x",
    "https://www.linkedin.com/login?session_redirect=x",
    "https://www.linkedin.com/uas/login",
    "https://x.com/i/flow/login",
    "https://x.com/account/access",
    "https://x.com/i/flow/consent_flow",
    "https://www.linkedin.com/m/login/",
  ])("flags url %s", (url) => {
    expect(looksLikeCheckpoint(url, "").hit).toBe(true);
  });

  it.each([
    "Let's do a quick security check",
    "Please verify you are human",
    "We detected unusual activity on your account",
    "Your account has been temporarily restricted",
    "Complete the CAPTCHA to continue",
    "Sign in to continue",
    "Your account is suspended",
  ])("flags text %s", (text) => {
    expect(looksLikeCheckpoint("https://www.linkedin.com/feed/", text).hit).toBe(true);
  });

  it("does not flag normal pages", () => {
    expect(looksLikeCheckpoint("https://www.linkedin.com/in/jane-doe/", "Jane Doe RCIC Toronto Message Connect").hit).toBe(false);
    expect(looksLikeCheckpoint("https://x.com/janedoe", "Jane Doe @janedoe Follow").hit).toBe(false);
  });

  it("does not match 'login' inside an unrelated path segment", () => {
    expect(looksLikeCheckpoint("https://www.linkedin.com/in/blogin-smith/", "").hit).toBe(false);
  });

  it("explains the hit", () => {
    expect(looksLikeCheckpoint("https://www.linkedin.com/authwall", "").detail).toMatch(/authwall/);
  });
});
