import { createHash, timingSafeEqual } from "crypto";

/**
 * Constant-time check of `Authorization: Bearer <secret>`.
 * Both sides are SHA-256 hashed first so the comparison is fixed-length and
 * leaks neither content nor length. Callers must reject when the secret is unset.
 */
export function isAuthorizedCronRequest(authHeader: string | null, secret: string): boolean {
  if (!secret) return false;
  const given = createHash("sha256").update(authHeader ?? "").digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(given, expected);
}
