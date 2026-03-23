"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { processMidRollImages } from "@/actions/ai-blog.actions";

// Initialize Subsystems
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-build-dummy" });
const parser = new Parser();

// Validation Schemas
const AggregatedBriefSchema = z.object({
  title: z.string().describe("SEO-optimized, clickable, and non-plagiarized title."),
  slug: z.string(),
  angle: z.string().describe("The unique perspective we are adding to outrank the original source."),
  metaTitle: z.string(),
  metaDesc: z.string().max(160),
  summary: z.string(),
  category: z.enum(["IMMIGRATION_GUIDES", "CONSULTANT_INSIGHTS", "CASE_BASED_CONTENT", "UPDATES_POLICY"]),
  faq: z.array(z.string()),
  imagePrompt: z.string().describe("A prompt for FAL AI Flux Pro. Must be editorial, NO text, high resolution."),
  isDuplicate: z.boolean().describe("True if the content is completely irrelevant or an identical duplicate of something Verixa already covered.")
});

const SocialHookSchema = z.object({
  linkedin: z.string(),
  twitter: z.string(),
  instagram: z.string()
});

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized Access");
}

// ----------------------------------------------------------------------------
// LAYER 1 & 2: DISCOVERY & RAW REGISTRY
// ----------------------------------------------------------------------------
export async function syncContentSource(sourceId: string) {
  await verifyAdmin();

  const source = await prisma.contentSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Source not found.");
  if (!source.enabled) return { status: "skipped", message: "Source disabled." };

  let addedCount = 0;

  if (source.type === "RSS") {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items) {
        if (!item.link) continue;
        
        // URL Filtering: Check if already exists in RawArticle
        const exists = await prisma.rawArticle.findUnique({ where: { sourceUrl: item.link } });
        if (!exists) {
           await prisma.rawArticle.create({
             data: {
               sourceId: source.id,
               sourceUrl: item.link,
               title: item.title || "Untitled RSS Item",
               publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
               status: "PENDING"
             }
           });
           addedCount++;
        }
      }
    } catch (e: any) {
      console.error(`RSS parse failed for ${source.url}`, e);
      throw new Error(`Failed to parse RSS feed: ${e.message}`);
    }
  }

  await prisma.contentSource.update({
    where: { id: source.id },
    data: { lastCheckedAt: new Date() }
  });

  return { addedCount, message: `Successfully registered ${addedCount} new URLs.` };
}

