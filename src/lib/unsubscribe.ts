import crypto from "crypto";

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET is not configured.");
  return s;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com";
}

export function signUnsubscribeToken(email: string): string {
  return crypto.createHmac("sha256", secret()).update(email.toLowerCase()).digest("hex").slice(0, 24);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  let expected: string;
  try {
    expected = signUnsubscribeToken(email);
  } catch {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function buildUnsubscribeUrl(email: string): string {
  return `${baseUrl()}/unsubscribe?email=${encodeURIComponent(email)}&token=${signUnsubscribeToken(email)}`;
}

/** RFC 8058 target: mail clients POST here for one-click unsubscribe. */
export function buildOneClickUnsubscribeUrl(email: string): string {
  return `${baseUrl()}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${signUnsubscribeToken(email)}`;
}
