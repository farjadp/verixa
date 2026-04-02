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

// ─── STATIC FOOTERS ──────────────────────────────────────────────────────────
const TELEGRAM_FOOTER_EN = `
\n\n<b>━━━━━━━━━━━━━━━━━━━━━━</b>
⚠️ <i>Verixa is a directory platform, not a law firm. We do not provide legal or immigration advice. This content is for informational purposes only.</i>

📢 Telegram: @getverixa
🌐 <a href="https://www.getverixa.com">www.getverixa.com</a>

💼 <b>Find your immigration consultant — fast and free.</b>
We've built a complete, verified directory of all licensed RCIC consultants in Canada — with full profiles, ratings, and contact details — at zero cost to you. Our mission: connect you with the right consultant for your goals.
👉 <a href="https://www.getverixa.com">getverixa.com</a>`;

const TELEGRAM_FOOTER_FA = `
\n\n<b>━━━━━━━━━━━━━━━━━━━━━━</b>
⚠️ <i>وریکسا یک پلتفرم دایرکتوری است، نه یک دفتر حقوقی. ما مشاوره حقوقی یا مهاجرتی ارائه نمی‌دهیم. این محتوا صرفاً جنبه اطلاع‌رسانی دارد.</i>

📢 کانال تلگرام: @getverixa
🌐 <a href="https://www.getverixa.com">www.getverixa.com</a>

💼 <b>مشاور مهاجرتی مناسب خود را سریع و رایگان پیدا کنید.</b>
ما فهرست کاملی از تمام مشاوران مهاجرتی مجاز (RCIC) کانادا را با تمام مشخصات، امتیازبندی و اطلاعات تماس, کاملاً رایگان در اختیار شما قرار داده‌ایم. هدف ما: پیدا کردن مشاور متناسب با اهداف شماست.
👉 <a href="https://www.getverixa.com">getverixa.com</a>`;

export async function publishToTelegram(jobId: string): Promise<PublishResult> {
  await verifyAdmin();

  const job = await getJobWithPost(jobId);
  if (!job) return { ok: false, platform: "telegram", error: "Job not found" };
  if (!job.telegramCopy) {
    await prisma.socialJob.update({ where: { id: jobId }, data: { telegramStatus: "FAILED", publishError: "No Telegram copy generated" } as any });
    return { ok: false, platform: "telegram", error: "No Telegram copy generated" };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    await prisma.socialJob.update({ where: { id: jobId }, data: { telegramStatus: "FAILED", publishError: "TELEGRAM_BOT_TOKEN missing in env" } as any });
    return { ok: false, platform: "telegram", error: "TELEGRAM_BOT_TOKEN missing in env" };
  }

  // Strip any AI-generated disclaimers (they contain "⚠️" or "Verixa is a directory" or "وریکسا یک پلتفرم")
  function stripAIDisclaimer(text: string): string {
    // Remove lines containing disclaimer keywords
    return text
      .split("\n")
      .filter(line => {
        const l = line.toLowerCase();
        return !(
          l.includes("verixa is a directory") ||
          l.includes("not a law firm") ||
          l.includes("does not provide legal") ||
          l.includes("informational purposes only") ||
          l.includes("وریکسا یک پلتفرم دایرکتوری") ||
          l.includes("مشاوره حقوقی") ||
          l.includes("اطلاع‌رسانی دارد") ||
          (l.includes("⚠️") && (l.includes("verixa") || l.includes("وریکسا")))
        );
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n") // collapse triple+ newlines
      .trim();
  }

  // Split AI-generated content into EN and FA parts
  const parts = job.telegramCopy.split("\n\n---\n\n");
  const enContent = stripAIDisclaimer((parts[0] || job.telegramCopy).trim());
  const faContent = stripAIDisclaimer((parts[1] || "").trim());

  const imageUrl = job.blogPost.coverImage;

  // Channel config: [channelId, content, footer]
  const channelJobs: [string, string, string][] = [
    ["@get_verixa", faContent || enContent, TELEGRAM_FOOTER_FA], // FA channel
    ["@getverixa",  enContent,              TELEGRAM_FOOTER_EN], // EN channel
  ];

  let lastMsgId = "";
  let lastError = "";

  for (const [channel, body, footer] of channelJobs) {
    if (!body) continue;

    const fullMessage = (body + footer).substring(0, 4096);

    try {
      if (imageUrl && imageUrl.startsWith("http")) {
        // Step 1: Send photo WITHOUT caption (avoids the 1024-char limit split)
        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channel,
            photo: imageUrl,
          }),
        });
        const photoData = await photoRes.json();
        if (!photoData.ok) {
          console.warn(`[Telegram] Photo failed on ${channel}:`, photoData.description);
        }

        // Step 2: Send full text as ONE message (no split, up to 4096 chars)
        const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channel,
            text: fullMessage,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });
        const msgData = await msgRes.json();
        if (msgData.ok) lastMsgId = String(msgData.result?.message_id);
        else { lastError = msgData.description; console.warn(`[Telegram] Text msg failed on ${channel}:`, msgData.description); }
      } else {
        // No image — send full message as single text
        const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channel,
            text: fullMessage,
            parse_mode: "HTML",
            disable_web_page_preview: false,
          }),
        });
        const msgData = await msgRes.json();
        if (msgData.ok) lastMsgId = String(msgData.result?.message_id);
        else { lastError = msgData.description; console.warn(`[Telegram] Message failed on ${channel}:`, msgData.description); }
      }
    } catch (channelErr: any) {
      lastError = channelErr.message;
      console.warn(`[Telegram] Exception on ${channel}:`, channelErr.message);
    }
  }

  if (lastMsgId) {
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { telegramStatus: "POSTED", telegramMsgId: lastMsgId, publishedAt: new Date() } as any,
    });
    return { ok: true, platform: "telegram", postId: lastMsgId };
  } else {
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { telegramStatus: "FAILED", publishError: lastError } as any,
    });
    return { ok: false, platform: "telegram", error: lastError || "All channels failed" };
  }
}

