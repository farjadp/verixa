// ============================================================================
// Content Pipeline — shared dependency contract.
// Every agent receives `PipelineDeps` instead of importing clients directly,
// so tests (and dry runs) inject fakes and never touch OpenAI, the network,
// or social APIs.
// ============================================================================
import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";

export interface Llm {
  /** Structured JSON completion validated against `schema`. */
  json<T>(schema: z.ZodType<T>, name: string, system: string, user: string): Promise<T>;
}

export interface FeedItem {
  title: string;
  link: string;
  isoDate?: string | null;
  snippet?: string | null;
}

export interface GeneratedImage {
  /** Public URL (FAL) or raw bytes (OpenAI b64) to persist in ContentImage. */
  url?: string;
  bytes?: Buffer;
  mimeType?: string;
}

export interface PipelineDeps {
  db: PrismaClient;
  llm: Llm;
  fetchFeed(url: string): Promise<FeedItem[]>;
  fetchHtml(url: string): Promise<string>;
  generateImage(prompt: string): Promise<GeneratedImage | null>;
  revalidate(paths: string[]): void;
  now(): Date;
  log(message: string): void;
}
