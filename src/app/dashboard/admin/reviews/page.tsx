// Admin › Consultants › Reviews — hide or restore client reviews.
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "../_lib/guard";
import { AdminCard, AdminEmptyState, AdminPageHeader, AdminShell, CapNote, StatusPill, table, type Tone } from "../_components/AdminUI";
import ReviewVisibilityButton from "./ReviewVisibilityButton";

const FILTERS = ["PENDING_MODERATION", "PUBLISHED", "HIDDEN"] as const;
const LABEL: Record<string, string> = { PENDING_MODERATION: "Awaiting moderation", PUBLISHED: "Published", HIDDEN: "Hidden" };
const TONE: Record<string, Tone> = { PENDING_MODERATION: "warning", PUBLISHED: "success", HIDDEN: "neutral" };
const LIMIT = 200;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const parsed = z.enum(FILTERS).safeParse(sp.status);
  const status = parsed.success ? parsed.data : null;
  const where = status ? { status } : {};

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        profile: { select: { fullName: true, licenseNumber: true } },
        user: { select: { name: true, email: true } },
        booking: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.review.count({ where }),
  ]);

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="Consultants"
        title="Reviews"
        description="Only published reviews appear on public profiles. Hiding is reversible and nothing is deleted."
      />

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter by status">
        {[null, ...FILTERS].map((s) => (
          <Link
            key={s ?? "ALL"}
            href={s ? `/dashboard/admin/reviews?status=${s}` : "/dashboard/admin/reviews"}
            className={`rounded-full px-3 py-1 text-xs font-bold ${status === s ? "bg-navy text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-teal"}`}
          >
            {s ? LABEL[s] : "All"}
          </Link>
        ))}
      </nav>

      <AdminCard>
        {reviews.length === 0 ? (
          <AdminEmptyState icon={MessageSquare} title={status ? `No ${LABEL[status].toLowerCase()} reviews` : "No reviews yet"} />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Review</th>
                  <th className={table.th}>Consultant</th>
                  <th className={table.th}>Reviewer</th>
                  <th className={table.th}>Status</th>
                  <th className={`${table.th} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {reviews.map((r) => (
                  <tr key={r.id} className={table.tr}>
                    <td className={`${table.td} max-w-md`}>
                      <div className="text-amber-500" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-gray-300">{"★".repeat(Math.max(0, 5 - r.rating))}</span></div>
                      <p className="mt-1 line-clamp-3 text-sm text-gray-700">{r.comment || <span className="text-gray-400">No comment</span>}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatDistanceToNow(r.createdAt)} ago</p>
                    </td>
                    <td className={`${table.td} font-bold`}>
                      <Link href={`/consultant/${encodeURIComponent(r.profile.licenseNumber)}`} target="_blank" className="hover:text-softblue">{r.profile.fullName}</Link>
                    </td>
                    <td className={table.td}>
                      <div>{r.user?.name || r.guestName || "Guest"}</div>
                      <div className="text-xs text-gray-500">{r.user?.email || r.guestEmail || ""}</div>
                      {r.booking ? <StatusPill tone="teal">Verified booking</StatusPill> : null}
                    </td>
                    <td className={table.td}><StatusPill tone={TONE[r.status] ?? "neutral"}>{LABEL[r.status] ?? r.status}</StatusPill></td>
                    <td className={`${table.td} text-right`}><ReviewVisibilityButton reviewId={r.id} status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <CapNote shown={reviews.length} total={total} noun="reviews" />
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}
