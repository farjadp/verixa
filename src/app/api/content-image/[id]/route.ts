// ============================================================================
// Route: /api/content-image/[id]
// Why: Serves AI-generated cover images stored in ContentImage (OpenAI image
//      URLs expire, so bytes are persisted). Public, immutable, cacheable.
// ============================================================================
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ID_PATTERN = /^c[a-z0-9]{20,32}$/;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return new Response("Not found", { status: 404 });

  const image = await prisma.contentImage.findUnique({ where: { id }, select: { mimeType: true, data: true } });
  if (!image || !ALLOWED_TYPES.has(image.mimeType)) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      // s-maxage lets the CDN cache it; the bytes behind an id never change.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
