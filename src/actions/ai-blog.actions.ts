"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { prisma } from "@/lib/prisma";
import { getAIEngines } from "@/actions/settings.actions";

const getOpenAI = () => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ZOD SCHEMAS FOR STRUCTURED OUTPUT
const ContentBriefSchema = z.object({
  title: z.string(),
  slug: z.string(),
  angle: z.string(),
  outline: z.array(z.string()),
  metaTitle: z.string(),
  metaDesc: z.string(),
  summary: z.string(),
  faq: z.array(z.string()),
  imagePrompt: z.string()
});

const SocialPostsSchema = z.object({
  linkedin: z.string(),
  twitter: z.string(),
  instagram: z.string()
});

// HELPER: VERIFY ADMIN
async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized");
}

// 1. STRATEGY LAYER
export async function generateBrief(payload: { topic: string; keyword: string; audience: string; category: string; rawContext?: string; articleLength?: string; architectureType?: string }) {
  await verifyAdmin();

  const prompt = `
    You are an elite SEO Strategist for Verixa, a Canadian Immigration platform connecting clients to licensed RCICs.
    Create a Content Brief for an SEO article.
    
    Topic: ${payload.topic}
    Primary Keyword: ${payload.keyword}
    Audience: ${payload.audience}
    Category: ${payload.category}
    Architecture Blueprint: ${payload.architectureType || "SEO"}

    ${payload.rawContext ? `\nSOURCE MATERIAL GIVEN BY USER (MANDATORY FACTS):\n${payload.rawContext.substring(0, 15000)}\n(You MUST base your brief's facts exactly on this material. Do not hallucinate).` : ''}
    
    Rules:
    - Title must be extremely clickable and SEO-optimized.
    - Slug should be clean (e.g., how-to-choose-an-rcic).
    - Image Prompt must describe an authentic, documentary-style news photograph representing the topic (serious, realistic, Reuters/Bloomberg style, NO text).
  `;

  const aiSettings = await getAIEngines();
  // @ts-ignore
  const completion = await getOpenAI().chat.completions.create({
    model: aiSettings.contentModel,
    messages: [
      { role: "system", content: "You are an elite SEO structured data generator. You must return only JSON." },
      { role: "user", content: prompt }
    ],
    response_format: zodResponseFormat(ContentBriefSchema, "content_brief"),
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

// 2. CONTENT LAYER
export async function generateArticle(brief: any) {
  await verifyAdmin();

  const lengthInstruction = 
    brief.articleLength === "SHORT" ? "CRITICAL: Keep this strictly concise and short. Maximum 500 words. Focus only on dense high-value signals. DO NOT hallucinate filler." :
    brief.articleLength === "LONG" ? "CRITICAL: Write a long-form article. Break out into many H2/H3 sub-sections. Expand on nuanced points heavily. Aim for 2500 words." :
    brief.articleLength === "COMPREHENSIVE" ? "CRITICAL: Write an exceptionally comprehensive, encyclopedic guide. You must produce maximum allowable length (3500+ words). Go into granular detail, exhaustive lists, tables, and deep analysis. It MUST be an epic piece of content." :
    "CRITICAL: Write a standard, heavily optimized ~1500 word article.";

  const architectureInstruction = 
    brief.architectureType === "AEO" ? "ANSWER ENGINE OPTIMIZATION (AEO): You must organize content strictly for Siri/Alexa/Voice. Use inverted pyramid style. Start immediately with a blunt, direct answer to the implied query. Use simple sentence structures. Format heavily with Q&A style H2s." :
    brief.architectureType === "GEO" ? "GENERATIVE ENGINE OPTIMIZATION (GEO): You must optimize for Perplexity/SearchGPT. Include incredibly dense facts, citations, markdown tables of statistics, expert commentary blocks, and structured counter-arguments to create high authoritative depth." :
    brief.architectureType === "AIO" ? "AI OVERVIEW OPTIMIZATION (AIO): You must optimize for Google AI SGE. MUST start with a bolded 'TL;DR AI Summary' chunk. Do not use promotional language whatsoever. Be ruthlessly objective, factual, and list-heavy. The tone must be neutral and encyclopedic." :
    "TRADITIONAL SEO: Focus on keyword density, natural H2 hierarchies, readable paragraphs, and standard on-page conversion signals.";

  const prompt = `
    You are a master Content Architect for Verixa, a Canadian Immigration platform connecting clients to licensed RCICs.
    Write a complete Article in strictly valid Markdown format.

    ${brief.rawContext ? `RAW SOURCE MATERIAL: (Use this dataset heavily, do not make up facts)\n${brief.rawContext.substring(0, 25000)}\n\n` : ''}

    Here is the Content Brief:
    Title: ${brief.title}
    Angle: ${brief.angle}
    Outline: ${brief.outline?.join(" > ")}
    Topic Info: ${brief.summary}

    ${lengthInstruction}
    ${architectureInstruction}

    MANDATORY STRUCTURE:
    - Do NOT include an H1 (it will be rendered natively). Start with the Summary or directly into the first H2.
    - Start with a Direct Answer section.
    - Include bullet points, practical steps.
    - IMPORTANT: If explaining data, statistics, requirements, or comparisons, you MUST use a Markdown Data Table.
    - IMPORTANT: Throughout the article, intelligently insert 1, 2, or 3 Mid-Roll Images depending on the length of the text. To insert an image, use the exact syntax: ![IMAGE_PROMPT: <detailed editorial description of the image>](). Be highly descriptive. DO NOT put actual URLs in these tags.
    - End with a strong CTA to find verified consultants on Verixa.
    - Provide 3-5 FAQs at the end.
    
    Rules: Let it be analytical, professional, and trust-focused. No poetic language, no generic filler.
    Return ONLY valid raw Markdown data.
  `;

  const aiSettings = await getAIEngines();
  const completion = await getOpenAI().chat.completions.create({
    model: aiSettings.contentModel,
    messages: [
      { role: "system", content: "You strictly output raw Markdown text." },
      { role: "user", content: prompt }
    ],
  });

  return completion.choices[0].message.content;
}

// 3. SOCIAL LAYER
export async function generateSocials(articleContent: string) {
  await verifyAdmin();

  const prompt = `
    You are an expert Social Repurposer. Extract insights from this article and write 3 platform-specific posts:
    
    1. LinkedIn: 600-1200 chars. Analytical, professional, 1 clear insight. No slang.
    2. Twitter/X: < 280 chars. 1 sharp hook. No hashtag overload.
    3. Instagram: 100-300 words. Emotional, spacing, CTA to link in bio.

    Article Context:
    ${articleContent.substring(0, 3000)}...
  `;

  const aiSettings = await getAIEngines();
  // @ts-ignore
  const completion = await getOpenAI().chat.completions.create({
    model: aiSettings.contentModel,
    messages: [
      { role: "system", content: "You are an elite social media manager. You must return only JSON." },
      { role: "user", content: prompt }
    ],
    response_format: zodResponseFormat(SocialPostsSchema, "social_posts"),
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

// 4. IMAGE LAYER (Dynamic Multi-Engine support)
export async function generateEditorialImage(imagePrompt: string) {
  await verifyAdmin();
  const aiSettings = await getAIEngines();

  try {
    const safePrompt = `Authentic documentary photojournalism, high quality professional news style photography. Subject: ${imagePrompt}. Natural lighting, realistic textures, serious tone, unposed, in the moment. Clean composition. NO TEXT.`;
    
    if (aiSettings.imageModel === "DALL_E_3") {
      const response = await getOpenAI().images.generate({ model: "dall-e-3", prompt: safePrompt.substring(0, 1000), n: 1, size: "1024x1024" });
      if (response.data && response.data[0]?.url) return response.data[0].url;
    } else if (aiSettings.imageModel === "DALL_E_2") {
      const response = await getOpenAI().images.generate({ model: "dall-e-2", prompt: safePrompt.substring(0, 1000), n: 1, size: "1024x1024" });
      if (response.data && response.data[0]?.url) return response.data[0].url;
    } else if (aiSettings.imageModel === "FAL_FLUX_PRO") {
      const res = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
        method: "POST", headers: { "Authorization": `Key ${(process.env.FAL_KEY || "").replace(/\\n/g, "").trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: safePrompt, image_size: "landscape_16_9" })
      });
      if (!res.ok) throw new Error(`FAL_FLUX_PRO failed: ${res.status}`);
      const data = await res.json();
      if (data.images && data.images[0]?.url) return data.images[0].url;
    } else {
      // Default to FLUX_SCHNELL
      const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST", headers: { "Authorization": `Key ${(process.env.FAL_KEY || "").replace(/\\n/g, "").trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: safePrompt, image_size: "landscape_16_9", num_inference_steps: 4 })
      });
      if (!res.ok) throw new Error(`FAL_FLUX_SCHNELL failed: ${res.status}`);
      const data = await res.json();
      if (data.images && data.images[0]?.url) return data.images[0].url;
    }
  } catch (e) {
    console.warn("⚠️ AI Image Generation Failed: ", e);
    return `https://images.unsplash.com/photo-1541462608143-67571c6738dd?auto=format&fit=crop&w=1024&q=80`;
  }
  
  return `https://images.unsplash.com/photo-1541462608143-67571c6738dd?auto=format&fit=crop&w=1024&q=80`;
}

