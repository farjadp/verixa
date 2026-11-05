import { describe, expect, it, vi } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { classifyReply } from "../classifier";

const llm = (label: string, confidence: number): Llm => ({ json: vi.fn(async () => ({ label, confidence }) as never) });

describe("classifyReply", () => {
  it("short-circuits obvious refusals without calling the LLM", async () => {
    const l = llm("positive", 1);
    expect(await classifyReply(l, "No thanks")).toEqual({ label: "negative", confidence: 1 });
    expect(await classifyReply(l, "please STOP")).toEqual({ label: "negative", confidence: 1 });
    expect(l.json).not.toHaveBeenCalled();
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
