// ============================================================================
// Content Pipeline — outbound fetch guard (SSRF protection).
// Source URLs come from admin-editable ContentSource rows and from links inside
// fetched feeds/pages, so they're untrusted. Every hop (including redirects) must
// be http(s) to a host that resolves only to public addresses, and bodies are
// read with a hard byte cap.
//
// Known limit: the address is checked before fetch() resolves it again, so a
// DNS-rebinding host could still switch addresses between the two lookups.
// Pinning the resolved IP needs a custom undici dispatcher.
// ============================================================================
import { lookup } from "dns/promises";
import { isIP } from "net";

function ipv4Octets(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return nums.every((n) => n >= 0 && n <= 255) ? nums : null;
}

function isPrivateIpv4(ip: string): boolean {
  const o = ipv4Octets(ip);
  if (!o) return true; // unparseable → refuse
  const [a, b, c] = o;
  return (
    a === 0 || // "this" network
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    a === 127 ||
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast + reserved + broadcast
  );
}

/** Embedded IPv4 from ::ffff:a.b.c.d, ::ffff:7f00:1, or NAT64 64:ff9b::a.b.c.d forms. */
function embeddedIpv4(ip: string): string | null {
  const m = /^(?:::ffff:|64:ff9b::)(?:0:)?(.+)$/.exec(ip);
  if (!m) return null;
  const rest = m[1];
  if (rest.includes(".")) return rest;
  const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(rest);
  if (!hex) return null;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved and documentation ranges. */
export function isPrivateAddress(address: string): boolean {
  const ip = address.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIpv4(ip);
  if (kind !== 6) return true;
  const v4 = embeddedIpv4(ip);
  if (v4) return isPrivateIpv4(v4);
  return (
    ip === "::" ||
    ip === "::1" ||
    /^f[cd]/.test(ip) || // fc00::/7 unique local
    /^fe[89ab]/.test(ip) || // fe80::/10 link-local
    /^ff/.test(ip) || // multicast
    ip.startsWith("2001:db8:") || // documentation
    ip.startsWith("::") // other IPv4-compatible / unspecified forms
  );
}

/** Parse and validate a URL; throws unless it is http(s) to a public host. */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Blocked URL: not a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`Blocked URL: protocol ${url.protocol} not allowed.`);
  if (url.username || url.password) throw new Error("Blocked URL: credentials in URL.");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error(`Blocked URL: ${url.hostname} resolves to a non-public address.`);
  }
  return url;
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    const room = maxBytes - total;
    chunks.push(value.byteLength > room ? value.subarray(0, room) : value);
    total += Math.min(value.byteLength, room);
  }
  if (total >= maxBytes) await reader.cancel().catch(() => undefined); // stop downloading the rest
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

export interface SafeFetchOptions {
  maxBytes: number;
  timeoutMs: number;
  headers?: Record<string, string>;
  maxRedirects?: number;
}

/** GET a public http(s) URL as text, validating every redirect hop and capping the body size. */
export async function safeFetchText(rawUrl: string, opts: SafeFetchOptions): Promise<string> {
  const signal = AbortSignal.timeout(opts.timeoutMs);
  let current = rawUrl;
  for (let hop = 0; hop <= (opts.maxRedirects ?? 5); hop++) {
    const url = await assertPublicHttpUrl(current);
    const res = await fetch(url, { headers: opts.headers, redirect: "manual", signal });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => undefined);
      if (!location) throw new Error(`HTTP ${res.status} without Location for ${url.href}`);
      current = new URL(location, url).href;
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      throw new Error(`HTTP ${res.status} for ${url.href}`);
    }
    return readCapped(res, opts.maxBytes);
  }
  throw new Error("Too many redirects.");
}
