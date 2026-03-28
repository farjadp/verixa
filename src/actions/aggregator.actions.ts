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
import { logEvent } from "@/lib/logger";

// Initialize Subsystems
const parser = new Parser({ timeout: 15000 });

// Lazy initialize OpenAI to prevent Next.js from hard-baking the dummy key at build time
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  isDuplicate: z.boolean().describe("True if the content is completely irrelevant or an identical duplicate of something Verixa already covered."),
  originalPublishedDate: z.string().describe("The exact publication date of the original news article found in the raw text, in ISO format. Default to today if missing.")
});

const SocialHookSchema = z.object({
  linkedin: z.string(),
  twitter: z.string(),
  instagram: z.string()
});

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized Access");
  return session;
}

// ----------------------------------------------------------------------------
// LAYER 1 & 2: DISCOVERY & RAW REGISTRY
// ----------------------------------------------------------------------------
export async function syncContentSource(sourceId: string, limit: number = 5) {
  try {
    const session = await verifyAdmin();

    const source = await prisma.contentSource.findUnique({ where: { id: sourceId } });
    if (!source) return { success: false, message: "Source not found." };
    if (!source.enabled) return { success: false, message: "Source disabled." };

    let addedCount = 0;

    if (source.type === "RSS") {
      try {
        const feed = await parser.parseURL(source.url);
        
        const feedLinks = feed.items.map(i => i.link as string).filter(Boolean);
        const existingDocs = await prisma.rawArticle.findMany({
          where: { sourceUrl: { in: feedLinks } },
          select: { sourceUrl: true }
        });
        const existingUrls = new Set(existingDocs.map(d => d.sourceUrl));

        const itemsToProcess = feed.items
          .filter(item => item.link && !existingUrls.has(item.link))
          .slice(0, limit);

        for (const item of itemsToProcess) {
           await prisma.rawArticle.create({
             data: {
               sourceId: source.id,
               sourceUrl: item.link as string,
               title: item.title || "Untitled RSS Item",
               publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
               status: "PENDING"
             }
           });
           addedCount++;
        }
      } catch (e: any) {
        console.error(`RSS parse failed for ${source.url}`, e);
        return { success: false, message: `Failed to parse RSS feed: ${e.message}` };
      }
    } else if (source.type === "WEB_SCRAPE") {
      try {
        let currentUrl = source.url;
        let pagesCrawled = 0;
        const MAX_PAGES = 5; // Circuit breaker to prevent infinite loops / timeouts

        while (addedCount < limit && pagesCrawled < MAX_PAGES && currentUrl) {
          pagesCrawled++;
          console.log(`[Oracle] Syncing Page ${pagesCrawled} Queue for ${source.name}... URL: ${currentUrl}`);

          const htmlRes = await fetch(currentUrl, {
            headers: { 'User-Agent': 'VerixaBot/2.0 OracleDeepSync' },
            signal: AbortSignal.timeout(15000)
          });
          if (!htmlRes.ok) break;

          const htmlText = await htmlRes.text();
          const $ = cheerio.load(htmlText);
          
          const extractedLinks: { title: string, link: string }[] = [];
          
          $("a").each((_, el) => {
            const href = $(el).attr("href");
            const title = $(el).text().replace(/\s+/g, ' ').trim();
            
            const urlLower = href ? href.toLowerCase() : "";
            if (
              href && 
              href.length > 30 && 
              href.includes("-") && 
              title.length > 15 &&
              !urlLower.includes("search") &&
              !urlLower.includes("results") &&
              !urlLower.includes("archive") &&
              !urlLower.includes("tag") &&
              !urlLower.includes("category") &&
              !title.toLowerCase().includes("all news")
            ) {
              try {
                const urlObj = new URL(href, currentUrl);
                if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
                  extractedLinks.push({ title, link: urlObj.href });
                }
              } catch (e) {}
            }
          });

          const uniqueMap = new Map();
          for (const item of extractedLinks) {
            if (!uniqueMap.has(item.link)) uniqueMap.set(item.link, item);
          }
          const uniqueLinks = Array.from(uniqueMap.values());

          const feedLinks = uniqueLinks.map(i => i.link);
          const existingDocs = await prisma.rawArticle.findMany({
            where: { sourceUrl: { in: feedLinks } },
            select: { sourceUrl: true }
          });
          const existingUrls = new Set(existingDocs.map(d => d.sourceUrl));

          const itemsToProcess = uniqueLinks
            .filter(item => !existingUrls.has(item.link))
            .slice(0, limit - addedCount);

          for (const item of itemsToProcess) {
            await prisma.rawArticle.create({
              data: {
                sourceId: source.id,
                sourceUrl: item.link,
                title: item.title,
                publishedAt: new Date(),
                status: "PENDING"
              }
            });
            addedCount++;
          }

          if (addedCount < limit) {
             // Look for pagination
             let nextHref = $("a[rel='next'], a.next, a.page-link-next").first().attr("href");
             
             if (!nextHref) {
               // Fallback: look for generic text
               const validTexts = ["next", "older", "next page", "بعدی", "پسین"];
               $("a").each((_, el) => {
                 const t = $(el).text().toLowerCase().trim();
                 if (!nextHref && validTexts.includes(t)) {
                   nextHref = $(el).attr("href");
                 }
               });
             }

             if (nextHref) {
               try {
                 currentUrl = new URL(nextHref, currentUrl).href;
               } catch (e) {
                 currentUrl = "";
               }
             } else {
               currentUrl = ""; // No more pages found
             }
          } else {
             break;
          }
        }
      } catch (e: any) {
        console.error(`WEB_SCRAPE extraction failed for ${source.url}`, e);
        return { success: false, message: `Failed to scrape website: ${e.message}` };
      }
    }

    await prisma.contentSource.update({
      where: { id: source.id },
      data: { lastCheckedAt: new Date() }
    });

    await logEvent({
      userId: (session.user as any)?.id,
      role: "ADMIN",
      action: "AGGREGATOR_SYNC_SUCCESS",
      details: { sourceId, addedCount }
    });

    return { success: true, addedCount, message: `Successfully registered ${addedCount} new URLs.` };
  } catch(err: any) {
    console.error("syncContentSource Error:", err);
    await logEvent({ action: "AGGREGATOR_SYNC_ERROR", details: { sourceId, error: err.message } });
    return { success: false, message: err.message };
  }
}

