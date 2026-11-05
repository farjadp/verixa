import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, Bookmark, CalendarDays, Clock, Search, Star } from "lucide-react";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { formatInTimeZone, safeTimeZone } from "@/lib/timezone";
import ConsultantAvatar, { firstNameOf } from "@/components/consultant/ConsultantAvatar";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PENDING: { text: "Awaiting consultant", cls: "bg-warning/10 text-warning" },
  CONFIRMED: { text: "Confirmed", cls: "bg-success/10 text-success" },
  COMPLETED: { text: "Completed", cls: "bg-mist text-gray-600" },
  DECLINED: { text: "Declined", cls: "bg-error/10 text-error" },
  CANCELLED: { text: "Cancelled", cls: "bg-mist text-gray-600" },
  CANCELLED_BY_USER: { text: "Cancelled by you", cls: "bg-mist text-gray-600" },
  CANCELLED_BY_CONSULTANT: { text: "Cancelled by consultant", cls: "bg-error/10 text-error" },
  NO_SHOW: { text: "Missed", cls: "bg-mist text-gray-600" },
};

export default async function ClientHome() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase() ?? "";
  const now = new Date();

  const [user, bookings, savedCount, toReview] = await Promise.all([
    userId ? prisma.user.findUnique({ where: { id: userId }, include: { clientProfile: true } }) : null,
    prisma.booking.findMany({
      where: { userEmail: { equals: email, mode: "insensitive" } },
      include: {
        type: { select: { title: true } },
        profile: { select: { fullName: true, licenseNumber: true, avatarImage: true, timezone: true } },
      },
      orderBy: { scheduledStart: "desc" },
      take: 20,
    }),
    userId ? prisma.savedProfile.count({ where: { userId } }) : 0,
    prisma.booking.count({
      where: { userEmail: { equals: email, mode: "insensitive" }, status: "COMPLETED", review: null },
    }),
  ]);

  const upcoming = bookings
    .filter((b) => (b.status === "CONFIRMED" || b.status === "PENDING") && b.scheduledStart > now)
    .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());
  const next = upcoming[0];
  const recent = bookings.filter((b) => b !== next).slice(0, 5);

  // Recommendations: only consultants who can actually be booked, matching the
  // client's languages when they told us; no invented "Top Rated" labels.
  const langs = (user?.clientProfile?.languages ?? "").split(",").map((l) => l.trim()).filter(Boolean).slice(0, 5);
  const bookableWhere: Prisma.ConsultantProfileWhereInput = {
    userId: { not: null },
    bookingEnabled: true,
    status: { in: ["Yes", "Active"] },
    NOT: { verificationLevel: "PENDING_REVIEW" },
    consultationTypes: { some: { isActive: true } },
    weeklyAvailability: { some: { isActive: true } },
  };
  let recommended = langs.length
    ? await prisma.consultantProfile.findMany({
        where: { ...bookableWhere, OR: langs.map((l) => ({ languages: { contains: l, mode: "insensitive" as const } })) },
        select: { id: true, fullName: true, company: true, licenseNumber: true, avatarImage: true, languages: true },
        take: 3,
      })
    : [];
  const languageMatched = recommended.length > 0;
  if (!languageMatched) {
    recommended = await prisma.consultantProfile.findMany({
      where: bookableWhere,
      select: { id: true, fullName: true, company: true, licenseNumber: true, avatarImage: true, languages: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
  }

  const firstName = session?.user?.name ? firstNameOf(session.user.name) : "there";

  return (
    <div className="space-y-8">
      {/* Header + next session */}
      <section className="rounded-3xl bg-navy p-6 text-white md:p-10">
        <h1 className="mb-2 text-2xl font-bold md:text-3xl">Welcome back, {firstName}</h1>
        <p className="mb-6 max-w-xl text-sm text-white/70">
          {upcoming.length > 0
            ? `You have ${upcoming.length} upcoming consultation${upcoming.length === 1 ? "" : "s"}.`
            : "You have no upcoming consultations."}
          {savedCount > 0 && ` ${savedCount} saved consultant${savedCount === 1 ? "" : "s"}.`}
        </p>

        {next ? (
          <div className="flex max-w-3xl flex-col gap-5 rounded-2xl border border-white/15 bg-white/10 p-5 md:flex-row md:items-center">
            <ConsultantAvatar name={next.profile.fullName} src={next.profile.avatarImage} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-lightteal">{STATUS_LABEL[next.status]?.text ?? next.status}</p>
              <h2 className="truncate text-lg font-bold">{next.type.title} with {next.profile.fullName}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
                <Clock className="h-4 w-4" aria-hidden="true" /> {formatInTimeZone(next.scheduledStart, safeTimeZone(next.profile.timezone))}
              </p>
            </div>
            <Link href={`/dashboard/client/bookings/${next.id}`} className="rounded-xl bg-teal px-5 py-3 text-center text-sm font-bold text-white hover:bg-lightteal hover:text-navy">
              View details
            </Link>
          </div>
        ) : (
          <Link href="/search" className="inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white hover:bg-lightteal hover:text-navy">
            Find a consultant <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </section>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { href: "/search", icon: Search, title: "Find a consultant", desc: "Search licensed RCICs on the CICC register." },
          { href: "/dashboard/client/saved", icon: Bookmark, title: "Saved consultants", desc: savedCount ? `${savedCount} saved` : "Bookmark profiles to compare later." },
          { href: "/dashboard/client/reviews", icon: Star, title: "Reviews", desc: toReview ? `${toReview} consultation${toReview === 1 ? "" : "s"} to review` : "Rate consultations you've completed." },
        ].map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-teal hover:shadow-md hover:shadow-navy/5">
            <Icon className="mb-3 h-5 w-5 text-teal" aria-hidden="true" />
            <h3 className="font-bold text-navy group-hover:text-teal">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent bookings */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-2" aria-labelledby="recent">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="recent" className="font-bold text-navy">Your bookings</h2>
            <Link href="/dashboard/client/bookings" className="text-sm font-semibold text-teal hover:underline">See all</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-gray-300" aria-hidden="true" />
              <p className="text-sm text-gray-500">No bookings yet. When you book a consultation it will show up here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {[...(next ? [next] : []), ...recent].slice(0, 6).map((b) => {
                const label = STATUS_LABEL[b.status] ?? { text: b.status, cls: "bg-mist text-gray-600" };
                return (
                  <li key={b.id}>
                    <Link href={`/dashboard/client/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-mist/60">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{b.profile.fullName}</span>
                        <span className="block text-xs text-gray-500">{b.type.title} · {formatInTimeZone(b.scheduledStart, safeTimeZone(b.profile.timezone))}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${label.cls}`}>{label.text}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recommended */}
        <section aria-labelledby="recommended">
          <h2 id="recommended" className="mb-1 font-bold text-navy">{languageMatched ? "Consultants who speak your language" : "Consultants taking bookings"}</h2>
          <p className="mb-4 text-xs text-gray-500">
            {languageMatched ? "Based on the languages in your profile." : (
              <>Add your languages in your <Link href="/dashboard/client/profile" className="font-semibold text-teal hover:underline">profile</Link> for better matches.</>
            )}
          </p>
          <div className="space-y-3">
            {recommended.map((c) => (
              <Link key={c.id} href={`/consultant/${c.licenseNumber}`} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-teal">
                <ConsultantAvatar name={c.fullName} src={c.avatarImage} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-navy">{c.fullName}, RCIC</span>
                  <span className="block truncate text-xs text-gray-500">{c.languages || c.company || "Independent practice"}</span>
                </span>
              </Link>
            ))}
            {recommended.length === 0 && (
              <p className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">No consultants are taking online bookings yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
