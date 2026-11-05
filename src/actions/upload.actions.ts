"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { MAX_PROFILE_IMAGE_BYTES, sniffImage } from "@/lib/image-upload";

export async function uploadImageAction(formData: FormData) {
  // 1. Verify Authentication
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized to upload files.");
  }

  const file = formData.get("image") as File;
  if (!file) throw new Error("No image file provided.");

  // 2. Validate File Type
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image.");
  }

  // 3. Convert to Buffer and then Base64
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Create Base64 URI
  const base64 = buffer.toString('base64');
  return `data:${file.type};base64,${base64}`;
}

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

// Stores the image in Postgres (ContentImage) and serves it from
// /api/content-image/[id]. Writing to public/ fails on Vercel's read-only
// filesystem and let a renamed .html file be served same-origin.
export async function uploadConsultantImageAction(formData: FormData): Promise<UploadResult> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "CONSULTANT")) {
    return { ok: false, error: "Please sign in as a consultant to upload images. If you just claimed your profile, sign out and back in." };
  }

  const file = formData.get("image");
  if (!(file instanceof File)) return { ok: false, error: "No image file provided." };
  if (file.size > MAX_PROFILE_IMAGE_BYTES) return { ok: false, error: "Image must be smaller than 5 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImage(bytes);
  if (!sniffed) return { ok: false, error: "Upload a PNG, JPEG or WebP image." };

  try {
    const image = await prisma.contentImage.create({
      data: { mimeType: sniffed.mimeType, data: Buffer.from(bytes), alt: `Consultant image (${session.user.id})` },
      select: { id: true },
    });
    return { ok: true, url: `/api/content-image/${image.id}` };
  } catch (e) {
    console.error("[uploadConsultantImageAction] failed:", e);
    return { ok: false, error: "Upload failed. Please try again." };
  }
}
