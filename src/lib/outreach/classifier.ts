import { z } from "zod";
import type { Llm } from "@/lib/content-pipeline/types";
import { OUTREACH } from "./config";
import type { ReplyLabel } from "./types";

const schema = z.object({
  label: z.enum(["negative", "positive", "question", "auto_reply"]),
  confidence: z.number().min(0).max(1),
});

const OBVIOUS_NO = /^\s*(no\b|nope\b|not interested|stop\b|unsubscribe|remove me|please stop|don'?t (contact|message|email) me)|\b(stop|unsubscribe|remove me)\s*[.!]*\s*$/i;

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
