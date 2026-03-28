"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { prisma } from "@/lib/prisma";

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
export async function generateBrief(payload: { topic: string; keyword: string; audience: string; category: string }) {
  await verifyAdmin();

  const prompt = `
    You are an elite SEO Strategist for Verixa, a Canadian Immigration platform connecting clients to licensed RCICs.
    Create a Content Brief for an SEO article.
    
    Topic: ${payload.topic}
    Primary Keyword: ${payload.keyword}
    Audience: ${payload.audience}
    Category: ${payload.category}
    
    Rules:
    - Title must be extremely clickable and SEO-optimized.
    - Slug should be clean (e.g., how-to-choose-an-rcic).
    - Image Prompt must describe an Editorial, clean, professional landscape photo (NO text, NO cartoons, NO messy elements).
  `;

  // @ts-ignore
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an elite SEO structured data generator. You must return only JSON." },
      { role: "user", content: prompt }
    ],
    response_format: zodResponseFormat(ContentBriefSchema, "content_brief"),
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

// 2. CONTENT LAYER
export async function generateArticle(brief: z.infer<typeof ContentBriefSchema>) {
  await verifyAdmin();

  const prompt = `
    You are a master SEO Writer for Verixa, a Canadian Immigration platform connecting clients to licensed RCICs.
    Write a complete SEO Article in strictly valid Markdown format.

    Here is the Content Brief:
    ${JSON.stringify(brief, null, 2)}

    MANDATORY STRUCTURE:
    - Do NOT include an H1 (it will be rendered natively). Start with the Summary or directly into the first H2.
    - Start with a Direct Answer section.
    - Include bullet points, practical steps.
    - IMPORTANT: If explaining data, statistics, requirements, or comparisons, you MUST use a Markdown Data Table.
    - IMPORTANT: Throughout the article, intelligently insert 1, 2, or 3 Mid-Roll Images depending on the length of the text. To insert an image, use the exact syntax: ![IMAGE_PROMPT: <detailed editorial description of the image>](). Be highly descriptive (e.g. "Minimalist 3D architectural rendering of a Canadian passport"). DO NOT put actual URLs in these tags.
    - End with a strong CTA to find verified consultants on Verixa.
    - Provide 3-5 FAQs at the end.
    
    Rules: Let it be analytical, professional, and trust-focused. No poetic language, no generic filler.
    Return ONLY valid raw Markdown data.
  `;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
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

  // @ts-ignore
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an elite social media manager. You must return only JSON." },
      { role: "user", content: prompt }
    ],
    response_format: zodResponseFormat(SocialPostsSchema, "social_posts"),
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

// 4. IMAGE LAYER (fal.ai FLUX Pro)
export async function generateEditorialImage(imagePrompt: string) {
  await verifyAdmin();

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) throw new Error("Missing FAL_KEY env variable");

  // Enhancing the prompt for pure editorial safety
  const safePrompt = `Professional editorial photography, highly detailed, photorealistic, 8k resolution, cinematic lighting. Subject: ${imagePrompt}. Clean, uncluttered composition. NO TEXT.`;

  const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      "Authorization": `Key ${FAL_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: safePrompt,
      image_size: "landscape_16_9",
      num_images: 1
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("FAL API Error:", err);
    throw new Error("Failed to generate image via fal.ai." + err);
  }

  const data = await res.json();
  if (data.images && data.images[0]?.url) {
    return data.images[0].url;
  }
  
  throw new Error("Invalid response from fal.ai image generation.");
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
