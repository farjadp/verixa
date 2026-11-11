import { z } from "zod";
import type { Llm } from "@/lib/content-pipeline/types";
import { OUTREACH } from "./config";
import type { ReplyLabel } from "./types";

const schema = z.object({
  label: z.enum(["negative", "positive", "question", "auto_reply"]),
  confidence: z.number().min(0).max(1),
});

// Opt-out wording that is unambiguous wherever it appears (a signature or pleasantries may follow it).
const OPT_OUT_ANYWHERE = /(?<!\bdon'?t\s)(?<!\bnot\s)\b(stop (contacting|messaging|emailing|writing to|sending)( me)?|unsubscribe( me)?|remove me|take me off|do not (contact|message|email|write)( to)?\s+me|don'?t (contact|message|email|write)( to)?\s+me|please stop\b)/i;
// A short refusal counts only when it is the whole reply (bar punctuation, "thanks" and a sign-off) or is followed by
// another refusal. "No problem", "No worries, send details" or "Not sure yet" are left to the model.
const REFUSAL = /^(?:no(?:[ \t,]+thank[ \t]+you|[ \t,]+thanks?)?|nope|not[ \t]+interested|stop)(?![\p{L}\p{N}'’])/iu;
const FILLER = /^(?:[ \t.,;:!]+|thank[ \t]+you(?![\p{L}])|thanks?(?![\p{L}])|thx(?![\p{L}]))*/iu;
const DASH = /^[ \t]*[-–—]+[ \t]*/;
const NAME_LINE = /^\p{Lu}[\p{L}\p{M}'’.\-]*(?:[ \t]+\p{Lu}[\p{L}\p{M}'’.\-]*){0,3}[ \t]*,?$/u;
const CLOSING_LINE = /^(?:best(?: regards| wishes)?|regards|kind regards|warm regards|many thanks|thanks(?: again)?|thank you|cheers|sincerely|all the best|take care|sent from my [\p{L} ]{1,20})[ \t,.!]*(?:\p{Lu}[\p{L}\p{M}'’.\-]*(?:[ \t]+\p{Lu}[\p{L}\p{M}'’.\-]*){0,3})?$/iu;
const MAX_SIGNOFF_LINES = 5;

/** Nothing but a sign-off: an optional "- Name" on the refusal's line, then a few closing or name lines. */
function isSignOff(rest: string): boolean {
  const [first, ...more] = rest.split("\n");
  const sameLine = first.trim();
  if (sameLine && !(DASH.test(first) && NAME_LINE.test(first.replace(DASH, "").trim()))) return false;
  const lines = more.map((l) => l.trim()).filter(Boolean);
  return lines.length <= MAX_SIGNOFF_LINES && lines.every((l) => NAME_LINE.test(l) || CLOSING_LINE.test(l));
}

function isShortRefusal(text: string, depth = 0): boolean {
  const m = REFUSAL.exec(text);
  if (!m) return false;
  const rest = text.slice(m[0].length).replace(FILLER, "");
  if (!rest.trim()) return true;
  // "No thanks, not interested" / "No - stop": a second refusal after the first.
  if (depth < 3 && isShortRefusal(rest.replace(DASH, "").trimStart(), depth + 1)) return true;
  return isSignOff(rest);
}

/** The deterministic opt-out check the classifier applies before asking the model. */
export function isObviousOptOut(text: string): boolean {
  const t = text.trim().replace(/\r\n?/g, "\n");
  return t.length > 0 && (isShortRefusal(t) || OPT_OUT_ANYWHERE.test(t));
}

const SYSTEM = `Classify a reply to a cold outreach message to an immigration consultant.
negative = declines, asks to stop, annoyed. positive = interested, wants to proceed. question = asks something or is unclear. auto_reply = out-of-office or automated.
Return the label and your confidence 0..1.`;

export interface ReplyHints {
  /** The mail carried an auto-reply header (Auto-Submitted, X-Autoreply, X-Autorespond, Precedence: auto_reply|bulk|junk). */
  autoReply?: boolean;
}

export async function classifyReply(llm: Llm, text: string, hints: ReplyHints = {}): Promise<{ label: ReplyLabel; confidence: number }> {
  const t = text.trim();
  if (!t) return { label: "question", confidence: 0 };
  if (isObviousOptOut(t)) return { label: "negative", confidence: 1 };
  const r = await llm.json(schema, "reply_label", SYSTEM, t.slice(0, 4000));
  // An auto_reply label delays the lead, so a human-written reply mislabelled as one would be ignored: demand more certainty.
  if (r.label === "auto_reply") {
    return hints.autoReply || r.confidence >= OUTREACH.autoReplyMinConfidence ? r : { label: "question", confidence: r.confidence };
  }
  if (r.confidence < OUTREACH.classifierMinConfidence) return { label: "question", confidence: r.confidence };
  return r;
}
