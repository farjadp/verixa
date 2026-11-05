"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { logEvent } from "@/lib/logger";

// Reversible moderation: public profiles only show status PUBLISHED, so
// HIDDEN takes a review off the profile without deleting it.
const schema = z.object({
  reviewId: z.string().min(1).max(64),
  status: z.enum(["PUBLISHED", "HIDDEN"]),
});

export async function setReviewVisibility(
  reviewId: string,
  status: "PUBLISHED" | "HIDDEN",
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId } = await requireAdmin();
    const input = schema.parse({ reviewId, status });

    const review = await prisma.review.update({
      where: { id: input.reviewId },
      data: { status: input.status },
      select: { profile: { select: { licenseNumber: true } } },
    });

    await logEvent({
      userId,
      role: "ADMIN",
      action: input.status === "HIDDEN" ? "REVIEW_HIDDEN" : "REVIEW_PUBLISHED",
      details: { reviewId: input.reviewId },
    });

    revalidatePath("/dashboard/admin/reviews");
    revalidatePath(`/consultant/${review.profile.licenseNumber}`);
    return { ok: true };
  } catch (error) {
    console.error("setReviewVisibility failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Could not update the review." };
  }
}
