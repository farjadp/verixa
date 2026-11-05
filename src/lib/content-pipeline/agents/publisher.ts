// ============================================================================
// Agent 7 — Publisher
// Creates the BlogPost and a SocialJob in one transaction.
//   autopublish OFF (default) → BlogPost isPublished=false (DRAFT), SocialJob QUEUED.
//   autopublish ON            → BlogPost live, SocialJob still QUEUED.
// This module NEVER calls a social API. Posting stays an explicit step in the
// Social Publishing hub. Disabled channels are marked SKIPPED.
// ============================================================================
import type { PipelineDeps } from "../types";
import { CHANNELS, type Channel } from "../config";
import { buildArticleJsonLd, getSiteUrl, serializeJsonLd, truncateAtWord } from "../seo";
import { pathByKey } from "../paths";
import { profileFor, type LanguageLabels } from "../language";

export interface PublishInput {
  title: string;
  slug: string;
  summary: string;
  markdown: string;
  metaTitle: string;
  metaDesc: string;
  targetKeyword: string;
  keywords: string[];
  coverImage: string | null;
  imageAlt: string;
  imagePrompt: string | null;
  immigrationPaths: string[];
  citations: string[];
  reviewScore: number;
  language: string;
  sourceId?: string;
  sourceUrl: string | null;
  sourceTitle: string;
  publishLive: boolean;
  channels: Record<Channel, boolean>;
}

export interface PublishResult {
  blogPostId: string;
  socialJobId: string;
  isPublished: boolean;
}

/** Category used by the existing blog UI. */
export function categoryFor(paths: string[]): string {
  return paths.length === 0 || paths.every((p) => p === "general") ? "UPDATES_POLICY" : "IMMIGRATION_GUIDES";
}

/** Pure: platform copy for the queued SocialJob. Admins can regenerate richer copy in the Social hub. */
export function buildSocialCopy(input: { title: string; summary: string; url: string; paths: string[]; labels: LanguageLabels }) {
  const { labels } = input;
  // Program hashtags stay in English (that's how people search them); the base tag is localized.
  const pathTags = input.paths.filter((p) => p !== "general").map((p) => pathByKey(p)?.label.replace(/[^A-Za-z]/g, ""));
  const tags = [...new Set([labels.hashtag, ...pathTags].filter((t): t is string => !!t))]
    .slice(0, 4)
    .map((t) => `#${t}`)
    .join(" ");
  const note = labels.socialNote;
  // X counts every link as 23 chars.
  const tweetRoom = 280 - 23 - tags.length - 3;
  return {
    linkedin: `${input.title}\n\n${input.summary}\n\n${labels.readMore} ${input.url}\n\n${note}\n\n${tags}`,
    twitter: `${truncateAtWord(input.title, tweetRoom)}\n${input.url}\n${tags}`,
    facebook: `${input.title}\n\n${input.summary}\n\n${input.url}\n\n${note}`,
    telegram: `*${input.title}*\n\n${input.summary}\n\n${input.url}\n\n_${note}_`,
  };
}

export async function publishPiece(deps: PipelineDeps, input: PublishInput): Promise<PublishResult> {
  const now = deps.now();
  const url = `${getSiteUrl()}/blog/${input.slug}`;
  const jsonLd = buildArticleJsonLd({
    title: input.title,
    description: input.metaDesc,
    slug: input.slug,
    image: input.coverImage,
    imageAlt: input.imageAlt,
    datePublished: now,
    keywords: input.keywords,
    inLanguage: input.language,
    citations: input.citations,
    section: pathByKey(input.immigrationPaths[0] ?? "")?.label,
  });
  const copy = buildSocialCopy({
    title: input.title,
    summary: input.summary,
    url,
    paths: input.immigrationPaths,
    labels: profileFor(input.language).labels,
  });
  const channelStatus = (c: Channel) => (input.channels[c] ? "PENDING" : "SKIPPED");

  const result = await deps.db.$transaction(async (tx) => {
    const post = await tx.blogPost.create({
      data: {
        title: input.title,
        slug: input.slug,
        summary: input.summary,
        content: input.markdown,
        category: categoryFor(input.immigrationPaths),
        coverImage: input.coverImage,
        imageAlt: input.imageAlt,
        isPublished: input.publishLive,
        publishedAt: input.publishLive ? now : null,
        seoTitle: input.metaTitle,
        seoDesc: input.metaDesc,
        targetKeyword: input.targetKeyword,
        canonicalUrl: url,
        jsonLd: serializeJsonLd(jsonLd),
        immigrationPaths: JSON.stringify(input.immigrationPaths),
        imagePrompt: input.imagePrompt,
        source: "PIPELINE",
        language: input.language,
        reviewScore: input.reviewScore,
      },
      select: { id: true },
    });

    const social = await tx.socialJob.create({
      data: {
        blogPostId: post.id,
        status: "QUEUED",
        linkedinCopy: copy.linkedin,
        twitterCopy: copy.twitter,
        facebookCopy: copy.facebook,
        telegramCopy: copy.telegram,
        linkedinStatus: channelStatus("linkedin"),
        twitterStatus: channelStatus("twitter"),
        facebookStatus: channelStatus("facebook"),
        telegramStatus: channelStatus("telegram"),
      },
      select: { id: true },
    });

    // Register the source URL in the aggregator's registry so the older
    // news-aggregator auto-pilot never turns the same item into a second post.
    if (input.sourceUrl && input.sourceId) {
      const raw = await tx.rawArticle.upsert({
        where: { sourceUrl: input.sourceUrl },
        update: { status: "PROCESSED" },
        create: { sourceId: input.sourceId, sourceUrl: input.sourceUrl, title: input.sourceTitle, publishedAt: now, status: "PROCESSED" },
        select: { id: true },
      });
      await tx.contentJob.upsert({
        where: { rawArticleId: raw.id },
        update: { status: "COMPLETED", finalArticleId: post.id },
        create: { rawArticleId: raw.id, status: "COMPLETED", finalArticleId: post.id },
      });
    }

    return { blogPostId: post.id, socialJobId: social.id };
  });

  if (input.publishLive) deps.revalidate(["/", "/blog", `/blog/${input.slug}`, "/sitemap.xml"]);
  deps.log(`Publisher: ${input.publishLive ? "published" : "drafted"} /blog/${input.slug}; social job queued (${CHANNELS.filter((c) => input.channels[c]).join(", ") || "no channels enabled"}).`);
  return { ...result, isPublished: input.publishLive };
}
