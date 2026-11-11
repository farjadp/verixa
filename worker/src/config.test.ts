import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

const valid = {
  VERIXA_BASE_URL: "https://example.test",
  OUTREACH_WORKER_TOKEN: "tok",
  IMAP_HOST: "imap.example.test",
  IMAP_PORT: "993",
  IMAP_USER: "me@example.test",
  IMAP_PASS: "pw",
  PROFILE_DIR: "/tmp/profile",
};

describe("loadConfig", () => {
  it("parses a valid env and applies defaults", () => {
    const c = loadConfig(valid);
    expect(c.imap.port).toBe(993);
    expect(c.operatorTz).toBe("America/Toronto");
    expect(c.baseUrl).toBe("https://example.test");
    expect(c.token).toBe("tok");
    expect(c.profileDir).toBe("/tmp/profile");
  });

  it("strips trailing slashes from the base URL", () => {
    expect(loadConfig({ ...valid, VERIXA_BASE_URL: "https://example.test//" }).baseUrl).toBe("https://example.test");
  });

  it("honours OPERATOR_TZ", () => {
    expect(loadConfig({ ...valid, OPERATOR_TZ: "America/Vancouver" }).operatorTz).toBe("America/Vancouver");
  });

  it("fails loudly listing every missing key", () => {
    expect(() => loadConfig({})).toThrow(/VERIXA_BASE_URL.*OUTREACH_WORKER_TOKEN.*IMAP_HOST.*IMAP_PORT.*IMAP_USER.*IMAP_PASS.*PROFILE_DIR/s);
  });

  it("rejects an invalid port, URL or timezone and never echoes secrets", () => {
    expect(() => loadConfig({ ...valid, IMAP_PORT: "abc" })).toThrow(/IMAP_PORT/);
    expect(() => loadConfig({ ...valid, VERIXA_BASE_URL: "not a url" })).toThrow(/VERIXA_BASE_URL/);
    expect(() => loadConfig({ ...valid, OPERATOR_TZ: "Mars/Base" })).toThrow(/OPERATOR_TZ/);
    try {
      loadConfig({ ...valid, IMAP_PORT: "abc", IMAP_PASS: "supersecret" });
    } catch (e) {
      expect((e as Error).message).not.toContain("supersecret");
    }
  });
});