// ----------------------------------------------------------------------------
// LAYER 3 & 4: EXTRACTION & DEDUPLICATION ORCHESTRATOR
// ----------------------------------------------------------------------------
export async function processPendingRawArticle(rawArticleId: string) {
  await verifyAdmin();

  const raw = await prisma.rawArticle.findUnique({ 
    where: { id: rawArticleId },
    include: { source: true } 
  });
  if (!raw) throw new Error("Raw Article not found.");
  if (raw.status !== "PENDING") throw new Error("Article is not PENDING processing.");

  // Update Status to Generating
  await prisma.rawArticle.update({ where: { id: raw.id }, data: { status: "GENERATING" } });

  // 1. EXTRACT HTML TEXT
  let extractedText = raw.extractedText;
  if (!extractedText) {
    try {
      const res = await fetch(raw.sourceUrl);
      const html = await res.text();
      const $ = cheerio.load(html);
      $("script, style, nav, footer, header, aside").remove();
      extractedText = $("body").text().replace(/\s+/g, " ").trim();
      extractedText = extractedText.substring(0, 20000); // Prevent context window overload
      
      await prisma.rawArticle.update({ 
        where: { id: raw.id }, 
        data: { rawHtml: html.substring(0, 5000), extractedText } 
      });
    } catch (e) {
      await prisma.rawArticle.update({ where: { id: raw.id }, data: { status: "FAILED" } });
      throw new Error("HTML Extraction failed: " + raw.sourceUrl);
    }
  }

  if (!extractedText || extractedText.length < 200) {
      await prisma.rawArticle.update({ where: { id: raw.id }, data: { status: "FAILED" } });
      throw new Error("Extracted text too short or empty.");
  }

  // 2. GENERATE STRATEGY BRIEF (DEDUPE & CLASSIFY)
  const briefPrompt = `
    Analyze this raw extracted article from ${raw.source.name}.
    Title: ${raw.title}
    Text: ${extractedText.substring(0, 4000)}...

    Determine a unique new angle for the Verixa Immigration Platform.
    If this is completely irrelevant to Canadian Immigration, set isDuplicate to true.
  `;

  // @ts-ignore
  const briefCompletion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an elite SEO Strategist checking for deduplication and building extraction briefs. You must return only JSON." },
      { role: "user", content: briefPrompt }
    ],
    response_format: zodResponseFormat(AggregatedBriefSchema, "brief"),
  });
  const brief = JSON.parse(briefCompletion.choices[0].message.content || "{}");

  if (brief?.isDuplicate) {
    await prisma.rawArticle.update({ where: { id: raw.id }, data: { status: "DUPLICATE" } });
    return { status: "DUPLICATE", message: "Content marked as irrelevant or duplicate." };
  }

  // 3. GENERATE REWRITTEN MARKDOWN WITH INTERNAL LINKS & SOURCES
  const articlePrompt = `
    Using the brief provided below, rewrite the raw extracted text into an exceptionally well-structured, AEO/GEO optimized Markdown article.
    MANDATORY REQUIREMENTS:
    - Never plagiarize. Synthesize and reframe fundamentally.
    - Start immediately with standard H2/H3 tags (no H1).
    - Provide a "Direct Answer" summary at the top.
    - IMPORTANT: If explaining data, statistics, requirements, or comparisons, you MUST use a Markdown Data Table.
    - IMPORTANT: Throughout the article, intelligently insert 1, 2, or 3 Mid-Roll Images depending on the length of the text. To insert an image, use the exact syntax: ![IMAGE_PROMPT: <detailed editorial description of the image>](). Be highly descriptive. DO NOT put actual URLs in these tags.
    - At the VERY END of the article, include a Markdown Source Attribution block:
      "### Sources & References \n - [${raw.source.name}](${raw.sourceUrl})"
    - Always include a high-converting Call-to-Action to manually book an RCIC on Verixa.

    Brief Strategy:
    ${JSON.stringify(brief, null, 2)}
    
    Raw Text:
    ${extractedText.substring(0, 10000)}
  `;

  const articleCompletion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an elite, analytical immigration writer. Output perfectly formatted Markdown." },
      { role: "user", content: articlePrompt }
    ]
  });
  let finalMarkdown = articleCompletion.choices[0].message.content || "";
  finalMarkdown = await processMidRollImages(finalMarkdown);

  // 4. GENERATE SOCIAL POSTS
  const socialPrompt = `Create 3 platform-specific posts for this new article focusing on the angle: ${brief?.angle}. \n\n Article snippet: \n ${finalMarkdown?.substring(0, 3000)}`;
  // @ts-ignore
  const socialCompletion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: "You must return only JSON." }, { role: "user", content: socialPrompt }],
    response_format: zodResponseFormat(SocialHookSchema, "socials"),
  });
  const socials = JSON.parse(socialCompletion.choices[0].message.content || "{}");

  // 5. GENERATE FAL EDITORIAL IMAGE
  let imageUrl = "";
  try {
    const safePrompt = `Professional editorial photography, highly detailed, photorealistic, 8k resolution, cinematic lighting. Subject: ${brief?.imagePrompt}. Clean, uncluttered composition. NO TEXT, NO WATERMARKS, NO CARTOONS, NO ILLUSTRATIONS.`;
    const res = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: safePrompt, image_size: "landscape_16_9", num_images: 1, safety_tolerance: "2" })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.images && data.images[0]?.url) imageUrl = data.images[0].url;
    }
  } catch(e) { console.error("FAL Error in auto-scraper:", e); }

  // 6. DB INJECTION (CMS DRAFT)
  const blogPost = await prisma.blogPost.create({
    data: {
      title: brief?.title || raw.title || "Autogenerated News",
      slug: brief?.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `auto-${Date.now()}`,
      summary: brief?.summary || "",
      content: finalMarkdown || "",
      category: brief?.category || "UPDATES_POLICY",
      coverImage: imageUrl,
      isPublished: false, // DRAFT MODE MANDATORY FOR AUTO/BACKFILL
      seoTitle: brief?.metaTitle,
      seoDesc: brief?.metaDesc,
      imagePrompt: brief?.imagePrompt,
      socialHooks: JSON.stringify(socials),
    }
  });

  // Finalize Status
  await prisma.rawArticle.update({
    where: { id: raw.id },
    data: { status: "PROCESSED" }
  });

  return { status: "SUCCESS", articleId: blogPost.id, message: "AI Extracted and Generated Successfully." };
}

// ----------------------------------------------------------------------------
// UTILITY LOGIC FOR DASHBOARD (CRUD)
// ----------------------------------------------------------------------------
export async function getSources() {
  await verifyAdmin();
  return prisma.contentSource.findMany({ orderBy: { createdAt: "desc" } });
}

export async function addSource(data: { name: string; url: string; type: string }) {
  await verifyAdmin();
  return prisma.contentSource.create({ data: { ...data, enabled: true, trustScore: 100 } });
}
