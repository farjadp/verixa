// ============================================================================
// Agent 6 — Cover image
// Builds a safe documentary-style prompt (same style as ai-blog.actions.ts),
// generates via deps.generateImage, and persists bytes to ContentImage so the
// post gets a durable, crawlable URL. Image failure never blocks a draft.
// ============================================================================
import type { PipelineDeps } from "../types";
import { getSiteUrl } from "../seo";

export function buildImagePrompt(subject: string): string {
  return [
    "Authentic documentary photojournalism, professional editorial news photography.",
    `Subject: ${subject.replace(/\s+/g, " ").trim().slice(0, 600)}.`,
    "Canadian setting, natural lighting, realistic textures, serious tone, clean composition.",
    "Show objects, documents, buildings or places; any people are anonymous, seen from behind or out of focus.",
    "NO text, NO letters, NO logos, NO flags, NO uniforms, NO police, border or government officers or officials, NO judges, NO identifiable real people.",
  ].join(" ");
}

export function contentImageUrl(id: string): string {
  return `${getSiteUrl()}/api/content-image/${id}`;
}

export interface CoverImageResult {
  url: string | null;
  alt: string;
  error?: string;
}

export async function createCoverImage(deps: PipelineDeps, input: { subject: string; alt: string }): Promise<CoverImageResult> {
  try {
    const img = await deps.generateImage(buildImagePrompt(input.subject));
    if (!img) return { url: null, alt: input.alt, error: "No image engine configured." };
    if (img.bytes && img.mimeType) {
      const row = await deps.db.contentImage.create({
        data: { mimeType: img.mimeType, data: img.bytes, alt: input.alt },
        select: { id: true },
      });
      return { url: contentImageUrl(row.id), alt: input.alt };
    }
    if (img.url && /^https:\/\//.test(img.url)) return { url: img.url, alt: input.alt };
    return { url: null, alt: input.alt, error: "Image engine returned no usable output." };
  } catch (e) {
    return { url: null, alt: input.alt, error: e instanceof Error ? e.message : String(e) };
  }
}
