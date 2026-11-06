// ============================================================================
// Route: /consultant/[license_number]
// Why: Public consultant profile — the trust surface a client checks before
//      booking. Everything shown is real data: CICC register fields, what the
//      consultant wrote after claiming, and published reviews. Nothing is
//      filled in with defaults.
// Layout: verification record first. The hero states who this is and what the
//      register says; the rail carries the one action (book or claim).
// ============================================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ShieldCheck, Building2, MapPin, CalendarDays, Star, Clock, MessageSquare, Languages,
  Mail, Phone, Globe, Lock, BadgeCheck, AlertCircle, ArrowRight, ArrowLeft, ExternalLink, Video, Users,
} from "lucide-react";
import { getConsultantByLicense } from "@/lib/db";
import { getRelatedArticles } from "@/actions/blog.actions";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SaveProfileButton from "@/components/SaveProfileButton";
import { checkIsSaved } from "@/actions/savedProfiles.actions";
import TrackPageView from "@/components/TrackPageView";
import GuestReviewButton from "@/components/GuestReviewButton";
import ConsultantAvatar, { firstNameOf } from "@/components/consultant/ConsultantAvatar";
import ConsultantCard from "@/components/home/ConsultantCard";
import ArticleCard from "@/components/blog/ArticleCard";
import { ALL_SPECIALIZATION_ITEMS } from "@/lib/immigration-paths";
import { canAcceptBookings, isRegistryActive } from "@/lib/booking-rules";
import { summarizeRatings } from "@/lib/review-rules";
import { sanitizeBio } from "@/lib/profile-content";
import { COMMUNICATION_LABELS, describeVerification, formatPrice } from "@/lib/verification";
import { pageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd, buildConsultantJsonLd, isEntitledToPractise } from "@/lib/seo/structured-data";
import { serializeJsonLd } from "@/lib/content-pipeline/seo";

