"use server";
// ============================================================================
// publish.actions.ts — Real Social Publishing Engine v1.0
// Telegram:  Works with Bot Token + Channel ID
// LinkedIn:  Requires OAuth 2.0 Access Token (generated via /api/linkedin/auth)
// Twitter:   Requires OAuth 1.0a keys (from Twitter Developer Portal)
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized");
}

type PublishResult = {
  ok: boolean;
  platform: string;
  postId?: string;
  error?: string;
};

// ─── Helper: get blog post image URL ─────────────────────────────────────────
async function getJobWithPost(jobId: string) {
  return prisma.socialJob.findUnique({
    where: { id: jobId },
    include: { blogPost: { select: { id: true, title: true, slug: true, coverImage: true } } },
  });
}

// ─── TELEGRAM ─────────────────────────────────────────────────────────────────
// Uses sendPhoto if coverImage exists, otherwise sendMessage.
// Caption is the bilingual text (EN + FA).

export async function publishToTelegram(jobId: string): Promise<PublishResult> {
  await verifyAdmin();

  const job = await getJobWithPost(jobId);
  if (!job) return { ok: false, platform: "telegram", error: "Job not found" };
  if (!job.telegramCopy) return { ok: false, platform: "telegram", error: "No Telegram copy generated" };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !channelId) return { ok: false, platform: "telegram", error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID missing in env" };

  try {
    const caption = job.telegramCopy.substring(0, 1024); // Telegram caption limit
    const imageUrl = job.blogPost.coverImage;

    let res: Response;
    if (imageUrl && imageUrl.startsWith("http")) {
      // Send photo with caption
      res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          photo: imageUrl,
          caption,
          parse_mode: "HTML",
        }),
      });
    } else {
      // Send text message
      const fullText = job.telegramCopy.substring(0, 4096);
      res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          text: fullText,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      });
    }

    const data = await res.json();
    if (!data.ok) {
      await prisma.socialJob.update({
        where: { id: jobId },
        data: { telegramStatus: "FAILED", publishError: data.description } as any,
      });
      return { ok: false, platform: "telegram", error: data.description };
    }

    const msgId = String(data.result?.message_id);
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { telegramStatus: "POSTED", telegramMsgId: msgId, publishedAt: new Date() } as any,
    });

    return { ok: true, platform: "telegram", postId: msgId };
  } catch (err: any) {
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { telegramStatus: "FAILED", publishError: err.message } as any,
    });
    return { ok: false, platform: "telegram", error: err.message };
  }
}

// ─── LINKEDIN ──────────────────────────────────────────────────────────────────
// Uses LinkedIn UGC Posts API v2.
// Requires: LINKEDIN_ACCESS_TOKEN + LINKEDIN_ORGANIZATION_ID

export async function publishToLinkedIn(jobId: string): Promise<PublishResult> {
  await verifyAdmin();

  const job = await getJobWithPost(jobId);
  if (!job) return { ok: false, platform: "linkedin", error: "Job not found" };
  if (!job.linkedinCopy) return { ok: false, platform: "linkedin", error: "No LinkedIn copy generated" };

  // Get access token — first try DB (set via OAuth flow), then env
  const dbToken = await prisma.platformSetting.findUnique({ where: { key: "linkedin_access_token" } });
  const accessToken = dbToken?.value || process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = (await prisma.platformSetting.findUnique({ where: { key: "linkedin_org_id" } }))?.value
    || process.env.LINKEDIN_ORGANIZATION_ID;

  if (!accessToken) {
    return { ok: false, platform: "linkedin", error: "LinkedIn not connected. Go to Admin → Social → Connect LinkedIn." };
  }
  if (!orgId) {
    return { ok: false, platform: "linkedin", error: "LinkedIn Organization ID missing. Finish OAuth setup." };
  }

  try {
    // orgId is now stored as the full URN (urn:li:person:xxx) from OAuth
    const author = orgId.startsWith("urn:li:") ? orgId : `urn:li:person:${orgId}`;
    const imageUrl = job.blogPost.coverImage;
    let mediaAssetUrn: string | null = null;

    // ── Step 1: Upload image (if available) ──────────────────────────────
    if (imageUrl && imageUrl.startsWith("http")) {
      try {
        // Register upload
        const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              owner: author,
              serviceRelationships: [
                { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
              ],
            },
          }),
        });
        const registerData = await registerRes.json();
        const uploadUrl = registerData?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
        mediaAssetUrn = registerData?.value?.asset;

        if (uploadUrl && mediaAssetUrn) {
          // Download image and upload to LinkedIn
          const imgRes = await fetch(imageUrl);
          const imgBuffer = await imgRes.arrayBuffer();
          await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "image/png",
            },
            body: imgBuffer,
          });
        }
      } catch (imgErr) {
        console.warn("[LinkedIn] Image upload failed, posting without image:", imgErr);
        mediaAssetUrn = null;
      }
    }

    // ── Step 2: Create post ───────────────────────────────────────────────
    const shareContent: any = {
      shareCommentary: { text: job.linkedinCopy },
      shareMediaCategory: mediaAssetUrn ? "IMAGE" : "NONE",
    };

    if (mediaAssetUrn) {
      shareContent.media = [
        {
          status: "READY",
          media: mediaAssetUrn,
          title: { text: job.blogPost.title },
        },
      ];
    }

    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author,
        lifecycleState: "PUBLISHED",
        specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });

    if (!postRes.ok) {
      const errData = await postRes.json();
      const errMsg = errData?.message || `HTTP ${postRes.status}`;
      await prisma.socialJob.update({
        where: { id: jobId },
        data: { linkedinStatus: "FAILED", publishError: `LinkedIn: ${errMsg}` } as any,
      });
      return { ok: false, platform: "linkedin", error: errMsg };
    }

    const postId = postRes.headers.get("x-restli-id") || "unknown";
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { linkedinStatus: "POSTED", linkedinPostId: postId, publishedAt: new Date() } as any,
    });

    return { ok: true, platform: "linkedin", postId };
  } catch (err: any) {
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { linkedinStatus: "FAILED", publishError: err.message } as any,
    });
    return { ok: false, platform: "linkedin", error: err.message };
  }
}

