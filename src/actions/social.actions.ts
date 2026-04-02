"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const ExtractionSchema = z.object({
  title: z.string(),
  summary: z.string().describe("2-3 line summary in English"),
  summaryFa: z.string().describe("2-3 line summary in Persian/Farsi"),
  keyInsights: z.array(z.string()).describe("Exactly 3 key insights"),
  hashtags: z.array(z.string()).describe("6-10 relevant hashtags without # symbol, e.g. CanadaImmigration"),
  targetAudience: z.string(),
  mainTakeaway: z.string(),
});

const HooksSchema = z.object({
  hooks: z.array(z.string()).describe("Exactly 5 curiosity/pain-point hooks"),
  ctas: z.array(z.string()).describe("Exactly 3 call-to-actions"),
});

const SocialSchema = z.object({
  linkedin: z.string().describe(
    "Professional LinkedIn post: hook + 2-3 paragraphs + article link + 4-6 hashtags + disclaimer. Max 2-3 emojis total."
  ),
  x_twitter: z.string().describe(
    "Friendly Twitter/X post: hook + 3-4 sentences summary + 1-2 emojis + article link + 3-4 hashtags + consultant CTA at end."
  ),
  telegram_en: z.string().describe(
    "English Telegram summary: title + 3-4 informative lines + 1-2 emojis + article link + disclaimer. Concise, scannable."
  ),
  telegram_fa: z.string().describe(
    "Persian/Farsi Telegram summary: Farsi title + 3-4 informative lines in Farsi + 1-2 emojis + article link + Farsi disclaimer. RTL-friendly."
  ),
});

// ─── Auth Guard ───────────────────────────────────────────────────────────────

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized");
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export async function igniteSocialEngine(blogPostId: string) {
  await verifyAdmin();

  const post = await prisma.blogPost.findUnique({ where: { id: blogPostId } });
  if (!post) throw new Error("Blog Post not found.");

  let job = await prisma.socialJob.findUnique({ where: { blogPostId } });
  if (!job) {
    job = await prisma.socialJob.create({ data: { blogPostId, status: "GENERATING" } });
  } else {
    await prisma.socialJob.update({ where: { id: job.id }, data: { status: "GENERATING" } });
  }

  try {
    const rawContent = post.content.substring(0, 10000);
    const articleLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://getverixa.com"}/blog/${post.slug}`;

    // ── Prompt 1: Content Extraction ──────────────────────────────────────
    // @ts-ignore
    const extractionCompletion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a precise multilingual data extraction algorithm. Return only valid JSON. You are an expert in Canadian immigration content.",
        },
        {
          role: "user",
          content: `Analyze this immigration article and extract the required fields. Also generate a Persian/Farsi summary.

Article Title: ${post.title}

Article Content:
${rawContent}`,
        },
      ],
      response_format: zodResponseFormat(ExtractionSchema, "extraction"),
    });
    const extractedData = JSON.parse(extractionCompletion.choices[0].message.content || "{}");

    // ── Prompt 2: Hooks & CTAs ─────────────────────────────────────────────
    // @ts-ignore
    const hooksCompletion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an elite copywriter for a Canadian immigration consultant marketplace. Optimize for click-through rates. Return only JSON.",
        },
        {
          role: "user",
          content: `Based on this content:
Summary: ${extractedData?.summary}
Takeaway: ${extractedData?.mainTakeaway}
Target audience: ${extractedData?.targetAudience}

Generate:
1. Five distinct hooks (curiosity or pain-point based, short, no generic phrases)
2. Three CTAs encouraging readers to use Verixa to find licensed Canadian immigration consultants`,
        },
      ],
      response_format: zodResponseFormat(HooksSchema, "hooks_ctas"),
    });
    const hooksData = JSON.parse(hooksCompletion.choices[0].message.content || "{}");

    // ── Prompt 3: Mother Prompt — Platform Drafts ──────────────────────────
    const DISCLAIMER_EN = "⚠️ Verixa is a directory platform, not a law firm. We do not provide legal or immigration advice. This content is for informational purposes only.";
    const DISCLAIMER_FA = "⚠️ وریکسا یک پلتفرم دایرکتوری است نه یک دفتر حقوقی. ما مشاوره حقوقی یا مهاجرتی ارائه نمی‌دهیم. این محتوا صرفاً جنبه اطلاع‌رسانی دارد.";
    const CONSULTANT_CTA = "📌 Are you a licensed Canadian immigration consultant (RCIC)? Join Verixa and reach thousands of clients → getverixa.com";
    const hashtags = (extractedData?.hashtags || []).map((h: string) => `#${h}`).join(" ");

    // @ts-ignore
    const motherCompletion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a world-class content distribution strategist for Verixa, a marketplace for licensed immigration consultants in Canada (getverixa.com).
          
