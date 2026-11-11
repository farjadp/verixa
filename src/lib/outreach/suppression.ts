import { prisma } from "@/lib/prisma";

/** Suppressed on any channel = suppressed on all channels, forever. */
export async function isSuppressed(p: { id: string; rawEmail: string | null }): Promise<boolean> {
  const [s, u] = await Promise.all([
    prisma.outreachSuppression.findUnique({ where: { consultantProfileId: p.id }, select: { id: true } }),
    p.rawEmail ? prisma.emailUnsubscribe.findUnique({ where: { email: p.rawEmail.toLowerCase() }, select: { id: true } }) : null,
  ]);
  return Boolean(s || u);
}

export async function suppress(
  consultantProfileId: string,
  reason: string,
  contact: { email?: string | null; linkedinUrl?: string | null; xHandle?: string | null } = {},
): Promise<void> {
  const email = contact.email?.toLowerCase() ?? null;
  await prisma.outreachSuppression.upsert({
    where: { consultantProfileId },
    create: { consultantProfileId, reason, email, linkedinUrl: contact.linkedinUrl ?? null, xHandle: contact.xHandle ?? null },
    update: { reason },
  });
  if (email) {
    await prisma.emailUnsubscribe.upsert({ where: { email }, create: { email, reason }, update: {} });
  }
}
