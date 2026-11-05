import { randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// CSRF protection for the admin social OAuth flows (LinkedIn, Facebook).
// The init route stores a random `state` in an httpOnly cookie and sends the
// same value to the provider; the callback must see both and they must match.

const STATE_TTL_SECONDS = 10 * 60;

export function oauthStateCookieName(provider: "linkedin" | "facebook") {
  return `verixa_oauth_state_${provider}`;
}

export async function issueOAuthState(provider: "linkedin" | "facebook"): Promise<string> {
  const state = randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set(oauthStateCookieName(provider), state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  return state;
}

/** Returns true when the callback `state` matches the cookie. Clears the cookie either way. */
export async function consumeOAuthState(
  provider: "linkedin" | "facebook",
  received: string | null
): Promise<boolean> {
  const jar = await cookies();
  const name = oauthStateCookieName(provider);
  const expected = jar.get(name)?.value ?? null;
  jar.delete(name);

  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function oauthRedirectBase() {
  return process.env.NODE_ENV === "production"
    ? "https://www.getverixa.com"
    : process.env.NEXTAUTH_URL || "http://localhost:3000";
}
