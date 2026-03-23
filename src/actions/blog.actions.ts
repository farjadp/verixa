"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function createBlogPost(data: {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  coverImage?: string;
  isPublished: boolean;
  seoTitle?: string;
  seoDesc?: string;
}) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

  return prisma.blogPost.create({
    data: {
      ...data,
      authorId: (session!.user as any).id,
      publishedAt: data.isPublished ? new Date() : null,
    }
  });
}

export async function updateBlogPost(id: string, data: any) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  const isPublishingNow = !existing?.isPublished && data.isPublished;

  return prisma.blogPost.update({
    where: { id },
    data: {
      ...data,
      publishedAt: isPublishingNow ? new Date() : existing?.publishedAt,
    }
  });
}

export async function deleteBlogPost(id: string) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

  return prisma.blogPost.delete({ where: { id } });
}

export async function getBlogPosts(publishedOnly = true) {
  return prisma.blogPost.findMany({
    where: publishedOnly ? { isPublished: true } : undefined,
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, image: true } } }
  });
}

export async function getBlogPostBySlug(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug },
    include: { author: { select: { name: true, image: true } } }
  });
}
