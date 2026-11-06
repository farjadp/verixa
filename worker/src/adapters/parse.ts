const NOISE = [/^•/, /^(1st|2nd|3rd\+?)$/i, /degree connection/i, /^(connect|message|follow|pending|following|view .*profile)$/i, /^status is/i];

/** Turns the visible text lines of a LinkedIn people-search card into name / headline / location. */
export function parseSearchCard(lines: string[]): { name: string; headline: string; location: string } {
  const kept: string[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l || NOISE.some((re) => re.test(l)) || kept[kept.length - 1] === l) continue;
    kept.push(l);
  }
  return { name: kept[0] ?? "", headline: kept[1] ?? "", location: kept[2] ?? "" };
}

export function slugFromProfileHref(href: string): string | null {
  const m = /\/in\/([^/?#]+)/.exec(href);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

const X_RESERVED = new Set(["home", "explore", "search", "messages", "notifications", "settings", "i", "compose", "login", "signup", "tos", "privacy", "intent", "hashtag", "account"]);

/** A profile link is exactly one path segment that is not a reserved route. */
export function xHandleFromHref(href: string): string | null {
  let path = href;
  try {
    path = new URL(href, "https://x.com").pathname;
  } catch {
    // keep raw
  }
  const m = /^\/([A-Za-z0-9_]{1,15})\/?$/.exec(path);
  return m && !X_RESERVED.has(m[1].toLowerCase()) ? m[1] : null;
}

/** What the profile's controls say about inviting. A Pending control means the invite is already out. */
export function decideInvite(c: { connect: number; pending: number; more: number }): "connect" | "already_invited" | "check_more" | "unavailable" {
  if (c.pending > 0) return "already_invited";
  if (c.connect > 0) return "connect";
  return c.more > 0 ? "check_more" : "unavailable";
}
