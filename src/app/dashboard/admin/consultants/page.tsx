// Admin › Consultants › Directory — CICC registry joined with platform data.
import Link from "next/link";
import { z } from "zod";
import { Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { searchConsultants } from "@/lib/db";
import { requireAdminPage } from "../_lib/guard";
import { AdminCard, AdminEmptyState, AdminPageHeader, AdminShell, StatusPill, table, type Tone } from "../_components/AdminUI";

const LIMIT = 50;

// The registry stores licence status as "Yes"/"No" (a few rows say "Active").
function licenceActive(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  return s === "yes" || s.includes("active");
}

const VERIFICATION: Record<string, { label: string; tone: Tone }> = {
  CICC_EMAIL_AND_PHONE: { label: "Email + phone matched", tone: "success" },
  CICC_EMAIL: { label: "Email matched", tone: "success" },
  CICC_PHONE: { label: "Phone matched", tone: "success" },
  PENDING_REVIEW: { label: "Needs manual review", tone: "warning" },
};

export default async function AdminConsultantsPage(props: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdminPage();
  const sp = await props.searchParams;
  const q = z.string().trim().max(100).catch("").parse(sp.q ?? "");
  const page = z.coerce.number().int().min(1).max(10_000).catch(1).parse(sp.page ?? "1");

  const { data: registry, total, totalPages } = await searchConsultants({ search: q, page, limit: LIMIT });

  const claimedProfiles = await prisma.consultantProfile.findMany({
    where: { licenseNumber: { in: registry.map((c) => c.License_Number) } },
    take: LIMIT,
    select: {
      licenseNumber: true,
      userId: true,
      verificationLevel: true,
      user: { select: { email: true } },
      _count: { select: { bookings: true, reviews: true } },
    },
  });
  const profiles = new Map(claimedProfiles.map((p) => [p.licenseNumber, p]));

  const pageHref = (n: number) => `/dashboard/admin/consultants?page=${n}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="Consultants"
        title="Directory"
        description="Every licensed consultant in the CICC registry, with their Verixa account status."
        actions={
          <form className="flex gap-2" role="search">
            <label className="relative">
              <span className="sr-only">Search name or licence</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Name or licence…"
                className="w-64 rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal focus:outline-none"
              />
            </label>
            <button type="submit" className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-[#0a1e30]">Search</button>
          </form>
        }
      />

      <AdminCard>
        {registry.length === 0 ? (
          <AdminEmptyState icon={Users} title="No consultants match" body={q ? `Nothing found for “${q}”.` : "The registry is empty — run a registry sync."} />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Consultant</th>
                  <th className={table.th}>Licence</th>
                  <th className={table.th}>Licence status</th>
                  <th className={table.th}>Verixa account</th>
                  <th className={`${table.th} text-right`}>Bookings</th>
                  <th className={`${table.th} text-right`}>Reviews</th>
                  <th className={table.th}><span className="sr-only">Profile</span></th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {registry.map((reg) => {
                  const p = profiles.get(reg.License_Number);
                  const v = p?.verificationLevel ? VERIFICATION[p.verificationLevel] : undefined;
                  return (
                    <tr key={reg.License_Number} className={table.tr}>
                      <td className={table.td}>
                        <div className="font-bold">{reg.Full_Name}</div>
                        <div className="text-xs text-gray-500">{p?.user?.email || reg.Email || "No email on file"}</div>
                      </td>
                      <td className={`${table.td} font-mono text-xs`}>{reg.License_Number}</td>
                      <td className={table.td}>
                        <StatusPill tone={licenceActive(reg.Status) ? "success" : "error"}>{licenceActive(reg.Status) ? "Active" : "Inactive"}</StatusPill>
                      </td>
                      <td className={table.td}>
                        {!p?.userId ? (
                          <span className="text-xs text-gray-500">Unclaimed</span>
                        ) : (
                          <StatusPill tone={v?.tone ?? "info"}>{v?.label ?? "Claimed"}</StatusPill>
                        )}
                      </td>
                      <td className={`${table.td} text-right tabular-nums`}>{p ? p._count.bookings : "—"}</td>
                      <td className={`${table.td} text-right tabular-nums`}>{p ? p._count.reviews : "—"}</td>
                      <td className={`${table.td} text-right`}>
                        <Link href={`/consultant/${encodeURIComponent(reg.License_Number)}`} target="_blank" className="text-xs font-bold text-softblue hover:text-navy">
                          Public profile ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          <span>
            {total === 0 ? "0 records" : `${((page - 1) * LIMIT + 1).toLocaleString()}–${Math.min(page * LIMIT, total).toLocaleString()} of ${total.toLocaleString()} registry records`}
          </span>
          <div className="flex gap-2">
            <Link href={pageHref(page - 1)} aria-disabled={page <= 1} className={`rounded-lg border border-gray-200 px-3 py-1 font-bold ${page <= 1 ? "pointer-events-none opacity-40" : "hover:border-teal"}`}>Prev</Link>
            <Link href={pageHref(page + 1)} aria-disabled={page >= totalPages} className={`rounded-lg border border-gray-200 px-3 py-1 font-bold ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:border-teal"}`}>Next</Link>
          </div>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
