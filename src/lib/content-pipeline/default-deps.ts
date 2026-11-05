// ============================================================================
// Content Pipeline — production dependencies.
// The only module that touches OpenAI, FAL, the network and Next's cache.
// Tests never import this file. It contains no social/email publishing code.
// ============================================================================
import OpenAI from "openai";
import Parser from "rss-parser";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOpenAiLlm } from "./llm";
import { safeFetchText } from "./net-guard";
import type { FeedItem, GeneratedImage, Llm, PipelineDeps } from "./types";

const USER_AGENT = "VerixaContentBot/1.0 (+https://www.getverixa.com)";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_FEED_BYTES = 5_000_000;

/** SSRF-guarded GET: public http(s) hosts only, every redirect re-checked, body capped while streaming. */
async function fetchHtml(url: string): Promise<string> {
  return safeFetchText(url, {
    maxBytes: MAX_HTML_BYTES,
    timeoutMs: FETCH_TIMEOUT_MS,
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
  });
}

const parser = new Parser();

async function fetchFeed(url: string): Promise<FeedItem[]> {
  // Fetch through the guard, then parse; rss-parser's own parseURL would bypass it.
  const xml = await safeFetchText(url, {
    maxBytes: MAX_FEED_BYTES,
    timeoutMs: FETCH_TIMEOUT_MS,
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
  });
  const feed = await parser.parseString(xml);
  return (feed.items || []).map((i) => ({
    title: i.title || "",
    link: i.link || "",
    isoDate: i.isoDate ?? null,
    snippet: i.contentSnippet || i.summary || null,
  }));
}

async function imageEngine(): Promise<string> {
  const row = await prisma.platformSetting.findUnique({ where: { key: "aiImageModel" } });
  return row?.value || "FAL_FLUX_SCHNELL";
}

/** Same engine switch as ai-blog.actions.ts, but OpenAI output is fetched as bytes (its URLs expire). */
async function generateImage(prompt: string): Promise<GeneratedImage | null> {
  const engine = await imageEngine();
  const falKey = (process.env.FAL_KEY || "").replace(/\\n/g, "").trim();

  if (engine.startsWith("FAL") && falKey) {
    const endpoint = engine === "FAL_FLUX_PRO" ? "https://fal.run/fal-ai/flux-pro/v1.1" : "https://fal.run/fal-ai/flux/schnell";
    const body = engine === "FAL_FLUX_PRO" ? { prompt, image_size: "landscape_16_9" } : { prompt, image_size: "landscape_16_9", num_inference_steps: 4 };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`FAL image generation failed: HTTP ${res.status}`);
    const data = (await res.json()) as { images?: { url?: string }[] };
    return data.images?.[0]?.url ? { url: data.images[0].url } : null;
  }

  if (!process.env.OPENAI_API_KEY) return null;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000, maxRetries: 1 });

  if (engine === "GPT_IMAGE_1") {
    const r = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt.slice(0, 4000),
      size: "1536x1024",
      output_format: "jpeg",
      output_compression: 80,
    });
    const b64 = r.data?.[0]?.b64_json;
    return b64 ? { bytes: Buffer.from(b64, "base64"), mimeType: "image/jpeg" } : null;
  }

  const r = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt.slice(0, 1000),
    size: "1792x1024",
    n: 1,
    response_format: "b64_json",
  });
  const b64 = r.data?.[0]?.b64_json;
  return b64 ? { bytes: Buffer.from(b64, "base64"), mimeType: "image/png" } : null;
}

export async function createDefaultDeps(): Promise<PipelineDeps> {
  const modelRow = await prisma.platformSetting.findUnique({ where: { key: "aiContentModel" } });
  let llm: Llm | null = null; // created on first use, so steps that don't need OpenAI work without a key
  return {
    db: prisma,
    llm: {
      json: (schema, name, system, user) => (llm ??= createOpenAiLlm(modelRow?.value || "gpt-4o")).json(schema, name, system, user),
    },
    fetchFeed,
    fetchHtml,
    generateImage,
    revalidate: (paths) => {
      for (const p of paths) {
        try {
          revalidatePath(p);
        } catch {
          /* outside a request scope */
        }
      }
    },
    now: () => new Date(),
    log: (m) => console.log(`[content-pipeline] ${m}`),
  };
}
