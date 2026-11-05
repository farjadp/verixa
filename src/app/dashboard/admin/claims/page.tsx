// Admin › Consultants › Claims.
// Claims are self-serve (OTP to the CICC email/phone). A claim whose email and
// phone did not match the registry is stored with verificationLevel
// PENDING_REVIEW and the public profile says "Pending admin review" — that is
// the queue shown first. There is no approve/reject action yet (see report).
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "../_lib/guard";
import { AdminCard, AdminEmptyState, AdminPageHeader, AdminShell, StatusPill, table, type Tone } from "../_components/AdminUI";

const LEVEL: Record<string, { label: string; tone: Tone }> = {
  CICC_EMAIL_AND_PHONE: { label: "Email + phone", tone: "success" },
  CICC_EMAIL: { label: "Email", tone: "success" },
  CICC_PHONE: { label: "Phone", tone: "success" },
  PENDING_REVIEW: { label: "Needs review", tone: "warning" },
};

const select = {
  id: true,
  fullName: true,
  licenseNumber: true,
  verificationLevel: true,
  rawEmail: true,
  updatedAt: true,
  user: { select: { email: true, name: true, createdAt: true } },
} as const;

type Row = Prisma.ConsultantProfileGetPayload<{ select: typeof select }>;

function ClaimsTable({ rows }: { rows: Row[] }) {
  return (
    <div className={table.wrap}>
      <table className={table.table}>
        <thead className={table.thead}>
          <tr>
            <th className={table.th}>Consultant</th>
            <th className={table.th}>Licence</th>
            <th className={table.th}>Account email</th>
            <th className={table.th}>Registry email</th>
            <th className={table.th}>Matched on</th>
            <th className={table.th}>Account created</th>
            <th className={table.th}><span className="sr-only">Profile</span></th>
          </tr>
        </thead>
        <tbody className={table.tbody}>
          {rows.map((c) => {
            const level = c.verificationLevel ? LEVEL[c.verificationLevel] : undefined;
            const mismatch = c.rawEmail && c.user?.email && c.rawEmail.toLowerCase() !== c.user.email.toLowerCase();
            return (
              <tr key={c.id} className={table.tr}>
                <td className={`${table.td} font-bold`}>{c.fullName}</td>
                <td className={`${table.td} font-mono text-xs`}>{c.licenseNumber}</td>
                <td className={table.td}>{c.user?.email ?? "—"}</td>
                <td className={`${table.td} ${mismatch ? "text-error" : "text-gray-500"}`}>{c.rawEmail ?? "None on file"}</td>
                <td className={table.td}><StatusPill tone={level?.tone ?? "neutral"}>{level?.label ?? c.verificationLevel ?? "Unknown"}</StatusPill></td>
                <td className={`${table.td} whitespace-nowrap text-gray-500`}>
                  {c.user?.createdAt ? `${formatDistanceToNow(c.user.createdAt)} ago` : "—"}
                </td>
                <td className={`${table.td} text-right`}>
                  <Link href={`/consultant/${encodeURIComponent(c.licenseNumber)}`} target="_blank" className="text-xs font-bold text-softblue hover:text-navy">Profile ↗</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminClaimsPage() {
  await requireAdminPage();

  const [needsReview, recent] = await Promise.all([
    prisma.consultantProfile.findMany({
      where: { userId: { not: null }, verificationLevel: "PENDING_REVIEW" },
      orderBy: { updatedAt: "asc" },
      take: 100,
      select,
    }),
    prisma.consultantProfile.findMany({
      where: { userId: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select,
    }),
  ]);

  return (
    <AdminShell wide>
      <AdminPageHeader
        section="Consultants"
        title="Claims"
        description="Consultants claim their profile themselves by one-time code. Claims that did not match the registry email or phone wait here for a manual check."
      />

      <AdminCard className="mb-6">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-black text-navy">Needs manual review ({needsReview.length})</h2>
          <p className="text-xs text-gray-500">Their public profile shows “Pending admin review”. Compare the account email with the registry email before contacting them.</p>
        </div>
        {needsReview.length === 0 ? (
          <AdminEmptyState icon={ShieldCheck} title="No claims waiting" body="Every claimed profile matched the registry by email or phone." />
        ) : (
          <ClaimsTable rows={needsReview} />
        )}
      </AdminCard>

      <AdminCard>
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-black text-navy">Recently claimed</h2>
        </div>
        {recent.length === 0 ? (
          <AdminEmptyState icon={BadgeCheck} title="No profiles claimed yet" />
        ) : (
          <ClaimsTable rows={recent} />
        )}
      </AdminCard>
    </AdminShell>
  );
}