Platform rules (STRICT — do NOT violate):

LINKEDIN:
- Tone: Professional, Thought Leadership
- Structure: Strong hook → 2-3 short paragraphs → key insight → subtle CTA → article link
- Use 2-3 emojis max (naturally placed, not forced)
- End with hashtags then disclaimer
- No salesy language

TWITTER/X:
- Tone: Friendly, direct, conversational (NOT corporate)
- Length: 280-800 characters (no limit, but be punchy)
- Structure: Hook → 3-4 sentence summary → link → hashtags → consultant pitch at very end
- Use 1-2 emojis
- No formal language

TELEGRAM ENGLISH:
- Tone: Informative, fast to scan
- Structure: Bold headline → 3-4 bullet-style lines → link → short disclaimer
- 1-2 emojis max
- Use line breaks for readability

TELEGRAM FARSI (Persian):
- Write entirely in Persian/Farsi
- RTL-compatible text, natural Persian style
- Same structure as English version but adapted for Persian audience
- Include Farsi disclaimer at end

Return all four versions. ALWAYS include the article link in every version.`,
        },
        {
          role: "user",
          content: `Generate four platform-specific posts for this article:

Title: ${extractedData?.title}
Summary: ${extractedData?.summary}
Farsi Summary: ${extractedData?.summaryFa}
Key Insights: ${(extractedData?.keyInsights || []).join(" | ")}
Target Audience: ${extractedData?.targetAudience}
Hook to use: ${hooksData?.hooks?.[0]}
CTA: ${hooksData?.ctas?.[0]}
Article Link: ${articleLink}
Hashtags to include: ${hashtags}
English Disclaimer: ${DISCLAIMER_EN}
Farsi Disclaimer: ${DISCLAIMER_FA}
Consultant CTA (Twitter only): ${CONSULTANT_CTA}`,
        },
      ],
      response_format: zodResponseFormat(SocialSchema, "social_drafts"),
    });
    const draftSocials = JSON.parse(motherCompletion.choices[0].message.content || "{}");

    // ── Prompt 4: Quality Control ──────────────────────────────────────────
    // @ts-ignore
    const qcCompletion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are the Editor-In-Chief for Verixa. Review these 4 social posts and silently rewrite to fix:
1. Any robotic or generic language
2. Missing article links (MUST be present in all 4)
3. Tone mismatch (LinkedIn=professional, X=friendly, Telegram=scannable)
4. Missing disclaimers (both EN and FA telegram posts must have disclaimers)
5. Persian text quality (Farsi must sound natural and professional)
Return only the improved JSON.`,
        },
        {
          role: "user",
          content: `Review and improve:
LinkedIn: ${draftSocials?.linkedin}
X/Twitter: ${draftSocials?.x_twitter}
Telegram EN: ${draftSocials?.telegram_en}
Telegram FA: ${draftSocials?.telegram_fa}`,
        },
      ],
      response_format: zodResponseFormat(SocialSchema, "final_socials"),
    });
    const finalSocials = JSON.parse(qcCompletion.choices[0].message.content || "{}");

    // ── Store in DB ────────────────────────────────────────────────────────
    // Combine telegram EN + FA into one field (separated by ---DIVIDER---)
    const telegramCombined = `${finalSocials?.telegram_en}\n\n---\n\n${finalSocials?.telegram_fa}`;

    await prisma.socialJob.update({
      where: { id: job.id },
      data: {
        linkedinCopy: finalSocials?.linkedin,
        twitterCopy: finalSocials?.x_twitter,
        telegramCopy: telegramCombined,
        hooks: JSON.stringify(hooksData?.hooks || []),
        ctas: JSON.stringify(hooksData?.ctas || []),
        status: "REVIEW",
        linkedinStatus: "PENDING",
        twitterStatus: "PENDING",
        telegramStatus: "PENDING",
      },
    });

    return { status: "SUCCESS", jobId: job.id };
  } catch (error: any) {
    console.error("Social Engine Error:", error);
    await prisma.socialJob.update({ where: { id: job.id }, data: { status: "FAILED" } });
    throw new Error(error.message || "Pipeline execution failed.");
  }
}

// ─── Admin Utilities ──────────────────────────────────────────────────────────

export async function getSocialJobs() {
  await verifyAdmin();
  return prisma.socialJob.findMany({
    include: { blogPost: { select: { id: true, title: true, slug: true, coverImage: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateSocialJob(
  jobId: string,
  data: {
    linkedinCopy?: string;
    twitterCopy?: string;
    telegramCopy?: string;
    status?: string;
  }
) {
  await verifyAdmin();
  return prisma.socialJob.update({ where: { id: jobId }, data });
}
