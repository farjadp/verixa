"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

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

  // 3. Convert to Buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 4. Generate Unique Filename & Path
  const ext = file.name.split('.').pop() || 'png';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");

  // Ensure directory exists
  try {
    await mkdir(uploadDir, { recursive: true });
  } catch (e) {
    // Ignore if exists
  }

  const path = join(uploadDir, filename);

  // 5. Write to Disk
  await writeFile(path, buffer);

  // 6. Return Public Markdown URL
  return `/uploads/${filename}`;
}
