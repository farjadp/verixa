import { Resend } from "resend";
import { buildOneClickUnsubscribeUrl, buildUnsubscribeUrl } from "@/lib/unsubscribe";

export class OutreachConfigError extends Error {
  constructor(missing: string) {
    super(`Outreach is not configured: ${missing} is unset.`);
    this.name = "OutreachConfigError";
  }
}

/** Resend rejected the send; statusCode is the HTTP status when Resend reported one. */
export class ResendSendError extends Error {
  constructor(message: string, readonly statusCode: number | null, readonly code: string | null = null) {
    super(message);
    this.name = "ResendSendError";
  }
}

export interface BuiltEmail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function required(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key]?.trim();
  if (!v) throw new OutreachConfigError(key);
  return v;
}

/** Branded layout (design "B"): navy header, white card, CASL footer inside the card. Inline styles: email clients ignore stylesheets. */
function brandedHtml(inner: string, footerHtml: string): string {
  return (
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>` +
    `<body style="margin:0;padding:0;background:#F5F7FA;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F7FA"><tr><td align="center" style="padding:24px 12px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #dde2ea;border-radius:8px;">` +
    `<tr><td bgcolor="#0F2A44" style="padding:14px 24px;border-radius:8px 8px 0 0;font-family:Helvetica,Arial,sans-serif;color:#ffffff;font-size:18px;font-weight:700;">` +
    `Verixa <span style="font-size:12px;font-weight:400;color:#c9d4e0;">licensed consultants, verified</span></td></tr>` +
    `<tr><td style="padding:24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1A1F2B;">${inner}` +
    `<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">${footerHtml}</p></td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

/** `html`, when given, is the inner content of the branded card (touch 1); otherwise the body is sent as a plain note. */
export function buildOutreachEmail(input: { to: string; subject: string; body: string; html?: string }, env: NodeJS.ProcessEnv = process.env): BuiltEmail {
  const from = required(env, "OUTREACH_FROM_EMAIL");
  const address = required(env, "OUTREACH_MAILING_ADDRESS");
  const replyTo = required(env, "OUTREACH_REPLY_TO");
  const legalName = required(env, "OUTREACH_SENDER_LEGAL_NAME");
  const unsubscribeUrl = buildUnsubscribeUrl(input.to);
  const identity = `Farjad · Verixa (getverixa.com), operated by ${legalName}`;
  const footer = `--\n${identity}\n${address}\nDon't want these emails? Unsubscribe: ${unsubscribeUrl}`;
  const text = `${input.body}\n\n${footer}`;
  const footerHtml = `--<br>${escapeHtml(identity)}<br>${escapeHtml(address)}<br>` +
    `Don't want these emails? <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe</a>`;
  const html = input.html
    ? brandedHtml(input.html, footerHtml)
    : `<div>${escapeHtml(input.body).replace(/\n/g, "<br>")}</div><p style="color:#6b7280;font-size:12px">${footerHtml}</p>`;
  return {
    from, to: input.to, replyTo, subject: input.subject, text, html,
    headers: {
      "List-Unsubscribe": `<${buildOneClickUnsubscribeUrl(input.to)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

function client(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new OutreachConfigError("RESEND_API_KEY");
  return new Resend(key);
}

/** `idempotencyKey` makes Resend dedupe a retried/overlapping send of the same touch. */
export async function sendOutreachEmail(msg: BuiltEmail, scheduledAt: Date | null, idempotencyKey?: string): Promise<{ id: string }> {
  const { data, error } = await client().emails.send(
    {
      from: msg.from, to: [msg.to], replyTo: msg.replyTo, subject: msg.subject,
      text: msg.text, html: msg.html, headers: msg.headers,
      ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
  if (error || !data) throw new ResendSendError(`Resend send failed: ${error?.message ?? "no data"}`, error?.statusCode ?? null, error?.name ?? null);
  return { id: data.id };
}

export async function cancelOutreachEmail(id: string): Promise<void> {
  const { error } = await client().emails.cancel(id);
  if (error) throw new Error(`Resend cancel failed: ${error.message}`);
}
