// ============================================================================
// Content Pipeline — OpenAI structured-output client (real implementation).
// Never imported by tests; tests inject a fake `Llm`.
// ============================================================================
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import type { Llm } from "./types";

export function createOpenAiLlm(model: string): Llm {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const client = new OpenAI({ apiKey, timeout: 90_000, maxRetries: 1 });

  return {
    async json<T>(schema: z.ZodType<T>, name: string, system: string, user: string): Promise<T> {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: zodResponseFormat(schema, name),
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error(`LLM returned no content for "${name}".`);
      return schema.parse(JSON.parse(content));
    },
  };
}