export async function generateMetadata({ params }: { params: Promise<{ license_number: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await getConsultantByLicense(resolvedParams.license_number);
  if (!data) return { title: "Consultant Not Found", robots: { index: false, follow: true } };
  const entitled = isEntitledToPractise(data.Status);
  const where = data.Province || "Canada";
  const at = data.Company ? ` at ${data.Company}` : "";
  return pageMetadata({
    title: `${data.Full_Name}, RCIC #${data.License_Number}`,
    description: entitled
      ? `${data.Full_Name} (CICC licence ${data.License_Number})${at} is listed on the CICC register as entitled to practise. Areas of practice and consultation booking in ${where}.`
      : `The CICC public register lists ${data.Full_Name} (licence ${data.License_Number}) as not currently entitled to practise. Check the register before hiring any consultant.`,
    path: `/consultant/${encodeURIComponent(data.License_Number)}`,
    type: "profile",
    // YMYL: keep profiles the register marks as not entitled out of the index so
    // search results never present them as licensed help.
    noindex: !entitled,
  });
}

// Shared focus ring: the browser default is invisible on mist.
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2";
// Text links: teal fails AA at body size, so links are navy with a teal underline.
const TEXT_LINK = `font-semibold text-navy underline decoration-teal decoration-2 underline-offset-4 hover:decoration-navy ${FOCUS}`;
const PRIMARY_BTN = `flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-ink ${FOCUS}`;

function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(rating) ? "fill-warning text-warning" : "text-gray-300"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

function CommIcon({ type }: { type: string }) {
  if (type === "PHONE") return <Phone className="h-3.5 w-3.5" aria-hidden="true" />;
  if (type === "IN_PERSON") return <Users className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Video className="h-3.5 w-3.5" aria-hidden="true" />;
}

/** Status dot + label. Colour sits on the dot; the text stays ink so it passes contrast. */
function StatusLine({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral"; children: ReactNode }) {
  const dot = { good: "bg-success", warn: "bg-warning", bad: "bg-error", neutral: "bg-gray-400" }[tone];
  return (
    <span className="inline-flex items-center gap-2 font-bold text-ink">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {children}
    </span>
  );
}

function SectionHeading({ id, children, action }: { id: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="text-2xl font-bold tracking-tight text-navy">{children}</h2>
      {action}
    </div>
  );
}

function parseSpecializations(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return local && domain ? `${local.slice(0, 2)}***@${domain}` : "***";
}

export default async function ConsultantProfilePage({ params }: { params: Promise<{ license_number: string }> }) {
  const resolvedParams = await params;
  const data = await getConsultantByLicense(resolvedParams.license_number.toUpperCase());
  if (!data) notFound();

  const dbProfile = await prisma.consultantProfile.findUnique({
    where: { licenseNumber: data.License_Number },
    include: {
      companyEnrichments: true,
      consultationTypes: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
      weeklyAvailability: { where: { isActive: true }, select: { id: true } },
    },
  });

  const isClaimed = !!dbProfile?.userId;
  const licenceActive = isRegistryActive(data.Status);
  const trust = describeVerification(isClaimed, dbProfile?.verificationLevel);
  const gate = dbProfile ? canAcceptBookings(dbProfile) : { ok: false as const, error: "This profile has not been claimed by the consultant yet." };
  // Seeded consultation types on unclaimed profiles are not the consultant's prices: only show claimed ones.
  const consultationTypes = isClaimed ? dbProfile?.consultationTypes ?? [] : [];
  const bookable = gate.ok && consultationTypes.length > 0 && (dbProfile?.weeklyAvailability.length ?? 0) > 0;

  const profileId = dbProfile?.id ?? "__none__";
  const [reviews, ratingAgg, isSaved] = await Promise.all([
    prisma.review.findMany({
      where: { consultantProfileId: profileId, status: "PUBLISHED" },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.review.aggregate({
      where: { consultantProfileId: profileId, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    checkIsSaved(data.License_Number),
  ]);
  const rating = summarizeRatings(ratingAgg);

  const specializations = ALL_SPECIALIZATION_ITEMS.filter((item) => parseSpecializations(dbProfile?.specializations).includes(item.key));
  const languages = isClaimed && dbProfile?.languages ? dbProfile.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];
  const bioHtml = isClaimed ? sanitizeBio(dbProfile?.bio) : "";
  const displayEnrichments = (dbProfile?.companyEnrichments ?? []).filter(
    (e) => ["ambiguous", "matched", "consultant_verified"].includes(e.matchStatus ?? "") && e.registryNumber
  );
  const location = [dbProfile?.city, data.Province, data.Country].filter(Boolean).join(", ") || "Canada";
  const firstName = firstNameOf(data.Full_Name);

  const [relatedCountSetting, articlesCountSetting] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: "consultantRelatedCount" } }),
    prisma.platformSetting.findUnique({ where: { key: "consultantRelatedArticlesCount" } }),
  ]);
  const limitRelated = Math.min(parseInt(relatedCountSetting?.value || "3", 10) || 3, 12);
  const limitArticles = Math.min(parseInt(articlesCountSetting?.value || "3", 10) || 3, 12);

  const [related, relatedArticles] = await Promise.all([
    prisma.consultantProfile.findMany({
      where: {
        licenseNumber: { not: data.License_Number },
        status: { in: ["Yes", "Active"] },
        ...(data.Province ? { province: data.Province } : {}),
      },
      select: { licenseNumber: true, fullName: true, company: true, city: true, province: true, languages: true, avatarImage: true, userId: true },
      orderBy: [{ userId: { sort: "asc", nulls: "last" } }, { fullName: "asc" }],
      take: limitRelated,
    }),
    getRelatedArticles(specializations.map((s) => s.label), limitArticles),
  ]);

  // Structured data: Person (entitled RCICs only) + breadcrumbs.
  const personLd = buildConsultantJsonLd({
    licenseNumber: data.License_Number,
    fullName: data.Full_Name,
    status: data.Status,
    company: data.Company,
    province: data.Province,
    specializations: specializations.map((s) => s.label),
    languages,
  });
  const crumbLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Find a consultant", path: "/search" },
    { name: data.Full_Name, path: `/consultant/${encodeURIComponent(data.License_Number)}` },
  ]);
  const jsonLd = [personLd, crumbLd].filter(Boolean).map((ld) => serializeJsonLd(ld));

  const bookHref = `/consultant/${data.License_Number}/book`;
  const claimHref = `/claim/${data.License_Number}`;
  const fromPrice = consultationTypes.length > 0 ? formatPrice(consultationTypes[0].priceCents) : null;
  const identityTone = trust.tone === "verified" || trust.tone === "partial" ? "good" : trust.tone === "pending" ? "warn" : "neutral";
  const IdentityIcon = trust.tone === "unclaimed" ? Lock : trust.tone === "pending" ? Clock : BadgeCheck;
  const notBookableReason = !gate.ok
    ? gate.error
    : consultationTypes.length === 0
      ? `${firstName} hasn't published consultation types yet.`
      : `${firstName} hasn't set availability yet.`;
  // Mobile bottom bar only when there is one clear action to take.
  const mobileAction = bookable ? "book" : !isClaimed ? "claim" : null;

  // The single action panel. Rendered under the hero on mobile and in the rail on desktop.
  const actionPanel = (
    <section aria-label={bookable ? "Book a consultation" : "Booking"} className="rounded-2xl border border-gray-200 bg-mist p-6">
      {bookable ? (
        <>
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
            <CalendarDays className="h-5 w-5 text-teal" aria-hidden="true" /> Book a consultation
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            {consultationTypes.length} option{consultationTypes.length === 1 ? "" : "s"}, from{" "}
            <strong className="text-base tabular-nums text-navy">{fromPrice}</strong>
          </p>
          <p className="mt-1 text-xs text-gray-600">Pick a time on the next page. Times show in your time zone.</p>
          <Link href={bookHref} className={`${PRIMARY_BTN} mt-5`}>
            See available times <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <ul className="mt-5 space-y-2.5 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-700">
            <li className="flex gap-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" /> Payment held in escrow by Stripe until the consultant accepts.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" /> Declined or cancelled before the session: released or refunded in full.</li>
          </ul>
        </>
      ) : (
        <>
          {!isClaimed && (
            <div className="mb-5 border-b border-gray-200 pb-5">
              <h2 className="text-lg font-bold leading-snug text-navy">Are you {data.Full_Name}?</h2>
              <p className="mt-1 text-sm text-gray-700">Claim this profile with your CICC register email to add your photo, services and availability.</p>
              <Link href={claimHref} className={`${PRIMARY_BTN} mt-4`}>
                Claim this profile <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
          <h2 className={isClaimed ? "text-lg font-bold text-navy" : "text-sm font-bold text-navy"}>Online booking isn&apos;t available</h2>
          <p className="mt-1 text-sm text-gray-700">{notBookableReason}</p>
          <Link href="/search" className={`mt-3 inline-flex min-h-11 items-center gap-1 text-sm ${TEXT_LINK}`}>
            Find a bookable consultant <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </>
      )}
      <div className="mt-5">
        <SaveProfileButton licenseNumber={data.License_Number} initialIsSaved={isSaved} />
      </div>
    </section>
  );

  return (
    <div className={`flex min-h-screen flex-col bg-white font-sans text-ink ${mobileAction ? "pb-24 lg:pb-0" : ""}`}>
      <TrackPageView eventName="profile_view" specialization="Immigration Consulting" />
      {jsonLd.map((ld, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />)}
      <Header />

      <main className="flex-1">
        {/* ───────────── HERO: identity + register record ───────────── */}
        <section className="border-b border-gray-200 bg-mist pt-28 lg:pt-36">
          <div className="mx-auto max-w-7xl px-6 pb-10 lg:px-8 lg:pb-12">
            <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 items-center gap-2 text-sm text-gray-600">
              <Link href="/search" className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded font-semibold text-navy hover:text-teal ${FOCUS}`}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Find a consultant
              </Link>
              <span aria-hidden="true">/</span>
              <span className="truncate" aria-current="page">{data.Full_Name}</span>
            </nav>

            {dbProfile?.coverImage && isClaimed && (
              <div className="mb-8 aspect-[3/1] overflow-hidden rounded-3xl bg-white md:aspect-[5/1]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dbProfile.coverImage} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            {/* Phones get the compact avatar so the record and the action stay near the fold. */}
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-4 sm:gap-x-8 sm:gap-y-3">
              <div className="sm:hidden">
                <ConsultantAvatar name={data.Full_Name} src={isClaimed ? dbProfile?.avatarImage : null} size="md" />
              </div>
              <div className="hidden sm:row-span-2 sm:block">
                <ConsultantAvatar name={data.Full_Name} src={isClaimed ? dbProfile?.avatarImage : null} size="lg" />
              </div>
              <div className="min-w-0 sm:self-end">
                <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight text-navy sm:text-4xl md:text-5xl">
                  {data.Full_Name}, RCIC
                </h1>
                <p className="mt-1 text-base text-gray-700 sm:mt-2 sm:text-lg">Regulated Canadian Immigration Consultant</p>
              </div>
              <p className="col-span-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-700 sm:col-span-1 sm:col-start-2 sm:self-start">
                {data.Company && (
                  <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-gray-500" aria-hidden="true" /> {data.Company}</span>
                )}
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-500" aria-hidden="true" /> {location}</span>
                {rating.average !== null ? (
                  <a href="#reviews" className={`inline-flex items-center gap-1.5 rounded font-semibold text-ink hover:text-navy ${FOCUS}`}>
                    <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                    <span className="tabular-nums">{rating.average.toFixed(1)}</span>
                    <span className="font-normal text-gray-600 underline decoration-gray-300 underline-offset-4">
                      {rating.count} review{rating.count === 1 ? "" : "s"}
                    </span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-gray-600"><Star className="h-4 w-4" aria-hidden="true" /> No reviews yet</span>
                )}
              </p>
            </div>

            {/* The register record, read at a glance. */}
            <dl className="mt-6 grid grid-cols-1 divide-y sm:mt-8 divide-gray-200 rounded-2xl border border-gray-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:block sm:p-5">
                <dt className="text-xs font-semibold text-gray-600">CICC licence <span className="tabular-nums text-ink">{data.License_Number}</span></dt>
                <dd className="text-end text-sm sm:mt-1.5 sm:text-start sm:text-base">
                  <StatusLine tone={licenceActive ? "good" : "bad"}>
                    {licenceActive ? "Entitled to practise" : "Not active on the register"}
                  </StatusLine>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:block sm:p-5">
                <dt className="text-xs font-semibold text-gray-600">Identity on Verixa</dt>
                <dd className="text-end text-sm sm:mt-1.5 sm:text-start sm:text-base">
                  <StatusLine tone={identityTone}>
                    <IdentityIcon className="h-4 w-4 text-gray-600" aria-hidden="true" />
                    {trust.label}
                  </StatusLine>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:block sm:p-5">
                <dt className="text-xs font-semibold text-gray-600">Online booking</dt>
                <dd className="text-end text-sm sm:mt-1.5 sm:text-start sm:text-base">
                  <StatusLine tone={bookable ? "good" : "neutral"}>
                    {bookable ? "Escrow-protected booking" : "Not available yet"}
                  </StatusLine>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ───────────── BODY + RAIL ───────────── */}
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:flex-row lg:gap-16 lg:px-8 lg:py-16">
          <div className="lg:hidden">{actionPanel}</div>

          <div className="min-w-0 flex-1 divide-y divide-gray-200 [&>section]:py-10 [&>section:first-child]:pt-0">
            {/* About */}
            <section aria-labelledby="about">
              <SectionHeading id="about">About {firstName}</SectionHeading>
              {bioHtml ? (
                <div
                  className="prose max-w-[68ch] break-words text-gray-700 prose-headings:text-navy prose-a:text-navy prose-a:decoration-teal prose-a:underline-offset-4 prose-strong:text-ink"
                  dangerouslySetInnerHTML={{ __html: bioHtml }}
                />
              ) : (
                <p className="max-w-[68ch] text-base leading-relaxed text-gray-700">
                  {data.Full_Name} is listed on the College of Immigration and Citizenship Consultants (CICC) public register under licence{" "}
                  <span className="font-semibold tabular-nums text-navy">{data.License_Number}</span>
                  {data.Company ? <>, practising with {data.Company}</> : null}.{" "}
                  {isClaimed ? `${firstName} hasn't added a bio yet.` : "The consultant hasn't claimed this profile, so details beyond the register aren't available."}
                </p>
              )}
            </section>

            {/* Practice areas — only what the consultant chose */}
            {specializations.length > 0 && (
              <section aria-labelledby="practice">
                <SectionHeading id="practice">Areas of practice</SectionHeading>
                <ul className="flex flex-wrap gap-2">
                  {specializations.map((item) => (
                    <li key={item.key} className="rounded-full border border-gray-200 bg-mist px-3.5 py-1.5 text-sm font-semibold text-navy">{item.label}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Services */}
            {consultationTypes.length > 0 && (
              <section aria-labelledby="services">
                <SectionHeading id="services">Consultations</SectionHeading>
                <ul className="divide-y divide-gray-200 border-y border-gray-200">
                  {consultationTypes.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-4 py-5">
                      <div className="min-w-0">
                        <h3 className="font-bold text-ink">{t.title}</h3>
                        {t.description && <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-gray-700">{t.description}</p>}
                        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-600">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {t.durationMinutes} min</span>
                          <span className="inline-flex items-center gap-1"><CommIcon type={t.communicationType} /> {COMMUNICATION_LABELS[t.communicationType] ?? t.communicationType}</span>
                        </p>
                      </div>
                      <span className="shrink-0 text-lg font-bold tabular-nums text-navy">{formatPrice(t.priceCents)}</span>
                    </li>
                  ))}
                </ul>
                {bookable && (
                  <Link href={bookHref} className={`mt-5 inline-flex min-h-11 items-center gap-1 text-sm ${TEXT_LINK}`}>
                    Choose a time <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </section>
            )}

            {/* Corporate records */}
            {displayEnrichments.length > 0 && (
              <section aria-labelledby="corporate">
                <SectionHeading id="corporate">Company registration</SectionHeading>
                <div className="space-y-8">
                  {displayEnrichments.map((e) => {
                    const label = e.matchStatus === "consultant_verified" ? "Confirmed by the consultant" : e.matchStatus === "matched" ? "Matched to government registry" : "Automatic match, not yet reviewed";
                    return (
                      <div key={e.id}>
                        <p className="mb-3 text-sm">
                          <StatusLine tone={e.matchStatus === "ambiguous" ? "warn" : "good"}>{label}</StatusLine>
                        </p>
                        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-gray-200 pt-4 text-sm sm:grid-cols-2">
                          <div><dt className="text-xs font-semibold text-gray-600">Legal name</dt><dd className="mt-0.5 font-semibold text-ink">{e.matchedLegalName || "—"}</dd></div>
                          <div><dt className="text-xs font-semibold text-gray-600">Jurisdiction</dt><dd className="mt-0.5 font-semibold text-ink">{e.jurisdiction || "—"}</dd></div>
                          <div><dt className="text-xs font-semibold text-gray-600">Registry number</dt><dd className="mt-0.5 font-semibold tabular-nums text-ink">{e.registryNumber}</dd></div>
                          <div><dt className="text-xs font-semibold text-gray-600">Incorporated</dt><dd className="mt-0.5 font-semibold tabular-nums text-ink">{e.incorporationDate ? new Date(e.incorporationDate).toLocaleDateString("en-CA") : "—"}</dd></div>
                        </dl>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-28">
              <SectionHeading id="reviews-title" action={<GuestReviewButton licenseNumber={data.License_Number} consultantName={firstName} />}>
                Client reviews
              </SectionHeading>

              {rating.average !== null && (
                <p className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                  <span className="text-3xl font-bold tabular-nums text-navy">{rating.average.toFixed(1)}</span>
                  <Stars rating={rating.average} />
                  <span>from {rating.count} published review{rating.count === 1 ? "" : "s"}</span>
                </p>
              )}

              {reviews.length > 0 ? (
                <ul className="divide-y divide-gray-200 border-y border-gray-200">
                  {reviews.map((review) => {
                    const verified = !!review.userId && !!review.bookingId;
                    const name = verified ? review.user?.name?.split(" ")[0] || "Verixa client" : review.guestName || "Guest";
                    return (
                      <li key={review.id} className="py-6">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <Stars rating={review.rating} size="h-3.5 w-3.5" />
                          <time dateTime={new Date(review.createdAt).toISOString()} className="text-xs text-gray-600">
                            {new Date(review.createdAt).toLocaleDateString("en-CA", { month: "short", year: "numeric" })}
                          </time>
                        </div>
                        {review.comment && <p className="mb-3 max-w-[68ch] text-base leading-relaxed text-gray-700">{review.comment}</p>}
                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                          {name}
                          {verified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-ink">
                              <BadgeCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" /> Booked on Verixa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-xs font-semibold text-gray-700" title="Submitted without a Verixa booking; checked by our team before publishing.">
                              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> No Verixa booking
                            </span>
                          )}
                        </p>
                        {review.replyText && (
                          <div className="ms-4 mt-4 border-s border-gray-300 ps-4">
                            <p className="mb-1 text-xs font-bold text-navy">Reply from {firstName}</p>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{review.replyText}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-start gap-4 rounded-2xl bg-mist p-6">
                  <MessageSquare className="mt-0.5 h-6 w-6 shrink-0 text-gray-500" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-ink">No reviews yet</p>
                    <p className="mt-1 text-sm text-gray-700">Reviews from clients who booked through Verixa are marked as such.</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ───────────── RAIL ───────────── */}
          <aside className="flex w-full shrink-0 flex-col gap-6 self-start lg:sticky lg:top-28 lg:w-80 xl:w-96">
            <div className="hidden lg:block">{actionPanel}</div>

            {/* Verification */}
            <section aria-labelledby="verification" className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 id="verification" className="mb-4 flex items-center gap-2 text-base font-bold text-navy">
                <ShieldCheck className="h-5 w-5 text-teal" aria-hidden="true" /> Verification
              </h2>
              <ul className="space-y-5 text-sm">
                <li>
                  <p className="font-bold text-ink">CICC register</p>
                  <p className="mt-0.5 leading-relaxed text-gray-700">
                    Licence <span className="tabular-nums">{data.License_Number}</span> is listed as{" "}
                    {licenceActive ? "entitled to practise" : `"${data.Status}" (not active)`}.
                  </p>
                  <a
                    href="https://register.college-ic.ca/Public-Register-EN/RCIC_Search.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-1 inline-flex min-h-11 items-center gap-1 ${TEXT_LINK}`}
                  >
                    Check the register <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
                <li className="border-t border-gray-200 pt-5">
                  <p className="font-bold text-ink">Identity on Verixa</p>
                  <p className="mt-0.5 leading-relaxed text-gray-700">{trust.detail}</p>
                  {isClaimed && (
                    <ul className="mt-3 space-y-1.5 text-xs">
                      <li className="flex items-center gap-2 text-gray-700">
                        <Mail className={`h-3.5 w-3.5 ${trust.emailMatched ? "text-success" : "text-gray-400"}`} aria-hidden="true" />
                        Email {trust.emailMatched ? "matches register" : "not matched"}
                      </li>
                      <li className="flex items-center gap-2 text-gray-700">
                        <Phone className={`h-3.5 w-3.5 ${trust.phoneMatched ? "text-success" : "text-gray-400"}`} aria-hidden="true" />
                        Phone {trust.phoneMatched ? "matches register" : "not matched"}
                      </li>
                    </ul>
                  )}
                </li>
              </ul>
            </section>

            {/* Contact & details */}
            <section aria-labelledby="details" className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 id="details" className="mb-4 text-base font-bold text-navy">Details</h2>
              <dl className="space-y-4 text-sm">
                {languages.length > 0 && (
                  <div className="flex gap-3">
                    <Languages className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                    <div><dt className="text-xs font-semibold text-gray-600">Languages</dt><dd className="font-semibold text-ink">{languages.join(", ")}</dd></div>
                  </div>
                )}
                {dbProfile?.offersInPerson && dbProfile.officeAddress && isClaimed && (
                  <div className="flex gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                    <div><dt className="text-xs font-semibold text-gray-600">Office</dt><dd className="font-semibold text-ink">{dbProfile.officeAddress}</dd></div>
                  </div>
                )}
                {dbProfile?.website && isClaimed && (
                  <div className="flex gap-3">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold text-gray-600">Website</dt>
                      <dd className="truncate">
                        <a href={dbProfile.website} target="_blank" rel="noopener noreferrer nofollow" className={TEXT_LINK}>
                          {dbProfile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
                {data.Email && (
                  <div className="flex gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold text-gray-600">Email (CICC register)</dt>
                      <dd className="truncate font-semibold text-ink">
                        {isClaimed ? (
                          <a href={`mailto:${data.Email}`} className={TEXT_LINK}>{data.Email}</a>
                        ) : (
                          <span title="Shown in full once the consultant claims the profile">{maskEmail(data.Email)}</span>
                        )}
                      </dd>
                    </div>
                  </div>
                )}
                {data.Phone && isClaimed && (
                  <div className="flex gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                    <div><dt className="text-xs font-semibold text-gray-600">Phone (CICC register)</dt><dd className="font-semibold tabular-nums text-ink">{data.Phone}</dd></div>
                  </div>
                )}
                {!isClaimed && (
                  <p className="border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-600">
                    Phone, website and office details appear once {firstName} claims this profile.
                  </p>
                )}
              </dl>
            </section>
          </aside>
        </div>

        {/* ───────────── RELATED ───────────── */}
        {(related.length > 0 || relatedArticles.length > 0) && (
          <section aria-label="More on Verixa" className="border-t border-gray-200 bg-mist">
            <div className="mx-auto max-w-7xl space-y-14 px-6 py-14 lg:px-8 lg:py-20">
              {related.length > 0 && (
                <div>
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
                      Other consultants{data.Province ? ` in ${data.Province}` : ""}
                    </h2>
                    <Link href="/search" className={`inline-flex min-h-11 items-center gap-1 text-sm ${TEXT_LINK}`}>
                      Search all RCICs <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {related.map((c) => (
                      <li key={c.licenseNumber}>
                        <ConsultantCard
                          variant="row"
                          standing="active"
                          consultant={{
                            licenseNumber: c.licenseNumber,
                            fullName: c.fullName,
                            company: c.company,
                            city: c.userId ? c.city : null,
                            province: c.province,
                            // Photos and languages are consultant-supplied: only for claimed profiles.
                            avatarImage: c.userId ? c.avatarImage : null,
                            languages: c.userId && c.languages ? c.languages.split(",").map((l) => l.trim()).filter(Boolean).slice(0, 3) : [],
                            claimed: !!c.userId,
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedArticles.length > 0 && (
                <div>
                  <h2 className="mb-6 text-2xl font-bold tracking-tight text-navy md:text-3xl">Helpful guides</h2>
                  <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedArticles.map((article) => (
                      <li key={article.id}>
                        <ArticleCard post={article} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ───────────── MOBILE ACTION BAR ───────────── */}
      {mobileAction && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_20px_-8px_rgba(15,42,68,0.18)] lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-navy">{data.Full_Name}</p>
              <p className="truncate text-xs text-gray-600">
                {mobileAction === "book" ? <>From <span className="tabular-nums">{fromPrice}</span> · escrow-protected</> : `Is this you, ${firstName}?`}
              </p>
            </div>
            <Link
              href={mobileAction === "book" ? bookHref : claimHref}
              className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-ink ${FOCUS}`}
            >
              {mobileAction === "book" ? "Book" : "Claim profile"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