// 4.5. MID-ROLL IMAGE PARSER
export async function processMidRollImages(markdown: string) {
  await verifyAdmin();
  const imgRegex = /!\[IMAGE_PROMPT:\s*(.*?)\]\(\)/g;
  let processed = markdown;
  const matches = [...markdown.matchAll(imgRegex)];
  
  // To avoid FAL rate limits or timeouts, execute prompts sequentially (or small parallel chunks)
  for (const match of matches) {
    const fullMatch = match[0];
    const imagePrompt = match[1];
    try {
      const url = await generateEditorialImage(imagePrompt);
      if (url) {
        processed = processed.replace(fullMatch, `![${imagePrompt}](${url})`);
      } else {
        processed = processed.replace(fullMatch, ""); // Remove if generation failed
      }
    } catch (e) {
      console.error("Failed mid-roll image generation:", e);
      processed = processed.replace(fullMatch, "");
    }
  }

  return processed;
}

// 5. CMS INJECTION LAYER
export async function publishDraftToCMS(data: any) {
  await verifyAdmin();
  const session = await getServerSession(authOptions);

  return prisma.blogPost.create({
    data: {
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      content: data.content,
      category: data.category,
      coverImage: data.coverImage,
      isPublished: true, // we publish it instantly in version 1.1 or keep as draft
      seoTitle: data.metaTitle,
      seoDesc: data.metaDesc,
      imagePrompt: data.imagePrompt,
      socialHooks: JSON.stringify(data.socialHooks),
      authorId: (session?.user as any).id,
    }
  });
}