// ─── LINKEDIN ──────────────────────────────────────────────────────────────────
// Uses LinkedIn UGC Posts API v2.
// Requires: LINKEDIN_ACCESS_TOKEN + LINKEDIN_ORGANIZATION_ID

export async function publishToLinkedIn(jobId: string): Promise<PublishResult> {
  await verifyAdmin();

  const job = await getJobWithPost(jobId);
  if (!job) return { ok: false, platform: "linkedin", error: "Job not found" };
  if (!job.linkedinCopy) {
    await prisma.socialJob.update({ where: { id: jobId }, data: { linkedinStatus: "FAILED", publishError: "No LinkedIn copy generated" } as any });
    return { ok: false, platform: "linkedin", error: "No LinkedIn copy generated" };
  }

  // Get access token — first try DB (set via OAuth flow), then env
  const dbToken = await prisma.platformSetting.findUnique({ where: { key: "linkedin_access_token" } });
  const accessToken = dbToken?.value || process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = (await prisma.platformSetting.findUnique({ where: { key: "linkedin_org_id" } }))?.value
    || process.env.LINKEDIN_ORGANIZATION_ID;

  if (!accessToken) {
    const errorMsg = "LinkedIn not connected. Go to Admin → Social → Connect LinkedIn.";
    await prisma.socialJob.update({ where: { id: jobId }, data: { linkedinStatus: "FAILED", publishError: errorMsg } as any });
    return { ok: false, platform: "linkedin", error: errorMsg };
  }

  // If orgId not yet stored, fetch from /v2/userinfo and cache it
  let resolvedOrgId = orgId;
  if (!resolvedOrgId) {
    try {
      // Use /v2/me instead of introspection to fetch legacy profile URN safely
      const meRes = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      if (meData.id) {
        resolvedOrgId = `urn:li:person:${meData.id}`;
      }
      
      if (resolvedOrgId) {
        await prisma.platformSetting.upsert({
          where: { key: "linkedin_org_id" },
          update: { value: resolvedOrgId },
          create: { key: "linkedin_org_id", value: resolvedOrgId },
        });
        console.log("[LinkedIn] Resolved person URN:", resolvedOrgId);
      }
    } catch (e) {
      console.warn("[LinkedIn] Could not resolve person URN via /me:", e);
    }
  }

  if (!resolvedOrgId) {
    const errorMsg = "LinkedIn person URN missing. Please reconnect via Admin → Social → Connect LinkedIn.";
    await prisma.socialJob.update({ where: { id: jobId }, data: { linkedinStatus: "FAILED", publishError: errorMsg } as any });
    return { ok: false, platform: "linkedin", error: errorMsg };
  }

  try {
    // orgId is stored as the full URN (urn:li:person:xxx) from OAuth
    const author = resolvedOrgId.startsWith("urn:li:") ? resolvedOrgId : `urn:li:person:${resolvedOrgId}`;
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
  if (!job.twitterCopy) {
    await prisma.socialJob.update({ where: { id: jobId }, data: { twitterStatus: "FAILED", publishError: "No Twitter copy generated" } as any });
    return { ok: false, platform: "twitter", error: "No Twitter copy generated" };
  }

  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    const errorMsg = "Twitter OAuth 1.0a keys missing. Add TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET to Vercel env vars.";
    await prisma.socialJob.update({ where: { id: jobId }, data: { twitterStatus: "FAILED", publishError: errorMsg } as any });
    return {
      ok: false,
      platform: "twitter",
      error: errorMsg,
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

// ─── FACEBOOK ────────────────────────────────────────────────────────────────
// Uses Meta Graph API v19.0.
// Requires: facebook_page_token extracted from OAuth flow.

export async function publishToFacebook(jobId: string): Promise<PublishResult> {
  await verifyAdmin();

  const job = await getJobWithPost(jobId);
  if (!job) return { ok: false, platform: "facebook", error: "Job not found" };
  if (!job.facebookCopy) {
    await prisma.socialJob.update({ where: { id: jobId }, data: { facebookStatus: "FAILED", publishError: "No Facebook copy generated" } as any });
    return { ok: false, platform: "facebook", error: "No Facebook copy generated" };
  }

  const dbToken = await prisma.platformSetting.findUnique({ where: { key: "facebook_page_token" } });
  const dbPageId = await prisma.platformSetting.findUnique({ where: { key: "facebook_page_id" } });
  
  if (!dbToken?.value || !dbPageId?.value) {
    const errorMsg = "Facebook Page not connected. Go to Admin → Social → Connect Facebook.";
    await prisma.socialJob.update({ where: { id: jobId }, data: { facebookStatus: "FAILED", publishError: errorMsg } as any });
    return { ok: false, platform: "facebook", error: errorMsg };
  }

  try {
    const imageUrl = job.blogPost.coverImage;
    const fbUrl = `https://graph.facebook.com/v19.0/${dbPageId.value}/photos`;
    
    // Facebook allows publishing photos with a message acting as the post body
    const body = new URLSearchParams();
    body.append("access_token", dbToken.value);
    body.append("message", job.facebookCopy);
    if (imageUrl && imageUrl.startsWith("http")) {
      body.append("url", imageUrl);
    }

    // If there is no image, we should post to /feed instead
    const postEndpoint = (imageUrl && imageUrl.startsWith("http")) 
      ? fbUrl 
      : `https://graph.facebook.com/v19.0/${dbPageId.value}/feed`;

    const res = await fetch(postEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      await prisma.socialJob.update({
        where: { id: jobId },
        data: { facebookStatus: "FAILED", publishError: `Facebook: ${errMsg}` } as any,
      });
      return { ok: false, platform: "facebook", error: errMsg };
    }

    const postId = data?.post_id || data?.id; // /photos returns post_id, /feed returns id
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { facebookStatus: "POSTED", facebookPostId: postId, publishedAt: new Date() } as any,
    });

    return { ok: true, platform: "facebook", postId };
  } catch (err: any) {
    await prisma.socialJob.update({
      where: { id: jobId },
      data: { facebookStatus: "FAILED", publishError: err.message } as any,
    });
    return { ok: false, platform: "facebook", error: err.message };
  }
}

// ─── PUBLISH ALL ──────────────────────────────────────────────────────────────

export async function publishAll(jobId: string): Promise<PublishResult[]> {
  await verifyAdmin();

  // Mark overall status as POSTING
  await prisma.socialJob.update({ where: { id: jobId }, data: { status: "POSTING" } });

  const results = await Promise.allSettled([
    publishToTelegram(jobId).catch(err => ({ ok: false, platform: "telegram", error: String(err) })),
    publishToLinkedIn(jobId).catch(err => ({ ok: false, platform: "linkedin", error: String(err) })),
    publishToTwitter(jobId).catch(err => ({ ok: false, platform: "twitter", error: String(err) })),
    publishToFacebook(jobId).catch(err => ({ ok: false, platform: "facebook", error: String(err) })),
  ]);

  const outcomes = results.map((r) =>
    r.status === "fulfilled" ? r.value : { ok: false, platform: "unknown", error: String(r.reason) }
  ) as PublishResult[];

  const anyPosted = outcomes.some((r) => r.ok);
  const allPosted = outcomes.every((r) => r.ok);

  const errors = outcomes.filter(o => !o.ok).map(o => `${o.platform}: ${o.error}`);
  
  const finalData: any = {
    status: allPosted ? "POSTED" : anyPosted ? "POSTED" : "FAILED",
    publishError: errors.length > 0 ? errors.join(" | ") : null,
  };

  outcomes.forEach(o => {
    if (o.platform === "linkedin") finalData.linkedinStatus = o.ok ? "POSTED" : "FAILED";
    if (o.platform === "twitter") finalData.twitterStatus = o.ok ? "POSTED" : "FAILED";
    if (o.platform === "facebook") finalData.facebookStatus = o.ok ? "POSTED" : "FAILED";
    if (o.platform === "telegram") finalData.telegramStatus = o.ok ? "POSTED" : "FAILED";
  });

  if (anyPosted) finalData.publishedAt = new Date();

  await prisma.socialJob.update({
    where: { id: jobId },
    data: finalData,
  });

  return outcomes;
}

// ─── LinkedIn OAuth Helper ────────────────────────────────────────────────────
// Called from /api/linkedin/auth/route.ts after receiving the code

export async function exchangeLinkedInCode(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const PROD_URL = process.env.NODE_ENV === "production" ? "https://www.getverixa.com" : "http://localhost:3000";
    const redirectUri = `${PROD_URL}/api/linkedin/auth/callback`;

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

    // Fetch member URN via token introspection (works with any valid token, no extra scope needed)
    let personUrn: string | null = null;
    try {
      // LinkedIn introspect endpoint returns the authorized_user which contains the member URN
      const introspectRes = await fetch("https://www.linkedin.com/oauth/v2/introspectToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: tokenData.access_token,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      });
      const introspect = await introspectRes.json();
      // introspect returns { authorized_user: "urn:li:person:xxx", ... }
      if (introspect?.authorized_user) {
        personUrn = introspect.authorized_user;
      } else if (introspect?.sub) {
        personUrn = `urn:li:person:${introspect.sub}`;
      }
      console.log("[LinkedIn] Introspect result:", JSON.stringify(introspect).substring(0, 200));
    } catch (e) {
      console.warn("[LinkedIn] Introspect failed:", e);
    }

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
  const PROD_URL = process.env.NODE_ENV === "production" ? "https://www.getverixa.com" : "http://localhost:3000";
  const redirectUri = encodeURIComponent(`${PROD_URL}/api/linkedin/auth/callback`);
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const scope = encodeURIComponent("openid profile w_member_social email");
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
}

export async function checkLinkedInStatus(): Promise<{ connected: boolean }> {
  await verifyAdmin();
  const token = await prisma.platformSetting.findUnique({ where: { key: "linkedin_access_token" } });
  return { connected: !!(token?.value) };
}

export async function disconnectLinkedIn(): Promise<{ ok: boolean }> {
  await verifyAdmin();
  await prisma.platformSetting.deleteMany({
    where: { key: { in: ["linkedin_access_token", "linkedin_org_id"] } },
  });
  return { ok: true };
}

// ─── Facebook Auth Helper ─────────────────────────────────────────────────────

export async function getFacebookAuthUrl(): Promise<string> {
  await verifyAdmin();
  return `/api/facebook/auth`;
}

export async function checkFacebookStatus(): Promise<{ connected: boolean; name?: string }> {
  await verifyAdmin();
  const token = await prisma.platformSetting.findUnique({ where: { key: "facebook_page_token" } });
  const name = await prisma.platformSetting.findUnique({ where: { key: "facebook_page_name" } });
  return { connected: !!(token?.value), name: name?.value || "Unknown Page" };
}

export async function disconnectFacebook(): Promise<{ ok: boolean }> {
  await verifyAdmin();
  await prisma.platformSetting.deleteMany({
    where: { key: { in: ["facebook_page_token", "facebook_page_id", "facebook_page_name"] } },
  });
  return { ok: true };
}
