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
import { contentImageUrl } from "./agents/image";

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

/** OpenAI image model used directly (engine GPT_IMAGE_2) and as the fallback when FAL fails. */
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

async function openAiImage(prompt: string, model: string): Promise<GeneratedImage | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 1 });
  if (model === "dall-e-3") {
    const r = await openai.images.generate({ model, prompt: prompt.slice(0, 1000), size: "1792x1024", n: 1, response_format: "b64_json" });
    const b64 = r.data?.[0]?.b64_json;
    return b64 ? { bytes: Buffer.from(b64, "base64"), mimeType: "image/png" } : null;
  }
  // gpt-image-* models: base64 output, landscape, compressed JPEG (~300 KB).
  const r = await openai.images.generate({ model, prompt: prompt.slice(0, 4000), size: "1536x1024", output_format: "jpeg", output_compression: 80 });
  const b64 = r.data?.[0]?.b64_json;
  return b64 ? { bytes: Buffer.from(b64, "base64"), mimeType: "image/jpeg" } : null;
}

async function falImage(prompt: string, engine: string, falKey: string): Promise<GeneratedImage | null> {
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

/**
 * Same engine switch as ai-blog.actions.ts (OpenAI output is fetched as bytes;
 * its URLs expire). A FAL engine that fails or has no key falls back to
 * OpenAI's image model, so a lapsed FAL account doesn't leave posts without covers.
 */
async function generateImage(prompt: string): Promise<GeneratedImage | null> {
  const engine = await imageEngine();
  const falKey = (process.env.FAL_KEY || "").replace(/\\n/g, "").trim();

  if (engine.startsWith("FAL")) {
    if (falKey) {
      try {
        const img = await falImage(prompt, engine, falKey);
        if (img) return img;
      } catch (e) {
        console.warn(`[content-pipeline] ${e instanceof Error ? e.message : e}; falling back to ${OPENAI_IMAGE_MODEL}.`);
      }
    }
    return openAiImage(prompt, OPENAI_IMAGE_MODEL);
  }
  if (engine === "GPT_IMAGE_1") return openAiImage(prompt, "gpt-image-1");
  if (engine === "GPT_IMAGE_2") return openAiImage(prompt, OPENAI_IMAGE_MODEL);
  return openAiImage(prompt, "dall-e-3");
}

/**
 * Generate with OpenAI's image model and store the bytes in ContentImage so the
 * URL never expires. Used by the older Blog Engine for GPT_IMAGE_2 and as its
 * fallback when FAL fails. Returns null when no OpenAI key is configured.
 */
export async function generateStoredOpenAiImage(prompt: string, alt = ""): Promise<string | null> {
  const img = await openAiImage(prompt, OPENAI_IMAGE_MODEL);
  if (!img?.bytes || !img.mimeType) return null;
  const row = await prisma.contentImage.create({ data: { mimeType: img.mimeType, data: img.bytes, alt: alt.slice(0, 300) }, select: { id: true } });
  return contentImageUrl(row.id);
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
