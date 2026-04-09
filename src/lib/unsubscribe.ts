import crypto from "crypto";

const UNSUB_SECRET = process.env.UNSUBSCRIBE_SECRET || "verixa-unsub-secret-2024";

export function signUnsubscribeToken(email: string): string {
  return crypto
    .createHmac("sha256", UNSUB_SECRET)
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

export function buildUnsubscribeUrl(email: string): string {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://getverixa.ca";
  const token = signUnsubscribeToken(email);
  return `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = signUnsubscribeToken(email);
  return expected === token;
}
