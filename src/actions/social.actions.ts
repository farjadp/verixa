"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----------------------------------------------------------------------------
// ZOD STRUCTURES (Strict Output Enforcement)
// ----------------------------------------------------------------------------

const ExtractionSchema = z.object({
  title: z.string(),
  summary: z.string().describe("2-3 line summary"),
  keyInsights: z.array(z.string()).describe("Exactly 3 key insights"),
  targetAudience: z.string(),
  mainTakeaway: z.string()
});

const HooksSchema = z.object({
  hooks: z.array(z.string()).describe("Exactly 5 curiosity/pain-point hooks"),
  ctas: z.array(z.string()).describe("Exactly 3 call-to-actions")
});

const SocialSchema = z.object({
  linkedin: z.string().describe("Professional, 2-4 short paragraphs, 1 strong idea, soft CTA."),
  x_twitter: z.string().describe("Max 280 chars, sharp hook, no fluff, CTA at end."),
  telegram: z.string().describe("3-5 short informative lines, clear summary, CTA at end.")
});

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized");
}

/**
 * The unified Phase 30 Multi-Format Distribution Engine.
 * Executes the strict 4-Prompt Sequence automatically.
 */
export async function igniteSocialEngine(blogPostId: string) {
  await verifyAdmin();

  const post = await prisma.blogPost.findUnique({ where: { id: blogPostId } });
  if (!post) throw new Error("Blog Post not found.");

  // Check if job exists
  let job = await prisma.socialJob.findUnique({ where: { blogPostId } });
  if (!job) {
    job = await prisma.socialJob.create({ data: { blogPostId, status: "GENERATING" } });
  } else {
    await prisma.socialJob.update({ where: { id: job.id }, data: { status: "GENERATING" } });
  }

  try {
    const rawContent = post.content.substring(0, 10000); // Prevent token overload
    const articleLink = `https://verixa.ca/blog/${post.slug}`;

    // ---------------------------------------------------------
    // PROMPT 1: INPUT NORMALIZER (Extraction)
    // ---------------------------------------------------------
    const extractionPrompt = `
      Analyze the following article and extract:
      - Title
      - 2-3 line summary
      - 3 key insights
      - Target audience
      - Main takeaway
      
      Keep it simple and structured.
      
      Article:
      ${rawContent}
    `;
    
    // @ts-ignore
    const extractionCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "You are a precise data extraction algorithm. You must return only JSON." }, { role: "user", content: extractionPrompt }],
      response_format: zodResponseFormat(ExtractionSchema, "extraction")
    });
    const extractedData = JSON.parse(extractionCompletion.choices[0].message.content || "{}");

    // ---------------------------------------------------------
    // PROMPT 2: HOOK & CTA GENERATOR
    // ---------------------------------------------------------
    const hooksPrompt = `
      Based on this summary and takeaway:
      Summary: ${extractedData?.summary}
      Takeaway: ${extractedData?.mainTakeaway}
      
      Do two things:
      1. Generate 5 DIFFERENT hooks. Focus on curiosity or pain point. Keep it short. No generic phrases.
      2. Generate 3 Call-To-Action (CTA) variations encouraging users to book, compare, or read more on Verixa.
    `;
    
    // @ts-ignore
    const hooksCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "You are an elite copywriter optimizing for click-through rates. You must return only JSON." }, { role: "user", content: hooksPrompt }],
      response_format: zodResponseFormat(HooksSchema, "hooks_ctas")
    });
    const hooksData = JSON.parse(hooksCompletion.choices[0].message.content || "{}");

    // ---------------------------------------------------------
    // PROMPT 3: THE MOTHER PROMPT (Social Gen)
    // ---------------------------------------------------------
    const motherPrompt = `
      You are a content distribution strategist for Verixa, a marketplace for licensed immigration consultants in Canada.
      Your task is to transform a blog article into platform-specific social media posts.
      
      Input:
      - Title: ${extractedData?.title}
      - Summary: ${extractedData?.summary}
      - Key insights: ${extractedData?.keyInsights.join(", ")}
      - Target audience: ${extractedData?.targetAudience}
      - Primary Hook to use: ${hooksData?.hooks[0]}
      - Primary CTA to use: ${hooksData?.ctas[0]}
      - Final Link: ${articleLink}
      
      Output separate versions for LinkedIn, X, and Telegram based on STRICT rules:
      - Different tone for each. Do NOT copy-paste.
      - ALWAYS include the Final Link at the end.
      - LinkedIn: Professional, 2-4 short paragraphs, 1 strong idea.
      - X (Twitter): Max 280 chars, sharp hook, no fluff.
      - Telegram: 3-5 short informative lines, clear summary.
    `;

    // @ts-ignore
    const motherCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "You are an expert Social Publisher. You must return only JSON." }, { role: "user", content: motherPrompt }],
      response_format: zodResponseFormat(SocialSchema, "social_drafts")
    });
    const draftSocials = JSON.parse(motherCompletion.choices[0].message.content || "{}");

    // ---------------------------------------------------------
    // PROMPT 4: QUALITY CONTROLLER
    // ---------------------------------------------------------
    const qcPrompt = `
      Review these generated social posts:
      LinkedIn: ${draftSocials?.linkedin}
      X: ${draftSocials?.x_twitter}
      Telegram: ${draftSocials?.telegram}
      
      Check:
      1. Is tone platform-specific? (LinkedIn=Thoughtful, X=Click, Telegram=Fast summary)
      2. Any generic/robotic language?
      3. Is the CTA present with the link?
      
      Rewrite them silently to improve clarity and impact. Return the final perfected versions instantly.
    `;

    // @ts-ignore
    const qcCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "You are the final Editor-In-Chief. You must return only JSON." }, { role: "user", content: qcPrompt }],
      response_format: zodResponseFormat(SocialSchema, "final_socials")
    });
    const finalSocials = JSON.parse(qcCompletion.choices[0].message.content || "{}");

    // ---------------------------------------------------------
    // Final DB Cache
    // ---------------------------------------------------------
    await prisma.socialJob.update({
      where: { id: job.id },
      data: {
        linkedinCopy: finalSocials?.linkedin,
        twitterCopy: finalSocials?.x_twitter,
        telegramCopy: finalSocials?.telegram,
        hooks: JSON.stringify(hooksData?.hooks || []),
        ctas: JSON.stringify(hooksData?.ctas || []),
        status: "REVIEW"
      }
    });

    return { status: "SUCCESS" };

  } catch (error: any) {
    console.error("Social Engine Error:", error);
    await prisma.socialJob.update({ where: { id: job.id }, data: { status: "FAILED" } });
    throw new Error(error.message || "Pipeline execution failed.");
  }
}

// ----------------------------------------------------------------------------
// UTILITY: Get Social Jobs
// ----------------------------------------------------------------------------
export async function getSocialJobs() {
  await verifyAdmin();
  return prisma.socialJob.findMany({
    include: { blogPost: true },
    orderBy: { createdAt: "desc" }
  });
}

// ----------------------------------------------------------------------------
// UTILITY: Approve Job
// ----------------------------------------------------------------------------
export async function updateSocialJob(jobId: string, data: { linkedinCopy: string, twitterCopy: string, telegramCopy: string, status: string }) {
  await verifyAdmin();
  return prisma.socialJob.update({
    where: { id: jobId },
    data
  });
}
