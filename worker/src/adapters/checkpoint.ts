const URL_PATTERNS: [RegExp, string][] = [
  [/\/checkpoint(\/|$|\?)/i, "checkpoint"],
  [/\/authwall/i, "authwall"],
  [/\/uas\/login/i, "login page"],
  [/\/(m\/)?login(\/|$|\?)/i, "login page"],
  [/\/i\/flow\/(login|consent_flow|login_challenge)/i, "login/consent flow"],
  [/\/account\/access/i, "account access"],
  [/captcha/i, "captcha"],
];

const TEXT_PATTERNS: [RegExp, string][] = [
  [/security check/i, "security check"],
  [/verify (that )?you('| a)?re (a )?human|verify you are human/i, "human verification"],
  [/unusual activity/i, "unusual activity"],
  [/temporarily restricted/i, "account restricted"],
  [/account (has been |is )suspended/i, "account suspended"],
  [/captcha/i, "captcha"],
  [/sign in to continue|log in to continue/i, "login wall"],
];

/** Pure check on a page's URL and visible text. Conservative on purpose: a false positive only pauses the channel. */
export function looksLikeCheckpoint(url: string, text: string): { hit: boolean; detail: string } {
  let path = url;
  try {
    const u = new URL(url);
    path = u.pathname + u.search;
  } catch {
    // keep raw
  }
  for (const [re, label] of URL_PATTERNS) if (re.test(path)) return { hit: true, detail: `${label} (${url})` };
  for (const [re, label] of TEXT_PATTERNS) if (re.test(text)) return { hit: true, detail: `${label} (${url})` };
  return { hit: false, detail: "" };
}
