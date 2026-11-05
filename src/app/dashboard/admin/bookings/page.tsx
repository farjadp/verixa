// Admin › Consultants › Bookings — every consultation with status and money.
import Link from "next/link";
import { format } from "date-fns";
import { z } from "zod";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "../_lib/guard";
import { AdminCard, AdminEmptyState, AdminPageHeader, AdminShell, CapNote, StatusPill, table, type Tone } from "../_components/AdminUI";

const STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "DECLINED", "CANCELLED", "NO_SHOW"] as const;
const TONE: Record<string, Tone> = { CONFIRMED: "success", PENDING: "warning", COMPLETED: "info", DECLINED: "error", CANCELLED: "neutral", NO_SHOW: "error" };
const LIMIT = 200;

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const parsed = z.enum(STATUSES).safeParse(sp.status);
  const status = parsed.success ? parsed.data : null;
  const where = status ? { status } : {};

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { profile: { select: { fullName: true } } },
      orderBy: { scheduledStart: "desc" },
      take: LIMIT,
    }),
    prisma.booking.count({ where }),
  ]);

  return (
    <AdminShell wide>
      <AdminPageHeader section="Consultants" title="Bookings" description="All consultations across the platform, newest first. Open a booking for its timeline and payment record." />

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter by status">
        {[null, ...STATUSES].map((s) => (
          <Link
            key={s ?? "ALL"}
            href={s ? `/dashboard/admin/bookings?status=${s}` : "/dashboard/admin/bookings"}
            className={`rounded-full px-3 py-1 text-xs font-bold ${status === s ? "bg-navy text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-teal"}`}
          >
            {s ? s.replace("_", " ") : "All"}
          </Link>
        ))}
      </nav>

      <AdminCard>
        {bookings.length === 0 ? (
          <AdminEmptyState icon={CalendarDays} title={status ? `No ${status.toLowerCase()} bookings` : "No bookings yet"} body="Bookings appear here as soon as a client requests a consultation." />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Consultant</th>
                  <th className={table.th}>Client</th>
                  <th className={table.th}>When</th>
                  <th className={table.th}>Status</th>
                  <th className={`${table.th} text-right`}>Amount</th>
                  <th className={`${table.th} text-right`}>Platform fee</th>
                  <th className={table.th}><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {bookings.map((b) => (
                  <tr key={b.id} className={table.tr}>
                    <td className={`${table.td} font-bold`}>{b.profile.fullName}</td>
                    <td className={table.td}>
                      <div>{b.userFirstName} {b.userLastName}</div>
                      <div className="text-xs text-gray-500">{b.userEmail}</div>
                    </td>
                    <td className={`${table.td} whitespace-nowrap`}>
                      <div>{format(b.scheduledStart, "MMM d, yyyy")}</div>
                      <div className="text-xs text-gray-500">{format(b.scheduledStart, "HH:mm")}–{format(b.scheduledEnd, "HH:mm")}</div>
                    </td>
                    <td className={table.td}><StatusPill tone={TONE[b.status] ?? "neutral"}>{b.status.replace("_", " ")}</StatusPill></td>
                    <td className={`${table.td} text-right font-mono`}>${(b.grossAmountCents / 100).toFixed(2)}</td>
                    <td className={`${table.td} text-right font-mono text-gray-500`}>${(b.platformFeeCents / 100).toFixed(2)}</td>
                    <td className={`${table.td} text-right`}>
                      <Link href={`/dashboard/admin/bookings/${b.id}`} className="text-xs font-bold text-softblue hover:text-navy">Details →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <CapNote shown={bookings.length} total={total} noun="bookings" />
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}
