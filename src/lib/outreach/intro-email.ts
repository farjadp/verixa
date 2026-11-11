/**
 * Touch 1 on the EMAIL channel: a fixed, founder-approved template (design "B", Nov 2026).
 * No LLM is involved, so what was approved is exactly what is sent. Follow-ups stay LLM-composed plain text.
 */

export interface IntroInput {
  firstName: string;
  city: string | null;
  profileUrl: string;
  claimUrl: string;
}

export interface IntroEmail {
  subject: string;
  /** Plain-text part; also what is stored on the touch and shown in the admin. */
  body: string;
  /** Inner HTML for the branded card. email.ts wraps it with the layout and the CASL footer. */
  html: string;
}

export const ESCAPE_LINE_EMAIL = 'Not relevant? Reply "no" and I won\'t email again.';

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Registry names are often upper-case ("SARAH" / "MARIE-CLAUDE"): show them in normal case. */
export function displayName(raw: string): string {
  const name = raw.trim().replace(/[,;]+$/, "");
  if (!name) return "";
  if (name !== name.toUpperCase() && name !== name.toLowerCase()) return name; // already mixed case: trust it
  return name.toLowerCase().replace(/(^|[-'\s])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

function cleanCity(city: string | null): string | null {
  const c = city?.trim();
  return c ? displayName(c) : null;
}

export function buildIntroEmail(input: IntroInput): IntroEmail {
  const name = displayName(input.firstName);
  const city = cleanCity(input.city);
  const greeting = name ? `Hi ${name},` : "Hi,";
  const where = city ? `in ${city} and beyond` : "across Canada";
  const subject = name ? `Your CICC listing is on Verixa, ${name}` : "Your CICC listing is on Verixa";

  const points = [
    "Add your services, languages and fees",
    `Take bookings from clients ${where}`,
    "Joining is free right now",
  ];

  const body = [
    greeting,
    "",
    "I'm Farjad, founder of Verixa. Your public CICC listing is already on the platform, where clients find licensed consultants and book them directly.",
    "",
    ...points.map((p) => `- ${p}`),
    "",
    `Claim your profile: ${input.claimUrl}`,
    `Or view it first: ${input.profileUrl}`,
    "",
    "Questions? Just reply. I read every email.",
    "",
    "Farjad",
    "",
    ESCAPE_LINE_EMAIL,
  ].join("\n");

  const p = (inner: string, extra = "") => `<p style="margin:0 0 16px;${extra}">${inner}</p>`;
  const html =
    p(escapeHtml(greeting)) +
    p("I'm Farjad, founder of Verixa. Your public CICC listing is already on the platform, where clients find licensed consultants and book them directly.") +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">` +
    points
      .map((pt) => `<tr><td valign="top" style="padding:3px 10px 3px 0;color:#2FA4A9;font-weight:700;">&#10003;</td><td style="padding:3px 0;">${escapeHtml(pt)}</td></tr>`)
      .join("") +
    `</table>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;"><tr><td bgcolor="#2FA4A9" style="border-radius:6px;">` +
    `<a href="${escapeHtml(input.claimUrl)}" style="display:inline-block;padding:12px 20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Claim your profile</a>` +
    `</td></tr></table>` +
    p(`<a href="${escapeHtml(input.profileUrl)}" style="color:#3A6EA5;">Or view it first</a>`, "font-size:14px;margin-bottom:20px;") +
    p("Questions? Just reply. I read every email.") +
    p("Farjad") +
    p(escapeHtml(ESCAPE_LINE_EMAIL), "font-size:13px;color:#6b7280;");

  return { subject, body, html };
}
