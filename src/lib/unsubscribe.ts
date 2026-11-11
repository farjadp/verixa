import crypto from "crypto";

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET is not configured.");
  return s;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com";
}

function hmac(secretValue: string, email: string): string {
  return crypto.createHmac("sha256", secretValue).update(email.toLowerCase()).digest("hex").slice(0, 24);
}

/** Signing always uses UNSUBSCRIBE_SECRET. */
export function signUnsubscribeToken(email: string): string {
  return hmac(secret(), email);
}

function safeEqual(expected: string, token: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verifies a token against UNSUBSCRIBE_SECRET and, when set, UNSUBSCRIBE_LEGACY_SECRET.
 * UNSUBSCRIBE_LEGACY_SECRET is the secret that signed links already delivered before a
 * rotation; keep it set for at least 60 days so earlier emails' links keep working (CASL).
 * Fails closed when UNSUBSCRIBE_SECRET is unset.
 */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  let expected: string;
  try {
    expected = signUnsubscribeToken(email);
  } catch {
    return false;
  }
  const legacy = process.env.UNSUBSCRIBE_LEGACY_SECRET;
  const okPrimary = safeEqual(expected, token);
  const okLegacy = legacy ? safeEqual(hmac(legacy, email), token) : false;
  return okPrimary || okLegacy;
}

/** Link shown in the email body: the GET handler verifies, records, then redirects to /unsubscribe?status=. */
export function buildUnsubscribeUrl(email: string): string {
  return `${baseUrl()}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${signUnsubscribeToken(email)}`;
}

/** RFC 8058 target: mail clients POST here for one-click unsubscribe. */
export function buildOneClickUnsubscribeUrl(email: string): string {
  return `${baseUrl()}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${signUnsubscribeToken(email)}`;
}
