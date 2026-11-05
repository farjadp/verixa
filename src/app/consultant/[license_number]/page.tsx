// ============================================================================
// Route: /consultant/[license_number]
// Why: Public consultant profile — the trust surface a client checks before
//      booking. Everything shown is real data: CICC register fields, what the
//      consultant wrote after claiming, and published reviews. Nothing is
//      filled in with defaults.
// ============================================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ShieldCheck, Building2, MapPin, CalendarDays, Star, Clock, MessageSquare, Languages,
  Mail, Phone, Globe, Lock, BadgeCheck, AlertCircle, ArrowRight, ExternalLink, Video, Users,
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

function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(rating) ? "fill-warning text-warning" : "text-gray-200"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

function CommIcon({ type }: { type: string }) {
  if (type === "PHONE") return <Phone className="h-3.5 w-3.5" aria-hidden="true" />;
  if (type === "IN_PERSON") return <Users className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Video className="h-3.5 w-3.5" aria-hidden="true" />;
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
      select: { licenseNumber: true, fullName: true, company: true, province: true, avatarImage: true, userId: true },
      orderBy: [{ userId: { sort: "asc", nulls: "last" } }, { fullName: "asc" }],
      take: limitRelated,
    }),
    getRelatedArticles(specializations.map((s) => s.label), limitArticles),
  ]);

  const trustTone =
    trust.tone === "verified" || trust.tone === "partial"
      ? "border-success/30 bg-success/5 text-success"
      : trust.tone === "pending"
        ? "border-warning/30 bg-warning/5 text-warning"
        : "border-gray-200 bg-mist text-gray-600";

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

  return (
    <div className="min-h-screen bg-mist pt-[80px] font-sans text-ink lg:pt-[88px]">
      <TrackPageView eventName="profile_view" specialization="Immigration Consulting" />
      {jsonLd.map((ld, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />)}
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-200 bg-white">
        {dbProfile?.coverImage && isClaimed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dbProfile.coverImage} alt="" className="h-40 w-full object-cover md:h-56" />
        ) : (
          <div className="h-24 w-full bg-gradient-to-r from-navy via-navy to-softblue md:h-32" aria-hidden="true" />
        )}

        <div className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <div className="-mt-14 md:-mt-16">
              <ConsultantAvatar name={data.Full_Name} src={isClaimed ? dbProfile?.avatarImage : null} size="lg" className="border-4 border-white shadow-lg shadow-navy/10" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">{data.Full_Name}, RCIC</h1>
              <p className="mt-1 text-sm text-gray-600">Regulated Canadian Immigration Consultant</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-600">
                {data.Company && (
                  <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-gray-400" aria-hidden="true" /> {data.Company}</span>
                )}
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-400" aria-hidden="true" /> {location}</span>
                {rating.average !== null ? (
                  <a href="#reviews" className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-teal">
                    <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" /> {rating.average.toFixed(1)}
                    <span className="font-normal text-gray-500">({rating.count} review{rating.count === 1 ? "" : "s"})</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-gray-500"><Star className="h-4 w-4" aria-hidden="true" /> No reviews yet</span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${licenceActive ? "border-success/30 bg-success/5 text-success" : "border-error/30 bg-error/5 text-error"}`}>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  CICC licence {data.License_Number} · {licenceActive ? "Active" : "Not active"}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${trustTone}`}>
                  {trust.tone === "unclaimed" ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : trust.tone === "pending" ? <Clock className="h-3.5 w-3.5" aria-hidden="true" /> : <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                  {trust.label}
                </span>
                {bookable && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/5 px-3 py-1 text-xs font-semibold text-teal">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Escrow-protected booking
                  </span>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2.5 md:w-56">
              {bookable ? (
                <Link href={`/consultant/${data.License_Number}/book`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white transition hover:bg-ink">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> Book a consultation
                </Link>
              ) : !isClaimed ? (
                <Link href={`/claim/${data.License_Number}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal px-5 text-sm font-bold text-white transition hover:bg-navy">
                  Is this you? Claim profile
                </Link>
              ) : null}
              <SaveProfileButton licenseNumber={data.License_Number} initialIsSaved={isSaved} />
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY ─────────────────────────────────────────────────────── */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:px-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* About */}
          <section aria-labelledby="about">
            <h2 id="about" className="mb-3 text-lg font-bold text-navy">About</h2>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-[15px] leading-relaxed text-gray-700">
              {bioHtml ? (
                <div className="prose prose-sm max-w-none break-words md:prose-base prose-a:text-teal" dangerouslySetInnerHTML={{ __html: bioHtml }} />
              ) : (
                <p>
                  {data.Full_Name} is listed on the College of Immigration and Citizenship Consultants (CICC) public register under licence{" "}
                  <span className="font-mono font-semibold text-navy">{data.License_Number}</span>
                  {data.Company ? <>, practising with {data.Company}</> : null}.{" "}
                  {isClaimed ? `${firstName} hasn't added a bio yet.` : "The consultant hasn't claimed this profile, so details beyond the register aren't available."}
                </p>
              )}
            </div>
          </section>

          {/* Practice areas — only what the consultant chose */}
          {specializations.length > 0 && (
            <section aria-labelledby="practice">
              <h2 id="practice" className="mb-3 text-lg font-bold text-navy">Areas of practice</h2>
              <ul className="flex flex-wrap gap-2">
                {specializations.map((item) => (
                  <li key={item.key} className="rounded-full border border-teal/30 bg-white px-3.5 py-1.5 text-sm font-medium text-navy">{item.label}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Services */}
          {consultationTypes.length > 0 && (
            <section aria-labelledby="services">
              <h2 id="services" className="mb-3 text-lg font-bold text-navy">Consultations</h2>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {consultationTypes.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink">{t.title}</h3>
                      {t.description && <p className="mt-1 text-sm text-gray-600">{t.description}</p>}
                      <p className="mt-2 flex flex-wrap gap-x-4 text-xs font-medium text-gray-500">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {t.durationMinutes} min</span>
                        <span className="inline-flex items-center gap-1"><CommIcon type={t.communicationType} /> {COMMUNICATION_LABELS[t.communicationType] ?? t.communicationType}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-base font-bold text-navy">{formatPrice(t.priceCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Corporate records */}
          {displayEnrichments.length > 0 && (
            <section aria-labelledby="corporate">
              <h2 id="corporate" className="mb-3 text-lg font-bold text-navy">Company registration</h2>
              <div className="space-y-3">
                {displayEnrichments.map((e) => {
                  const label = e.matchStatus === "consultant_verified" ? "Confirmed by the consultant" : e.matchStatus === "matched" ? "Matched to government registry" : "Automatic match, not yet reviewed";
                  return (
                    <div key={e.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <p className={`mb-3 text-xs font-semibold ${e.matchStatus === "ambiguous" ? "text-warning" : "text-success"}`}>{label}</p>
                      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs text-gray-500">Legal name</dt><dd className="font-semibold text-ink">{e.matchedLegalName || "—"}</dd></div>
                        <div><dt className="text-xs text-gray-500">Jurisdiction</dt><dd className="font-semibold text-ink">{e.jurisdiction || "—"}</dd></div>
                        <div><dt className="text-xs text-gray-500">Registry number</dt><dd className="font-mono font-semibold text-ink">{e.registryNumber}</dd></div>
                        <div><dt className="text-xs text-gray-500">Incorporated</dt><dd className="font-semibold text-ink">{e.incorporationDate ? new Date(e.incorporationDate).toLocaleDateString("en-CA") : "—"}</dd></div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-28">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="reviews-title" className="flex items-center gap-3 text-lg font-bold text-navy">
                Client reviews
                {rating.average !== null && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Stars rating={rating.average} /> {rating.average.toFixed(1)} · {rating.count}
                  </span>
                )}
              </h2>
              <GuestReviewButton licenseNumber={data.License_Number} consultantName={firstName} />
            </div>

            {reviews.length > 0 ? (
              <ul className="space-y-3">
                {reviews.map((review) => {
                  const verified = !!review.userId && !!review.bookingId;
                  const name = verified ? review.user?.name?.split(" ")[0] || "Verixa client" : review.guestName || "Guest";
                  return (
                    <li key={review.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <Stars rating={review.rating} size="h-3.5 w-3.5" />
                        <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString("en-CA", { month: "short", year: "numeric" })}</span>
                      </div>
                      {review.comment && <p className="mb-3 text-[15px] leading-relaxed text-gray-700">{review.comment}</p>}
                      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
                        {name}
                        {verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-success"><BadgeCheck className="h-3 w-3" aria-hidden="true" /> Booked on Verixa</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-gray-500" title="Submitted without a Verixa booking; checked by our team before publishing.">
                            <AlertCircle className="h-3 w-3" aria-hidden="true" /> No Verixa booking
                          </span>
                        )}
                      </p>
                      {review.replyText && (
                        <div className="mt-4 rounded-xl border-l-4 border-teal bg-mist p-4">
                          <p className="mb-1 text-xs font-bold text-navy">Reply from {firstName}</p>
                          <p className="whitespace-pre-line text-sm text-gray-700">{review.replyText}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-gray-600">No reviews yet</p>
                <p className="mt-1 text-xs text-gray-500">Reviews from clients who booked through Verixa are marked as such.</p>
              </div>
            )}
          </section>
        </div>

        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="space-y-5 lg:sticky lg:top-28">
            {/* Booking */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy">
                <CalendarDays className="h-4 w-4 text-teal" aria-hidden="true" /> Book a consultation
              </h2>
              {bookable ? (
                <>
                  <p className="mb-1 text-sm text-gray-600">
                    {consultationTypes.length} option{consultationTypes.length === 1 ? "" : "s"}, from{" "}
                    <strong className="text-navy">{formatPrice(consultationTypes[0].priceCents)}</strong>
                  </p>
                  <p className="mb-5 text-xs text-gray-500">Pick a time on the next page. Times show in your time zone.</p>
                  <Link href={`/consultant/${data.License_Number}/book`} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-white hover:bg-ink">
                    See available times <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <ul className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-600">
                    <li className="flex gap-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" /> Payment held in escrow by Stripe until the consultant accepts.</li>
                    <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" /> Declined or cancelled before the session: released or refunded in full.</li>
                  </ul>
                </>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-mist p-4 text-sm text-gray-600">
                  <p className="font-semibold text-ink">Online booking isn&apos;t available</p>
                  <p className="mt-1">
                    {!gate.ok
                      ? gate.error
                      : consultationTypes.length === 0
                        ? `${firstName} hasn't published consultation types yet.`
                        : `${firstName} hasn't set availability yet.`}
                  </p>
                  <Link href="/search" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline">
                    Find a bookable consultant <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>

            {/* Verification */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy">
                <ShieldCheck className="h-4 w-4 text-teal" aria-hidden="true" /> Verification
              </h2>
              <ul className="space-y-4 text-sm">
                <li>
                  <p className="font-semibold text-ink">CICC register</p>
                  <p className="text-gray-600">
                    Licence {data.License_Number} is listed as {licenceActive ? "entitled to practise" : `"${data.Status}" (not active)`}.{" "}
                    <a href="https://register.college-ic.ca/Public-Register-EN/RCIC_Search.aspx" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-teal hover:underline">
                      Check the register <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-ink">Identity on Verixa</p>
                  <p className="text-gray-600">{trust.detail}</p>
                  {isClaimed && (
                    <p className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${trust.emailMatched ? "bg-success/10 text-success" : "bg-mist text-gray-500"}`}>
                        <Mail className="h-3 w-3" aria-hidden="true" /> Email {trust.emailMatched ? "matches register" : "not matched"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${trust.phoneMatched ? "bg-success/10 text-success" : "bg-mist text-gray-500"}`}>
                        <Phone className="h-3 w-3" aria-hidden="true" /> Phone {trust.phoneMatched ? "matches register" : "not matched"}
                      </span>
                    </p>
                  )}
                </li>
              </ul>
            </div>

            {/* Contact & details */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-bold text-navy">Details</h2>
              <dl className="space-y-4 text-sm">
                {languages.length > 0 && (
                  <div className="flex gap-3">
                    <Languages className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <div><dt className="text-xs text-gray-500">Languages</dt><dd className="font-medium text-ink">{languages.join(", ")}</dd></div>
                  </div>
                )}
                {dbProfile?.offersInPerson && dbProfile.officeAddress && isClaimed && (
                  <div className="flex gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <div><dt className="text-xs text-gray-500">Office</dt><dd className="font-medium text-ink">{dbProfile.officeAddress}</dd></div>
                  </div>
                )}
                {dbProfile?.website && isClaimed && (
                  <div className="flex gap-3">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Website</dt>
                      <dd><a href={dbProfile.website} target="_blank" rel="noopener noreferrer nofollow" className="block truncate font-medium text-teal hover:underline">{dbProfile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></dd>
                    </div>
                  </div>
                )}
                {data.Email && (
                  <div className="flex gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Email (CICC register)</dt>
                      <dd className="truncate font-medium text-ink">
                        {isClaimed ? <a href={`mailto:${data.Email}`} className="text-teal hover:underline">{data.Email}</a> : <span title="Shown in full once the consultant claims the profile">{maskEmail(data.Email)}</span>}
                      </dd>
                    </div>
                  </div>
                )}
                {data.Phone && isClaimed && (
                  <div className="flex gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <div><dt className="text-xs text-gray-500">Phone (CICC register)</dt><dd className="font-medium text-ink">{data.Phone}</dd></div>
                  </div>
                )}
              </dl>
            </div>

            {!isClaimed && (
              <div className="rounded-2xl border border-teal/30 bg-white p-6">
                <p className="text-sm font-semibold text-navy">Are you {data.Full_Name}?</p>
                <p className="mt-1 text-sm text-gray-600">Claim this profile with your CICC register email to add your photo, services and availability.</p>
                <Link href={`/claim/${data.License_Number}`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-teal hover:underline">
                  Claim profile <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* ── RELATED ──────────────────────────────────────────────────── */}
      {(related.length > 0 || relatedArticles.length > 0) && (
        <section className="mx-auto max-w-6xl border-t border-gray-200 px-4 py-10 md:px-6">
          {related.length > 0 && (
            <div className="mb-12">
              <h2 className="mb-5 text-xl font-bold text-navy">Other consultants{data.Province ? ` in ${data.Province}` : ""}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((c) => (
                  <Link key={c.licenseNumber} href={`/consultant/${c.licenseNumber}`} className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:shadow-lg hover:shadow-navy/5">
                    <ConsultantAvatar name={c.fullName} src={c.userId ? c.avatarImage : null} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy group-hover:text-teal">{c.fullName}, RCIC</p>
                      <p className="truncate text-xs text-gray-500">{c.company || "Independent practice"}</p>
                      <p className="mt-1 text-[11px] font-semibold text-gray-500">Licence {c.licenseNumber}{c.userId ? " · On Verixa" : ""}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {relatedArticles.length > 0 && (
            <div>
              <h2 className="mb-5 text-xl font-bold text-navy">Helpful guides</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedArticles.map((article) => (
                  <Link key={article.id} href={`/blog/${article.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-lg hover:shadow-navy/5">
                    {article.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={article.coverImage} alt="" className="h-40 w-full object-cover" />
                    ) : (
                      <div className="h-40 w-full bg-gradient-to-br from-navy to-teal" aria-hidden="true" />
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <span className="mb-2 text-[11px] font-bold uppercase tracking-wide text-teal">{article.category.replace(/_/g, " ")}</span>
                      <h3 className="mb-2 line-clamp-2 font-semibold text-navy group-hover:text-teal">{article.title}</h3>
                      <p className="line-clamp-3 text-sm text-gray-600">{article.summary}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <Footer />
    </div>
  );
}
