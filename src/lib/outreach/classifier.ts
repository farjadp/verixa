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
// Short refusals only count at the very start of the reply, so "I was not interested before, but..." is left to the model.
const OPT_OUT_AT_START = /^\s*(no\b|nope\b|not interested|stop\b)/i;
const OBVIOUS_NO = { test: (t: string) => OPT_OUT_AT_START.test(t) || OPT_OUT_ANYWHERE.test(t) };

const SYSTEM = `Classify a reply to a cold outreach message to an immigration consultant.
negative = declines, asks to stop, annoyed. positive = interested, wants to proceed. question = asks something or is unclear. auto_reply = out-of-office or automated.
Return the label and your confidence 0..1.`;

export async function classifyReply(llm: Llm, text: string): Promise<{ label: ReplyLabel; confidence: number }> {
  const t = text.trim();
  if (!t) return { label: "question", confidence: 0 };
  if (OBVIOUS_NO.test(t)) return { label: "negative", confidence: 1 };
  const r = await llm.json(schema, "reply_label", SYSTEM, t.slice(0, 4000));
  if (r.confidence < OUTREACH.classifierMinConfidence) return { label: "question", confidence: r.confidence };
  return r;
}
