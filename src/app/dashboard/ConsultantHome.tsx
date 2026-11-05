import Link from "next/link";
import { getServerSession } from "next-auth";
import { AlertCircle, ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, Circle, Clock, Eye, MousePointerClick, ShieldCheck, Star } from "lucide-react";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { canAcceptBookings, isRegistryActive } from "@/lib/booking-rules";
import { describeVerification, formatPrice } from "@/lib/verification";
import { formatInTimeZone, safeTimeZone } from "@/lib/timezone";
import { getUserSubscription } from "@/lib/subscription";
import ConsultantAvatar, { firstNameOf } from "@/components/consultant/ConsultantAvatar";
import AnnouncementBanner from "./AnnouncementBanner";

export default async function ConsultantHome() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const profile = userId
    ? await prisma.consultantProfile.findUnique({
        where: { userId },
        include: {
          consultationTypes: { where: { isActive: true }, select: { id: true } },
          weeklyAvailability: { where: { isActive: true }, select: { id: true } },
        },
      })
    : null;

  if (!profile) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-navy">Finish setting up your consultant account</h1>
        <p className="mx-auto mb-6 max-w-md text-sm text-gray-600">
          Your account isn&apos;t linked to a CICC licence yet. Find your profile and claim it with your register email.
        </p>
        <Link href="/search" className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white hover:bg-ink">
          Find my profile <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tz = safeTimeZone(profile.timezone);

  const [actionRequired, upcoming, summaries, ratingAgg, earnings, subscription, unreadAnnouncement] = await Promise.all([
    prisma.booking.findMany({
      where: {
        consultantProfileId: profile.id,
        OR: [
          { status: "PENDING" },
          { status: "CONFIRMED", meetingLink: null, scheduledStart: { gt: now } },
          { status: "CONFIRMED", scheduledEnd: { lt: now } },
        ],
      },
      include: { type: { select: { title: true } } },
      orderBy: { scheduledStart: "asc" },
      take: 6,
    }),
    prisma.booking.findMany({
      where: { consultantProfileId: profile.id, status: "CONFIRMED", scheduledStart: { gt: now } },
      include: { type: { select: { title: true } } },
      orderBy: { scheduledStart: "asc" },
      take: 5,
    }),
    prisma.consultantDailySummary.findMany({
      where: { consultantProfileId: profile.id, date: { gte: thirtyDaysAgo } },
      select: { profileViews: true, bookingStarts: true },
    }),
    prisma.review.aggregate({
      where: { consultantProfileId: profile.id, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.booking.aggregate({
      where: { consultantProfileId: profile.id, paymentStatus: "CAPTURED", updatedAt: { gte: thirtyDaysAgo } },
      _sum: { grossAmountCents: true, platformFeeCents: true, netAmountCents: true },
      _count: { _all: true },
    }),
    getUserSubscription(profile.userId!),
    prisma.notification.findFirst({
      where: { userId, type: "ADMIN_ANNOUNCEMENT", isRead: false },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalViews = summaries.reduce((acc, s) => acc + s.profileViews, 0);
  const totalStarts = summaries.reduce((acc, s) => acc + s.bookingStarts, 0);
  const trust = describeVerification(true, profile.verificationLevel);
  const gate = canAcceptBookings(profile);

  let specCount = 0;
  try {
    const parsed = profile.specializations ? JSON.parse(profile.specializations) : [];
    specCount = Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    specCount = 0;
  }

  const checklist = [
    { title: "Add a professional photo", done: !!profile.avatarImage, href: "/dashboard/profile" },
    { title: "Write your bio", done: !!profile.bio?.trim(), href: "/dashboard/profile" },
    { title: "Choose areas of practice", done: specCount > 0, href: "/dashboard/profile" },
    { title: "Publish a consultation type with a price", done: profile.consultationTypes.length > 0, href: "/dashboard/booking#availability-pricing" },
    { title: "Set weekly availability", done: profile.weeklyAvailability.length > 0, href: "/dashboard/booking#availability-pricing" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const bookable = gate.ok && profile.consultationTypes.length > 0 && profile.weeklyAvailability.length > 0;

  const metrics = [
    { label: "Profile views (30 days)", value: totalViews.toLocaleString("en-CA"), icon: Eye },
    { label: "Booking starts (30 days)", value: totalStarts.toLocaleString("en-CA"), icon: MousePointerClick },
    { label: "Needs your action", value: String(actionRequired.length), icon: AlertCircle },
    {
      label: ratingAgg._count._all ? `Rating (${ratingAgg._count._all} review${ratingAgg._count._all === 1 ? "" : "s"})` : "Rating",
      value: ratingAgg._avg.rating ? ratingAgg._avg.rating.toFixed(1) : "—",
      icon: Star,
    },
  ];

  return (
    <div className="space-y-8">
      {unreadAnnouncement && <AnnouncementBanner announcement={unreadAnnouncement} />}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <ConsultantAvatar name={profile.fullName} src={profile.avatarImage} size="md" />
          <div>
            <h1 className="text-2xl font-bold text-navy">Welcome back, {firstNameOf(profile.fullName)}</h1>
            <p className="mt-0.5 text-sm text-gray-600">Licence {profile.licenseNumber} · {subscription?.plan?.name ?? "Free"} plan</p>
          </div>
        </div>
        <Link href={`/consultant/${profile.licenseNumber}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy px-5 py-2.5 text-sm font-bold text-navy hover:bg-navy hover:text-white">
          View public profile <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-500"><ShieldCheck className="h-4 w-4 text-teal" aria-hidden="true" /> CICC licence</p>
          <p className={`font-bold ${isRegistryActive(profile.status) ? "text-success" : "text-error"}`}>{isRegistryActive(profile.status) ? "Active on the register" : `Register status: ${profile.status}`}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-500"><BadgeCheck className="h-4 w-4 text-teal" aria-hidden="true" /> Identity</p>
          <p className={`font-bold ${trust.tone === "pending" ? "text-warning" : "text-success"}`}>{trust.label}</p>
          <p className="mt-1 text-xs text-gray-500">{trust.detail}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-500"><CalendarDays className="h-4 w-4 text-teal" aria-hidden="true" /> Online booking</p>
          <p className={`font-bold ${bookable ? "text-success" : "text-warning"}`}>{bookable ? "Open" : "Not open yet"}</p>
          {!bookable && (
            <p className="mt-1 text-xs text-gray-500">
              {!gate.ok ? gate.error : "Add a consultation type and weekly hours."}{" "}
              <Link href="/dashboard/booking#availability-pricing" className="font-semibold text-teal hover:underline">Set up</Link>
            </p>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-2xl border border-gray-200 bg-white p-5">
              <Icon className="mb-3 h-5 w-5 text-teal" aria-hidden="true" />
              <p className="text-2xl font-bold text-navy">{m.value}</p>
              <p className="text-xs font-medium text-gray-500">{m.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Action inbox */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white lg:col-span-2" aria-labelledby="inbox">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 id="inbox" className="font-bold text-navy">Needs your action</h2>
            <Link href="/dashboard/booking" className="text-sm font-semibold text-teal hover:underline">All bookings</Link>
          </div>
          {actionRequired.length === 0 ? (
            <div className="flex flex-col items-center p-10 text-center">
              <CheckCircle2 className="mb-2 h-10 w-10 text-success/60" aria-hidden="true" />
              <p className="font-semibold text-ink">You&apos;re all caught up</p>
              <p className="mt-1 text-sm text-gray-500">New requests and sessions to close out will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {actionRequired.map((b) => {
                const reason =
                  b.status === "PENDING" ? { text: "Accept or decline", cls: "text-warning" }
                  : b.scheduledEnd < now ? { text: "Mark completed or no-show", cls: "text-softblue" }
                  : { text: "Add a meeting link", cls: "text-error" };
                return (
                  <li key={b.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {b.userFirstName} {b.userLastName}
                        <span className="font-normal text-gray-500"> · {b.type.title}</span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                        <span className={`font-semibold ${reason.cls}`}>{reason.text}</span>
                        <span className="inline-flex items-center gap-1 text-gray-500"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatInTimeZone(b.scheduledStart, tz)}</span>
                      </p>
                    </div>
                    <Link href={`/dashboard/booking/${b.id}`} className="self-start rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-ink sm:self-center">
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Checklist */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="checklist">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="checklist" className="font-bold text-navy">Profile setup</h2>
            <span className="text-xs font-semibold text-gray-500">{doneCount}/{checklist.length}</span>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
            <div className="h-full rounded-full bg-teal" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ul className="space-y-2">
            {checklist.map((c) => (
              <li key={c.title}>
                <Link href={c.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-mist">
                  {c.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" /> : <Circle className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" />}
                  <span className={c.done ? "text-gray-500 line-through" : "font-medium text-ink"}>{c.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="upcoming">
          <h2 id="upcoming" className="mb-4 font-bold text-navy">Upcoming sessions</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">No confirmed sessions coming up.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <Link href={`/dashboard/booking/${b.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 hover:border-teal">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{b.userFirstName} {b.userLastName}</span>
                      <span className="block text-xs text-gray-500">{b.type.title}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs font-semibold text-navy">{formatInTimeZone(b.scheduledStart, tz)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Earnings from real captured payments */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="earnings">
          <h2 id="earnings" className="mb-1 font-bold text-navy">Earnings (last 30 days)</h2>
          <p className="mb-4 text-xs text-gray-500">From payments captured out of escrow. Payouts are handled by Verixa.</p>
          {earnings._count._all === 0 ? (
            <p className="text-sm text-gray-500">No captured payments yet.</p>
          ) : (
            <dl className="grid grid-cols-3 gap-4">
              <div><dt className="text-xs text-gray-500">Gross</dt><dd className="text-lg font-bold text-navy">{formatPrice(earnings._sum.grossAmountCents ?? 0)}</dd></div>
              <div><dt className="text-xs text-gray-500">Verixa fee</dt><dd className="text-lg font-bold text-ink">{formatPrice(earnings._sum.platformFeeCents ?? 0)}</dd></div>
              <div><dt className="text-xs text-gray-500">Net</dt><dd className="text-lg font-bold text-success">{formatPrice(earnings._sum.netAmountCents ?? 0)}</dd></div>
            </dl>
          )}
          <p className="mt-4 text-xs text-gray-500">
            Your commission rate depends on your plan.{" "}
            <Link href="/dashboard/billing" className="font-semibold text-teal hover:underline">Plans &amp; billing</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
