import { describe, expect, it, vi } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { classifyReply, isObviousOptOut } from "../classifier";

const llm = (label: string, confidence: number): Llm => ({ json: vi.fn(async () => ({ label, confidence }) as never) });

describe("classifyReply", () => {
  it("short-circuits obvious refusals without calling the LLM", async () => {
    const l = llm("positive", 1);
    expect(await classifyReply(l, "No thanks")).toEqual({ label: "negative", confidence: 1 });
    expect(await classifyReply(l, "please STOP")).toEqual({ label: "negative", confidence: 1 });
    expect(l.json).not.toHaveBeenCalled();
  });

  it("catches refusals followed by a signature or pleasantries", async () => {
    const l = llm("positive", 1);
    for (const t of [
      "No thanks.\n\nBest,\nJohn Smith\nRCIC",
      "Thanks, but please remove me from your list.\n\nRegards,\nJane",
      "Hi Farjad,\n\nPlease stop contacting me.\n\nThanks",
      "Hello. Unsubscribe me please.\nCheers",
      "Thank you for reaching out. Do not contact me again.",
      "Not interested, thank you.",
      "Take me off your list.",
    ]) {
      expect(await classifyReply(l, t)).toEqual({ label: "negative", confidence: 1 });
    }
    expect(l.json).not.toHaveBeenCalled();
  });

  it("does not treat a mention inside an interested reply as an opt-out", async () => {
    const l = llm("positive", 0.9);
    expect((await classifyReply(l, "I was not interested before, but your new pricing looks good. Call me.")).label).toBe("positive");
    expect((await classifyReply(l, "Interested! Please don't stop sending updates.")).label).toBe("positive");
    expect(l.json).toHaveBeenCalledTimes(2);
  });

  it("does not short-circuit softer phrasing such as 'not for me, thanks'", async () => {
    const l = llm("negative", 0.9);
    expect(await classifyReply(l, "not for me, thanks")).toEqual({ label: "negative", confidence: 0.9 });
    expect(l.json).toHaveBeenCalledTimes(1);
  });

  it("uses the LLM label when confident", async () => {
    expect(await classifyReply(llm("positive", 0.9), "Sounds interesting, tell me more")).toEqual({ label: "positive", confidence: 0.9 });
  });

  it("falls back to question (human review) when unsure", async () => {
    expect(await classifyReply(llm("negative", 0.4), "hmm maybe later")).toEqual({ label: "question", confidence: 0.4 });
  });

  it("treats empty replies as question", async () => {
    expect((await classifyReply(llm("positive", 1), "   ")).label).toBe("question");
  });
});

describe("short refusals (item 5)", () => {
  it.each([
    "No",
    "no.",
    "No thanks",
    "No thank you!",
    "No, thank you - Ali",
    "No thanks.\n\nJane",
    "Nope",
    "Stop",
    "STOP.",
    "Not interested.",
    "No. Please don't contact me",
    "Not interested, remove me",
    "No thanks, not interested",
    "No, not interested.\n\nBest regards,\nAli Rezaei\nRCIC",
  ])("treats %j as a deterministic refusal", async (t) => {
    const l = llm("positive", 1);
    expect(isObviousOptOut(t)).toBe(true);
    expect(await classifyReply(l, t)).toEqual({ label: "negative", confidence: 1 });
    expect(l.json).not.toHaveBeenCalled();
  });

  it.each([
    "No problem, happy to chat",
    "No worries, send details",
    "No rush",
    "No, I'd like to know more",
    "Not sure yet",
    "No problem.\n\nJane",
    "Nope, sounds good to me",
    "No thanks needed, tell me more",
  ])("leaves %j to the model", async (t) => {
    const l = llm("positive", 0.9);
    expect(isObviousOptOut(t)).toBe(false);
    expect(await classifyReply(l, t)).toEqual({ label: "positive", confidence: 0.9 });
    expect(l.json).toHaveBeenCalledTimes(1);
  });
});

describe("auto_reply confidence (item 5)", () => {
  it("relabels a low-confidence auto_reply as question", async () => {
    expect(await classifyReply(llm("auto_reply", 0.85), "I am away until Monday")).toEqual({ label: "question", confidence: 0.85 });
  });

  it("accepts a high-confidence auto_reply", async () => {
    expect(await classifyReply(llm("auto_reply", 0.95), "I am out of office until Monday")).toEqual({ label: "auto_reply", confidence: 0.95 });
  });

  it("accepts a low-confidence auto_reply when the mail carries an auto-reply header", async () => {
    expect(await classifyReply(llm("auto_reply", 0.5), "Thanks for your email", { autoReply: true })).toEqual({ label: "auto_reply", confidence: 0.5 });
  });

  it("does not let the header override another label", async () => {
    expect(await classifyReply(llm("positive", 0.9), "Tell me more", { autoReply: true })).toEqual({ label: "positive", confidence: 0.9 });
  });
});