// ----------------------------------------------------------------------------
// LAYER 3 & 4: EXTRACTION & DEDUPLICATION ORCHESTRATOR
// ----------------------------------------------------------------------------
export async function processPendingRawArticle(rawArticleId: string, autoPublish: boolean = false) {
  try {
    const session = await verifyAdmin();

    const raw = await prisma.rawArticle.findUnique({ 
      where: { id: rawArticleId },
      include: { source: true } 
    });
    if (!raw) return { success: false, message: "Raw Article not found." };
    if (raw.status !== "PENDING") return { success: false, message: "Article is not PENDING processing." };

    // Update Status to Generating
    await prisma.rawArticle.update({ where: { id: raw.id }, data: { status: "GENERATING" } });

    // 1. EXTRACT HTML TEXT
    let extractedText = raw.extractedText;
    if (!extractedText) {
      try {
        const res = await fetch(raw.sourceUrl, {
           headers: { 'User-Agent': 'VerixaBot/1.0 Oracle/1.0' },
           signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) throw new Error("HTTP Status: " + res.status);
        const html = await res.text();
        const $ = cheerio.load(html);
        $("script, style, nav, footer, header, aside").remove();
        extractedText = $("body").text().replace(/\s+/g, " ").trim();
        extractedText = extractedText.substring(0, 20000); // Prevent context window overload
        
        await prisma.rawArticle.update({ 
          where: { id: raw.id }, 
          data: { rawHtml: html.substring(0, 5000), extractedText } 
        });
      } catch (e: any) {
        await prisma.rawArticle.update({ where: { id: raw.id }, data: { status: "FAILED" } });
        return { success: false, message: "HTML Extraction failed: " + (e.message || raw.sourceUrl) };
      }
    }

    if (!extractedText || extractedText.length < 200) {
        await prisma.rawArticle.update({ where: { id: raw.id }, data: { status: "FAILED" } });
        return { success: false, message: "Extracted text too short or empty." };
    }

    // 2. GENERATE STRATEGY BRIEF (DEDUPE & CLASSIFY)
    const recentPosts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { title: true, summary: true }
    });
    const recentPostsText = recentPosts.map(p => `- ${p.title}: ${p.summary}`).join("\n");

    const briefPrompt = `
      Analyze this raw extracted article from ${raw.source.name}.
      Title: ${raw.title}
      Text: ${extractedText.substring(0, 4000)}...

      CRITICAL CROSS-SOURCE DEDUPLICATION CHECK:
      Here are the 15 most recently published posts on our platform:
      ${recentPostsText}

      Compare the core facts and key events of this new extracted text against our recent posts.
      If this raw text is reporting on the EXACT SAME general news event or policy update as ANY of the recent posts above (>50% factual similarity in coverage), YOU MUST set isDuplicate to true. 
      Furthermore, if this text is completely irrelevant to Canadian Immigration or just marketing noise, set isDuplicate to true.
      We absolutely do NOT want to publish similar news twice.

      If it is a genuinely NEW event NOT listed above, determine a unique new angle for the Verixa Platform.
      Additionally, scan the raw text carefully to extract the true original publication date of the press release/article. Ensure originalPublishedDate is set.
    `;

    // @ts-ignore
    const briefCompletion = await getOpenAI().chat.completions.create({
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
      return { success: true, status: "DUPLICATE", message: "Content marked as irrelevant or duplicate." };
    }

    // 3. GENERATE REWRITTEN MARKDOWN WITH INTERNAL LINKS & SOURCES
    const articlePrompt = `
      Using the brief provided below, rewrite the raw extracted text into an exceptionally well-structured, AEO/GEO optimized Markdown article.
      MANDATORY REQUIREMENTS:
      - Never plagiarize. Synthesize and reframe fundamentally.
      - Start immediately with standard H2/H3 tags (no H1).
      - Provide a "Direct Answer" summary at the top.
      - IMPORTANT: You MUST include at least one professional visual formatting block such as a Markdown Data Table or an intricate bulleted 'Infographic Summary' to make the article highly engaging.
      - IMPORTANT: Throughout the article, intelligently insert 1, 2, or 3 Mid-Roll Images depending on the length of the text. To insert an image, use the exact syntax: ![IMAGE_PROMPT: <detailed editorial description of the image>](). Be highly descriptive. DO NOT put actual URLs in these tags.
      - At the VERY END of the article, include exactly this Markdown disclaimer block to credit the source:
        
        ---
        *This intelligence briefing was automatically generated. The original press release was published on **\${brief.originalPublishedDate || new Date().toISOString().split('T')[0]}** by **${raw.source.name}** and can be verified **[here](${raw.sourceUrl})**.*

      - Always include a high-converting Call-to-Action BEFORE the disclaimer, to manually book an RCIC on Verixa.

      Brief Strategy:
      ${JSON.stringify(brief, null, 2)}
      
      Raw Text:
      ${extractedText.substring(0, 10000)}
    `;

    const articleCompletion = await getOpenAI().chat.completions.create({
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
    const socialCompletion = await getOpenAI().chat.completions.create({
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
    const officialDate = brief?.originalPublishedDate ? new Date(brief.originalPublishedDate) : new Date();
    
    const blogPost = await prisma.blogPost.create({
      data: {
        title: brief?.title || raw.title || "Autogenerated News",
        slug: brief?.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `auto-${Date.now()}`,
        summary: brief?.summary || "",
        content: finalMarkdown || "",
        category: brief?.category || "UPDATES_POLICY",
        coverImage: imageUrl,
        publishedAt: isNaN(officialDate.getTime()) ? new Date() : officialDate,
        isPublished: autoPublish, // LIVE PUBLISH ALLOWED VIA AUTO_PILOT
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

    await logEvent({
      userId: (session.user as any)?.id,
      role: "ADMIN",
      action: "AGGREGATOR_PROCESS_SUCCESS",
      details: { rawArticleId, blogPostId: blogPost.id }
    });

    return { success: true, status: "SUCCESS", articleId: blogPost.id, message: "AI Extracted and Generated Successfully." };
  } catch (err: any) {
    console.error("processPendingRawArticle Error:", err);
    await prisma.rawArticle.update({
       where: { id: rawArticleId },
       data: { status: "FAILED" }
    }).catch(() => null); // Ensure safety if row doesn't exist etc
    
    const session = await getServerSession(authOptions).catch(() => null);
    await logEvent({
      userId: (session?.user as any)?.id,
      role: "ADMIN",
      action: "AGGREGATOR_PROCESS_ERROR",
      details: { rawArticleId, error: err.message }
    });
    return { success: false, status: "FAILED", message: err.message };
  }
}

// ----------------------------------------------------------------------------
// UTILITY LOGIC FOR DASHBOARD (CRUD)
// ----------------------------------------------------------------------------
export async function getSources() {
  await verifyAdmin();
  return prisma.contentSource.findMany({ orderBy: { createdAt: "desc" } });
}

export async function addSource(data: { name: string; url: string; type: string }) {
  try {
    const session = await verifyAdmin();
    const source = await prisma.contentSource.create({ data: { ...data, enabled: true, trustScore: 100 } });
    await logEvent({ userId: (session.user as any)?.id, role: "ADMIN", action: "AGGREGATOR_SOURCE_ADDED", details: { data } });
    return { success: true, source, message: "Source added." };
  } catch (err: any) {
    console.error("addSource Error:", err);
    const session = await getServerSession(authOptions).catch(() => null);
    await logEvent({ userId: (session?.user as any)?.id, role: "ADMIN", action: "AGGREGATOR_SOURCE_ERROR", details: { data, error: err.message } });
    return { success: false, message: err.message };
  }
}

export async function deleteSource(id: string) {
  try {
    const session = await verifyAdmin();
    // Delete raw articles associated with this source first due to foreign keys, or rely on Cascade if setup
    await prisma.rawArticle.deleteMany({ where: { sourceId: id } });
    await prisma.contentSource.delete({ where: { id } });
    
    await logEvent({ userId: (session.user as any)?.id, role: "ADMIN", action: "AGGREGATOR_SOURCE_DELETED", details: { id } });
    return { success: true, message: "Source and its raw articles remote cleaned." };
  } catch (err: any) {
    console.error("deleteSource Error:", err);
    return { success: false, message: err.message };
  }
}

// ----------------------------------------------------------------------------
// LAYER 7: 1-CLICK AUTONOMOUS DEPLOYMENT ENGINE (AUTO-PILOT)
// ----------------------------------------------------------------------------
export async function executeAutoPilot(limitPerSource: number = 10) {
  try {
    const session = await verifyAdmin();
    
    // 1. Sync all active nodes
    const activeSources = await prisma.contentSource.findMany({ where: { enabled: true } });
    let totalSynced = 0;
    
    for (const src of activeSources) {
      const syncRes = await syncContentSource(src.id, limitPerSource);
      if (syncRes.success) {
        totalSynced += (syncRes.addedCount || 0);
      }
    }

    // 2. Fetch the updated queue
    // We also reset any stuck "GENERATING" state from previous Vercel timeouts
    await prisma.rawArticle.updateMany({
       where: { status: "GENERATING" },
       data: { status: "PENDING" }
    });

    const pendingArticles = await prisma.rawArticle.findMany({
      where: { status: "PENDING" },
      orderBy: { publishedAt: "desc" },
      take: limitPerSource * activeSources.length
    });

    let successCount = 0;
    let failedCount = 0;

    // 3. Process sequentially strictly to preserve Rate Limits and API stability
    for (const article of pendingArticles) {
      const compileRes = await processPendingRawArticle(article.id, true); // true = autoPublish LIVE
      if (compileRes.success && compileRes.status === "SUCCESS") {
         successCount++;
      } else {
         failedCount++;
      }
    }

    await logEvent({ 
      userId: (session.user as any)?.id, 
      role: "ADMIN", 
      action: "AUTO_PILOT_COMPLETED", 
      details: { totalSynced, successCount, failedCount } 
    });

    return { 
      success: true, 
      message: `Auto-Pilot sequence complete. Synced ${totalSynced} raw items. Generated & Published ${successCount} articles.` 
    };
  } catch(err: any) {
    console.error("AutoPilot Error:", err);
    return { success: false, message: "AutoPilot sequence failed catastrophically: " + err.message };
  }
}