// ─── TWITTER / X ──────────────────────────────────────────────────────────────
// Uses Twitter API v2 POST /2/tweets with OAuth 1.0a User Context.
// Requires: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET

function buildOAuthHeader(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: process.env.TWITTER_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.TWITTER_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join("&");

  const signingKey = [
    encodeURIComponent(process.env.TWITTER_API_SECRET!),
    encodeURIComponent(process.env.TWITTER_ACCESS_SECRET!),
  ].join("&");

  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  oauthParams["oauth_signature"] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

export async function publishToTwitter(jobId: string): Promise<PublishResult> {
  await verifyAdmin();

  const job = await getJobWithPost(jobId);
  if (!job) return { ok: false, platform: "twitter", error: "Job not found" };
  if (!job.twitterCopy) return { ok: false, platform: "twitter", error: "No Twitter copy generated" };

  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return {
      ok: false,
      platform: "twitter",
      error: "Twitter OAuth 1.0a keys missing. Add TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET to Vercel env vars.",
    };
  }

  try {
    const tweetUrl = "https://api.twitter.com/2/tweets";
    const body = { text: job.twitterCopy };
    const oauthHeader = buildOAuthHeader("POST", tweetUrl, {});

    const res = await fetch(tweetUrl, {
      method: "POST",
      headers: {
        Authorization: oauthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.detail || data?.errors?.[0]?.message || `HTTP ${res.status}`;
      await prisma.socialJob.update({
        where: { id: jobId },
        data: { twitterStatus: "FAILED", publishError: `Twitter: ${errMsg}` } as any,
      });
      return { ok: false, platform: "twitter", error: errMsg };
    }

    const tweetId = data?.data?.id;
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { twitterStatus: "POSTED", twitterPostId: tweetId, publishedAt: new Date() } as any,
    });

    return { ok: true, platform: "twitter", postId: tweetId };
  } catch (err: any) {
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { twitterStatus: "FAILED", publishError: err.message } as any,
    });
    return { ok: false, platform: "twitter", error: err.message };
  }
}

// ─── PUBLISH ALL ──────────────────────────────────────────────────────────────

export async function publishAll(jobId: string): Promise<PublishResult[]> {
  await verifyAdmin();

  // Mark overall status as POSTING
  await prisma.socialJob.update({ where: { id: jobId }, data: { status: "POSTING" } });

  const results = await Promise.allSettled([
    publishToTelegram(jobId),
    publishToLinkedIn(jobId),
    publishToTwitter(jobId),
  ]);

  const outcomes = results.map((r) =>
    r.status === "fulfilled" ? r.value : { ok: false, platform: "unknown", error: String(r.reason) }
  );

  // Overall status: POSTED if at least one succeeded
  const anyPosted = outcomes.some((r) => r.ok);
  const allPosted = outcomes.every((r) => r.ok);

  const finalData: any = {
    status: allPosted ? "POSTED" : anyPosted ? "POSTED" : "FAILED",
  };
  if (anyPosted) finalData.publishedAt = new Date();

  await prisma.socialJob.update({
    where: { id: jobId },
    data: finalData,
  });

  return outcomes as PublishResult[];
}

// ─── LinkedIn OAuth Helper ────────────────────────────────────────────────────
// Called from /api/linkedin/auth/route.ts after receiving the code

export async function exchangeLinkedInCode(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const BASE_URL = process.env.NEXTAUTH_URL || "https://getverixa.com";
    const redirectUri = `${BASE_URL}/api/linkedin/auth/callback`;

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return { ok: false, error: tokenData?.error_description || "Failed to exchange code" };
    }

    // Fetch member URN (personal profile)
    let personUrn: string | null = null;
    try {
      const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const meData = await meRes.json();
      // LinkedIn OpenID Connect returns sub as the person ID
      personUrn = meData?.sub ? `urn:li:person:${meData.sub}` : null;
    } catch {}

    // Store in PlatformSetting
    await prisma.platformSetting.upsert({
      where: { key: "linkedin_access_token" },
      update: { value: tokenData.access_token },
      create: { key: "linkedin_access_token", value: tokenData.access_token },
    });

    if (personUrn) {
      await prisma.platformSetting.upsert({
        where: { key: "linkedin_org_id" },
        update: { value: personUrn },
        create: { key: "linkedin_org_id", value: personUrn },
      });
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function getLinkedInAuthUrl(): Promise<string> {
  await verifyAdmin();
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://getverixa.com";
  const redirectUri = encodeURIComponent(`${BASE_URL}/api/linkedin/auth/callback`);
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  // w_member_social: post as personal profile (no special approval needed)
  const scope = encodeURIComponent("w_member_social openid profile");
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
}

export async function checkLinkedInStatus(): Promise<{ connected: boolean }> {
  await verifyAdmin();
  const token = await prisma.platformSetting.findUnique({ where: { key: "linkedin_access_token" } });
  return { connected: !!(token?.value) };
}
