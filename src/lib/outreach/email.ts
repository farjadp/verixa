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

export function buildOutreachEmail(input: { to: string; subject: string; body: string }, env: NodeJS.ProcessEnv = process.env): BuiltEmail {
  const from = required(env, "OUTREACH_FROM_EMAIL");
  const address = required(env, "OUTREACH_MAILING_ADDRESS");
  const replyTo = required(env, "OUTREACH_REPLY_TO");
  const legalName = required(env, "OUTREACH_SENDER_LEGAL_NAME");
  const unsubscribeUrl = buildUnsubscribeUrl(input.to);
  const identity = `Farjad · Verixa (getverixa.com), operated by ${legalName}`;
  const footer = `--\n${identity}\n${address}\nDon't want these emails? Unsubscribe: ${unsubscribeUrl}`;
  const text = `${input.body}\n\n${footer}`;
  const html =
    `<div>${escapeHtml(input.body).replace(/\n/g, "<br>")}</div>` +
    `<p style="color:#6b7280;font-size:12px">--<br>${escapeHtml(identity)}<br>${escapeHtml(address)}<br>` +
    `Don't want these emails? <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`;
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
