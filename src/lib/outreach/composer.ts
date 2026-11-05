import { z } from "zod";
import type { Llm } from "@/lib/content-pipeline/types";
import { OUTREACH } from "./config";
import type { FoundingOffer } from "./offer";
import type { Channel, Step } from "./types";

export const ESCAPE_LINE = 'Not relevant? Just reply "no" and I won\'t message again.';
export const INVITE_ESCAPE_LINE = "Not relevant? Just ignore this.";

export class ComposeRejectedError extends Error {
  constructor(reason: string) {
    super(`Composed message rejected: ${reason}`);
    this.name = "ComposeRejectedError";
  }
}

export interface ComposeInput {
  channel: Channel;
  step: Step;
  firstName: string;
  city: string | null;
  profileUrl: string;
  claimUrl: string;
  profileViews30d: number | null;
  offer: FoundingOffer | null;
}

export interface ComposedMessage {
  subject: string | null;
  body: string;
}

const schema = z.object({ subject: z.string().nullable(), body: z.string().min(1) });

const SYSTEM = `You write short, honest outreach from Farjad, the solo founder of Verixa, to a licensed Canadian immigration consultant (RCIC).
Verixa already lists every RCIC from the public CICC registry; the consultant can claim their listing.
Rules:
- Plain, warm, specific. No hype, no exclamation marks, no emojis, no "I hope this finds you well".
- Never invent facts or numbers. Use only numbers given in FACTS. If a fact is null, don't mention it.
- One clear, low-pressure next step. Sign off as "Farjad" (email) or no sign-off (social).
- Email: subject under 60 characters, body under 120 words. LinkedIn invite: body under 240 characters. Other social: under 80 words.
- Each message must stand on its own and include the profile link.`;

const STEP_BRIEF: Record<Step, string> = {
  1: "Tell them their public CICC listing is on Verixa and share the profile link. Ask nothing beyond taking a look.",
  2: "If profileViews30d is a positive number, mention it. Otherwise, a short useful note on how clients search for consultants by city and specialization. Softly invite them to claim the listing (claim link).",
  3: "Present the founding offer exactly as given in FACTS.offer (free months, plan, price afterwards, cancel anytime, slots/deadline if present). Claim link. Make clear this is the last message.",
};

function money(cents: number): string[] {
  const dollars = cents / 100;
  return [String(dollars), dollars.toFixed(2)];
}

function allowedNumbers(input: ComposeInput): Set<string> {
  const allowed = new Set<string>();
  if (input.profileViews30d !== null) allowed.add(String(input.profileViews30d));
  const o = input.offer;
  if (o) {
    allowed.add(String(o.freeMonths));
    if (o.freeMonths % 12 === 0) allowed.add(String(o.freeMonths / 12));
    money(o.priceAfterCents).forEach((v) => allowed.add(v));
    if (o.remainingSlots !== null) allowed.add(String(o.remainingSlots));
    if (o.deadline) {
      allowed.add(String(o.deadline.getUTCDate()));
      allowed.add(String(o.deadline.getUTCFullYear()));
    }
  }
  return allowed;
}

export function extractNumbers(text: string): string[] {
  const withoutUrls = text.replace(/https?:\/\/\S+/g, " ");
  return (withoutUrls.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
}

function userPrompt(input: ComposeInput): string {
  const facts = {
    firstName: input.firstName,
    city: input.city,
    profileUrl: input.profileUrl,
    claimUrl: input.claimUrl,
    profileViews30d: input.profileViews30d,
    offer: input.step === 3 && input.offer
      ? { ...input.offer, priceAfter: `$${input.offer.priceAfterCents / 100} ${input.offer.currency}/month`, deadline: input.offer.deadline?.toISOString().slice(0, 10) ?? null }
      : null,
  };
  const kind = input.channel === "EMAIL" ? "email (return subject and body)" : input.channel === "LINKEDIN" && input.step === 1 ? "LinkedIn connection-invite note (subject null)" : `${input.channel} direct message (subject null)`;
  return `Write touch ${input.step} of 3 as a ${kind}.\nBRIEF: ${STEP_BRIEF[input.step]}\nFACTS: ${JSON.stringify(facts)}`;
}

export async function composeMessage(llm: Llm, input: ComposeInput): Promise<ComposedMessage> {
  if (input.step === 3 && !input.offer) throw new ComposeRejectedError("touch 3 requires an active offer");
  const raw = await llm.json(schema, "outreach_message", SYSTEM, userPrompt(input));
  const body = raw.body.trim();
  const subject = raw.subject?.trim() || null;

  const allowed = allowedNumbers(input);
  const stray = extractNumbers(`${subject ?? ""} ${body}`).filter((n) => !allowed.has(n));
  if (stray.length > 0) throw new ComposeRejectedError(`numbers not in facts: ${stray.join(", ")}`);

  if (input.channel === "EMAIL") {
    if (!subject) throw new ComposeRejectedError("email needs a subject");
    return { subject, body };
  }

  const isInvite = input.channel === "LINKEDIN" && input.step === 1;
  const full = `${body}\n\n${isInvite ? INVITE_ESCAPE_LINE : ESCAPE_LINE}`;
  if (isInvite && full.length > OUTREACH.linkedinInviteNoteMax) throw new ComposeRejectedError(`invite note is ${full.length} chars`);
  return { subject: null, body: full };
}
