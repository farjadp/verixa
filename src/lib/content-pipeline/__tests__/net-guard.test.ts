import { describe, it, expect, afterEach, vi } from "vitest";
import { assertPublicHttpUrl, isPrivateAddress, safeFetchText } from "@/lib/content-pipeline/net-guard";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1",
    "0.0.0.0", "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fd12::3", "fe80::1", "ff02::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "2001:db8::1", "not-an-ip",
  ])("blocks %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "172.32.0.1", "100.128.0.1", "205.193.0.10", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false)
  );
});

describe("assertPublicHttpUrl", () => {
  it.each([
    "file:///etc/passwd",
    "ftp://8.8.8.8/x",
    "http://127.0.0.1/admin",
    "http://[::1]:3000/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::ffff:127.0.0.1]/",
    "http://2130706433/", // 127.0.0.1 as an integer
    "http://user:pw@8.8.8.8/",
    "not a url",
  ])("rejects %s", async (u) => {
    await expect(assertPublicHttpUrl(u)).rejects.toThrow(/Blocked URL/);
  });

  it("accepts a public IP literal", async () => {
    await expect(assertPublicHttpUrl("https://8.8.8.8/feed")).resolves.toBeInstanceOf(URL);
  });
});

describe("safeFetchText", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("refuses a redirect to a private address", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }));
    await expect(safeFetchText("https://8.8.8.8/", { maxBytes: 1000, timeoutMs: 5000 })).rejects.toThrow(/Blocked URL/);
  });

  it("follows a redirect to another public host", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (u: URL) => {
      seen.push(u.href);
      return seen.length === 1 ? new Response(null, { status: 301, headers: { location: "https://1.1.1.1/final" } }) : new Response("ok");
    });
    await expect(safeFetchText("https://8.8.8.8/start", { maxBytes: 1000, timeoutMs: 5000 })).resolves.toBe("ok");
    expect(seen).toEqual(["https://8.8.8.8/start", "https://1.1.1.1/final"]);
  });

  it("stops reading at the byte limit instead of buffering the whole body", async () => {
    let pulled = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        if (pulled > 1000) return controller.close();
        controller.enqueue(new TextEncoder().encode("x".repeat(1024)));
      },
    });
    vi.stubGlobal("fetch", async () => new Response(body));
    const text = await safeFetchText("https://8.8.8.8/big", { maxBytes: 4096, timeoutMs: 5000 });
    expect(text.length).toBe(4096);
    expect(pulled).toBeLessThan(20); // cancelled early, not ~1000 chunks
  });

  it("throws on HTTP errors", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 404 }));
    await expect(safeFetchText("https://8.8.8.8/x", { maxBytes: 100, timeoutMs: 5000 })).rejects.toThrow(/HTTP 404/);
  });
});
