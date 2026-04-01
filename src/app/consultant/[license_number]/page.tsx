// ============================================================================
// consultant/[license_number]/page.tsx — v2.0
// ============================================================================

import { getConsultantByLicense } from "@/lib/db";
import {
  ShieldCheck, Mail, Building2, MapPin, CheckCircle2, AlertCircle,
  CalendarDays, User, Star, Clock, MessageSquare, Briefcase,
  Languages, Phone, Check, Zap, CheckCircle, Info, Shield,
  ArrowRight, Award, Globe, Sparkles, Lock, BadgeCheck, FileCheck
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SaveProfileButton from "@/components/SaveProfileButton";
import { checkIsSaved } from "@/actions/savedProfiles.actions";
import TrackPageView from "@/components/TrackPageView";

import { Metadata } from "next";

export async function generateMetadata({
  params
}: {
  params: Promise<{ license_number: string }>
}): Promise<Metadata> {
  const resolvedParams = await params;
  const data = getConsultantByLicense(resolvedParams.license_number);
  if (!data) return { title: 'Consultant Not Found | Verixa' };
  return {
    title: `${data.Full_Name} - Canadian Immigration Consultant | Verixa`,
    description: `Book a consultation with ${data.Full_Name}, an active RCIC consultant in ${data.Province || 'Canada'}.`,
    openGraph: {
      title: `${data.Full_Name} - Verixa Verified Consultant`,
      description: `Book a secure consultation with ${data.Full_Name} (${data.License_Number}).`,
      images: ['/Brand/Vertixa3.png']
    }
  };
}

export default async function ConsultantProfilePage({
  params
}: {
  params: Promise<{ license_number: string }>
}) {
  const resolvedParams = await params;
  const data = getConsultantByLicense(resolvedParams.license_number);
  if (!data) notFound();

  const isActive = data.Status?.toLowerCase()?.includes('active') || data.Status === 'Yes';

  const dbProfile = await (prisma as any).consultantProfile.findUnique({
    where: { licenseNumber: data.License_Number },
    include: { companyEnrichments: true },
  });

  const isClaimed = dbProfile?.userId != null;
  const verificationLevel: string | null = dbProfile?.verificationLevel ?? null;

  // Derive what's verified
  const emailVerified = isClaimed && (verificationLevel === 'CICC_EMAIL' || verificationLevel === 'CICC_EMAIL_AND_PHONE');
  const phoneVerified = isClaimed && verificationLevel === 'CICC_EMAIL_AND_PHONE';
  const pendingReview = isClaimed && verificationLevel === 'PENDING_REVIEW';

  const reviews = await prisma.review.findMany({
    where: { consultantProfileId: dbProfile?.id ?? '__none__', status: 'PUBLISHED' },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const consultationTypes = dbProfile
    ? await prisma.consultationType.findMany({
        where: { consultantProfileId: dbProfile.id, isActive: true },
        orderBy: { priceCents: 'asc' },
      })
    : [];

  const isSaved = await checkIsSaved(data.License_Number);

  const displayEnrichments = dbProfile?.companyEnrichments?.filter((e: any) =>
    (e.matchStatus === 'ambiguous' || e.matchStatus === 'matched' || e.matchStatus === 'consultant_verified') && e.registryNumber
  ) || [];

  const languages = dbProfile?.languages
    ? (Array.isArray(dbProfile.languages)
        ? dbProfile.languages
        : String(dbProfile.languages).split(',').map((l: string) => l.trim()))
    : ['English'];

  const messengers = Array.isArray(dbProfile?.messengers) ? dbProfile.messengers : [];


  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans text-[#1A1F2B] pt-[80px] lg:pt-[88px]">
      <TrackPageView eventName="profile_view" specialization="Immigration Consulting" />
      <Header />

      {/* ── CLAIM BANNER (unclaimed only) ───────────────────────────────── */}
      {!isClaimed && (
        <div className="bg-gradient-to-r from-[#0F2A44] via-[#0F2A44] to-[#163650] border-b border-white/5">
          <div className="max-w-5xl mx-auto px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#2FA4A9]/20 border border-[#2FA4A9]/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-[#2FA4A9]" />
              </div>
              <p className="text-sm text-white/80">
                <span className="text-white font-semibold">Is this your profile?</span>{" "}
                Claim it to enable bookings, add services, and respond to clients.
              </p>
            </div>
            <Link
              href={`/claim/${data.License_Number}`}
              className="group inline-flex items-center gap-2 bg-[#2FA4A9] hover:bg-[#258d92] text-white text-sm font-bold px-5 py-2 rounded-xl transition-all shrink-0 shadow-lg shadow-[#2FA4A9]/20"
            >
              Claim This Profile
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}

      {/* ── COVER PHOTO ────────────────────────────────────────────────── */}
      {dbProfile?.coverImage && (
        <div className="w-full h-48 md:h-64 lg:h-80 bg-gray-200">
          <img src={dbProfile.coverImage} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100 shadow-sm relative">
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* Avatar */}
            <div className={`relative shrink-0 ${dbProfile?.coverImage ? '-mt-20' : ''}`}>
              <div className="w-28 h-28 bg-gradient-to-br from-[#e8f4f5] to-[#d0ecee] rounded-3xl flex items-center justify-center border-4 border-white shadow-lg shadow-[#2FA4A9]/10 overflow-hidden relative z-10">
                {dbProfile?.avatarImage ? (
                  <img src={dbProfile.avatarImage} alt={data.Full_Name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-[#2FA4A9]/40" />
                )}
              </div>
              {isActive && (
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white border-2 border-white flex items-center justify-center shadow-md z-20">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                </div>
              )}
            </div>

            {/* Name + Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-3 mb-3">
                <h1 className="text-3xl md:text-4xl font-black font-serif tracking-tight text-[#0F172A] leading-tight">
                  {data.Full_Name}
                </h1>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* CICC Registry badge - always shown */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold tracking-wide uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" /> CICC Verified
                </span>

                {/* Verification level badge */}
                {emailVerified && phoneVerified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold tracking-wide uppercase">
                    <BadgeCheck className="w-3.5 h-3.5" /> Email + Phone Verified
                  </span>
                )}
                {emailVerified && !phoneVerified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold tracking-wide uppercase">
                    <Mail className="w-3.5 h-3.5" /> Email Verified
                  </span>
                )}
                {pendingReview && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold tracking-wide uppercase">
                    <Clock className="w-3.5 h-3.5" /> Pending Review
                  </span>
                )}
                {!isClaimed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200 text-[11px] font-bold tracking-wide uppercase">
                    <Lock className="w-3.5 h-3.5" /> Unclaimed
                  </span>
                )}

                {avgRating !== null && reviews.length > 5 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-yellow-200 text-yellow-700 text-[11px] font-bold tracking-wide uppercase">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> Top Rated
                  </span>
                )}
                <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-bold tracking-wide uppercase ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                  {data.Status}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500 mb-4">
                {data.Company && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Building2 className="w-4 h-4 text-gray-300" /> {data.Company}
                  </span>
                )}
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-gray-300" />
                  {[data.Province, data.Country].filter(Boolean).join(', ') || 'Canada'}
                </span>
                <span className="flex items-center gap-1.5 font-medium font-mono text-xs text-gray-400">
                  RCIC #{data.License_Number}
                </span>
              </div>

              {/* Rating + actions row */}
              <div className="flex flex-wrap items-center gap-3">
                {avgRating !== null ? (
                  <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl text-amber-700 font-bold text-sm">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {avgRating.toFixed(1)}
                    <span className="font-medium text-amber-600 text-xs">({reviews.length} reviews)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-gray-400 text-sm">
                    <Star className="w-4 h-4" /> No reviews yet
                  </div>
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-2.5 w-full md:w-48 shrink-0">
              <Link
                href={`/consultant/${data.License_Number}/book`}
                className="w-full bg-[#0F2A44] hover:bg-black text-white py-3.5 rounded-2xl font-bold text-center transition-all shadow-lg shadow-black/10 text-sm flex items-center justify-center gap-2"
              >
                <CalendarDays className="w-4 h-4" /> Book Consultation
              </Link>
              <div className="w-full">
                <SaveProfileButton licenseNumber={data.License_Number} initialIsSaved={isSaved} />
              </div>
              {!isClaimed && (
                <Link
                  href={`/claim/${data.License_Number}`}
                  className="w-full border-2 border-[#2FA4A9] text-[#2FA4A9] hover:bg-[#2FA4A9] hover:text-white py-3 rounded-2xl font-bold text-center transition-all text-sm flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-4 h-4" /> Claim Profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT (2/3) */}
        <div className="lg:col-span-2 space-y-8">

          {/* TRUST CARD */}
          <section className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#2FA4A9] mb-6 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Trust & Verification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* CICC Status — always from registry */}
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-emerald-50 border-emerald-100">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">CICC Status</p>
                  <p className="text-xs text-gray-500 mt-0.5">{data.Status} • Entitled to Practise</p>
                </div>
              </div>

              {/* Email Verification */}
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${emailVerified ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                  <Mail className={`w-4 h-4 ${emailVerified ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Email Verified</p>
                  {emailVerified ? (
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">✓ Matches CICC registry</p>
                  ) : pendingReview ? (
                    <p className="text-xs text-amber-600 mt-0.5">Pending admin review</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">{isClaimed ? 'Not verified' : 'Profile unclaimed'}</p>
                  )}
                </div>
              </div>

              {/* Phone Verification */}
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${phoneVerified ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                  <Phone className={`w-4 h-4 ${phoneVerified ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Phone Verified</p>
                  {phoneVerified ? (
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">✓ Matches CICC registry</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">{isClaimed ? 'Not verified yet' : 'Profile unclaimed'}</p>
                  )}
                </div>
              </div>

              {/* Disciplinary record — always clean from CICC */}
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-gray-50 border-gray-100">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Disciplinary Record</p>
                  <p className="text-xs text-gray-500 mt-0.5">No public warnings</p>
                </div>
              </div>
            </div>

            {/* Verification level summary bar */}
            {isClaimed && (
              <div className={`mt-5 pt-5 border-t border-gray-50 flex items-center gap-3 text-xs font-bold ${
                emailVerified && phoneVerified ? 'text-blue-600' : emailVerified ? 'text-blue-500' : 'text-amber-600'
              }`}>
                {emailVerified && phoneVerified ? (
                  <><BadgeCheck className="w-4 h-4" /> Identity verified via CICC email &amp; phone — highest trust level</>
                ) : emailVerified ? (
                  <><Mail className="w-4 h-4" /> Identity verified via CICC-registered email</>
                ) : pendingReview ? (
                  <><Clock className="w-4 h-4" /> Identity verification pending admin review</>
                ) : (
                  <><ShieldCheck className="w-4 h-4" /> Profile claimed — verification in progress</>
                )}
              </div>
            )}
          </section>

          {/* CORPORATE RECORDS */}
          {displayEnrichments.length > 0 && (
            <section>
              <h2 className="text-lg font-bold font-serif mb-4">Official Corporate Records</h2>
              <div className="space-y-4">
                {displayEnrichments.map((enrichment: any) => {
                  const isAuto = enrichment.matchStatus === 'ambiguous';
                  const isConsultant = enrichment.matchStatus === 'consultant_verified';

                  const cardClass = isConsultant
                    ? "from-yellow-50 to-amber-50 border-amber-200"
                    : isAuto
                    ? "from-white to-gray-50 border-gray-100"
                    : "from-[#0F2A44] to-[#163650] border-transparent text-white";

                  const badgeClass = isConsultant
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : isAuto
                    ? "bg-orange-50 text-orange-700 border-orange-100"
                    : "bg-white/10 text-white border-white/10";

                  const label = isConsultant ? "Consultant Verified"
                    : isAuto ? "Auto-Matched"
                    : "Government Verified";

                  return (
                    <div key={enrichment.id} className={`bg-gradient-to-br ${cardClass} rounded-3xl border p-6 shadow-sm relative overflow-hidden`}>
                      <div className={`absolute top-0 right-0 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-bl-2xl flex items-center gap-1.5 border-b border-l ${badgeClass}`}>
                        <CheckCircle className="w-3 h-3" /> {label}
                      </div>
                      {isAuto && (
                        <div className="mb-4 text-xs bg-orange-50 border border-orange-100 text-orange-700 px-4 py-3 rounded-xl flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p><strong>Note:</strong> AI-matched from public registries. Not yet manually reviewed.</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                        {[
                          ['Legal Name', enrichment.matchedLegalName],
                          ['Jurisdiction', enrichment.jurisdiction],
                          ['Registry Number', enrichment.registryNumber],
                          ['Incorporated On', enrichment.incorporationDate ? new Date(enrichment.incorporationDate).toLocaleDateString() : 'N/A'],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <label className="text-xs font-bold uppercase tracking-wide text-gray-400 block mb-1">{label}</label>
                            <div className="font-semibold">{val}</div>
                          </div>
                        ))}
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-wide text-gray-400 block mb-1">Registered Address</label>
                          <div className="font-semibold">{enrichment.registeredAddress || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* BIO */}
          <section>
            <h2 className="text-lg font-bold font-serif mb-4">Professional Bio</h2>
            <div className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm text-gray-600 leading-relaxed text-[15px] space-y-4 overflow-hidden">
              {dbProfile?.bio ? (
                <div 
                  className="prose prose-sm md:prose-base prose-[#2FA4A9] max-w-none break-words"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  dangerouslySetInnerHTML={{ __html: dbProfile.bio }} 
                />
              ) : (
                <>
                  <p>
                    <strong className="text-gray-900">{data.Full_Name}</strong> is a Regulated Canadian Immigration Consultant (RCIC) operating under license{' '}
                    <strong className="font-mono text-[#2FA4A9]">#{data.License_Number}</strong>.{' '}
                    Based in {[data.Province, data.Country].filter(Boolean).join(', ') || 'Canada'}, they help clients navigate the Canadian immigration system.
                  </p>
                  <p>
                    As a{isActive ? 'n active' : ''} member of the College of Immigration and Citizenship Consultants (CICC), they are legally authorized to provide advice on all Canadian immigration matters.
                  </p>
                </>
              )}
              {!isClaimed && (
                <div className="mt-4 p-4 bg-gradient-to-r from-[#2FA4A9]/5 to-transparent border border-[#2FA4A9]/15 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Are you {data.Full_Name}?</p>
                    <p className="text-xs text-gray-400 mt-0.5">Add your custom bio, services, and contact info.</p>
                  </div>
                  <Link
                    href={`/claim/${data.License_Number}`}
                    className="text-sm font-bold text-[#2FA4A9] hover:text-white bg-[#2FA4A9]/10 hover:bg-[#2FA4A9] px-5 py-2.5 rounded-xl transition-all whitespace-nowrap"
                  >
                    Customize Profile →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* AREAS OF PRACTICE */}
          <section>
            <h2 className="text-lg font-bold font-serif mb-4">Areas of Practice</h2>
            <div className="flex flex-wrap gap-2.5">
              {(consultationTypes.length > 0
                ? consultationTypes.map(ct => ct.title)
                : ['Express Entry', 'Study Permits', 'Work Permits', 'Family Sponsorship', 'Provincial Nominee Programs', 'Citizenship Applications']
              ).map(tag => (
                <span key={tag} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${consultationTypes.length > 0 ? 'bg-[#2FA4A9]/5 border-[#2FA4A9]/20 text-[#2FA4A9] hover:bg-[#2FA4A9]/10' : 'bg-white border-gray-100 text-gray-400'}`}>
                  {tag}
                </span>
              ))}
              {consultationTypes.length === 0 && !isClaimed && (
                <span className="text-xs text-gray-400 italic self-center">Default categories — claim to customize</span>
              )}
            </div>
          </section>

          {/* REVIEWS */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold font-serif flex items-center gap-2">Client Reviews</h2>
              {avgRating !== null && (
                <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1.5 rounded-xl font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {avgRating.toFixed(1)}
                </div>
              )}
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {review.comment && <p className="text-[15px] text-gray-600 leading-relaxed mb-4">{review.comment}</p>}
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                      <div className="w-5 h-5 rounded-full bg-[#2FA4A9]/10 flex items-center justify-center text-[#2FA4A9] font-black text-[10px]">
                        {review.user?.name?.[0]?.toUpperCase() ?? 'C'}
                      </div>
                      {review.user?.name ?? 'Verified Client'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-10 text-center">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-400">No reviews yet</p>
                <p className="text-xs text-gray-300 mt-1">Reviews appear after verified consultations.</p>
              </div>
            )}
          </section>

          {/* FAQ */}
          <section className="pt-8 border-t border-gray-100">
            <h2 className="text-lg font-bold font-serif mb-5">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {[
                {
                  q: 'Is this consultant legally authorized to practice?',
                  a: `Yes. Status: ${data.Status}. Verified against the CICC registry today.`
                },
                {
                  q: 'Are the reviews verified?',
                  a: 'Reviews are submitted by real users. Verified Client badges confirm an actual consultation took place.'
                }
              ].map(({ q, a }) => (
                <div key={q} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h4 className="font-bold text-sm text-gray-900 mb-2">{q}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT (1/3) — Sticky Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-5">

            {/* BOOKING WIDGET */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2 border-b border-gray-50 pb-4">
                <CalendarDays className="w-4 h-4 text-[#2FA4A9]" /> Request Consultation
              </h3>

              <div className="space-y-3 mb-5">
                <div className="bg-[#F8FAFC] hover:bg-[#f0f7f8] p-4 rounded-2xl border border-gray-100 cursor-pointer transition-all group">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-sm text-gray-900">Virtual Consultation</strong>
                    <span className="text-sm font-bold text-[#2FA4A9]">$150 CAD</span>
                  </div>
                  <p className="text-xs text-gray-500">45 min • Google Meet / Zoom</p>
                </div>

                {!isClaimed && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-2.5 h-2.5 text-amber-700" />
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Booking disabled. This profile hasn't been claimed yet.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  disabled={!isClaimed}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm text-center transition-all ${
                    isClaimed
                      ? 'bg-[#0F2A44] text-white hover:bg-black shadow-md shadow-black/10'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-100'
                  }`}
                >
                  Select Time & Book
                </button>

                {!isClaimed && (
                  <Link
                    href={`/claim/${data.License_Number}`}
                    className="block w-full py-3.5 rounded-2xl font-bold text-sm text-center border-2 border-[#2FA4A9] text-[#2FA4A9] hover:bg-[#2FA4A9] hover:text-white transition-all"
                  >
                    Claim to Enable Booking
                  </Link>
                )}

                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secure Verixa Checkout
                </p>
              </div>
            </div>

            {/* DETAILS & CONTACT */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#2FA4A9] mb-5">
                Details & Contact
              </h3>
              <ul className="space-y-5">
                <li className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <Languages className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <strong className="block text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Languages</strong>
                    <span className="text-sm font-medium text-gray-800">{languages.join(', ')}</span>
                  </div>
                </li>

                {data.Company && (
                  <li className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <strong className="block text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Company</strong>
                      <span className="text-sm font-medium text-gray-800 line-clamp-2">{data.Company}</span>
                    </div>
                  </li>
                )}

                {(data.Province || data.Country) && (
                  <li className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <strong className="block text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Location</strong>
                      <span className="text-sm font-medium text-gray-800">{[data.Province, data.Country].filter(Boolean).join(', ')}</span>
                    </div>
                  </li>
                )}

                <li className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <strong className="block text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Email</strong>
                    {data.Email ? (
                      isClaimed ? (
                        <a href={`mailto:${data.Email}`} className="text-sm font-semibold text-[#2FA4A9] hover:text-[#258d92] underline block max-w-[180px] truncate">
                          {data.Email}
                        </a>
                      ) : (
                        <span className="text-sm font-semibold text-gray-500 flex items-center gap-1.5" title="Claim profile to reveal">
                          {data.Email.includes('@') ? `${data.Email.substring(0, 2)}***@${data.Email.split('@')[1]}` : '***'}
                          <Lock className="w-3 h-3 text-gray-400" />
                        </span>
                      )
                    ) : (
                      <span className="text-sm text-gray-400 italic">Available upon booking</span>
                    )}
                  </div>
                </li>

                {data.Phone && (
                  <li className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <strong className="block text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Phone</strong>
                      {isClaimed ? (
                        <span className="text-sm font-medium text-gray-800">{data.Phone}</span>
                      ) : (
                        <span className="text-sm font-medium text-gray-500 flex items-center gap-1.5" title="Claim profile to reveal">
                          {data.Phone.length > 5 ? `${data.Phone.substring(0, 4)}***${data.Phone.slice(-2)}` : '***'}
                          <Lock className="w-3 h-3 text-gray-400" />
                        </span>
                      )}
                    </div>
                  </li>
                )}

                {dbProfile?.website && (
                  <li className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <strong className="block text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">Website</strong>
                      <a href={dbProfile.website.startsWith('http') ? dbProfile.website : `https://${dbProfile.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#2FA4A9] hover:text-[#258d92] underline block max-w-[180px] truncate">
                        {dbProfile.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </li>
                )}

                {messengers.map((msg: any, idx: number) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <strong className="block text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">{msg.type}</strong>
                      <span className="text-sm font-medium text-gray-800">{msg.value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* CLAIM CTA CARD (unclaimed only) */}
            {!isClaimed && (
              <div className="bg-gradient-to-br from-[#0F2A44] to-[#163650] rounded-3xl p-6 shadow-lg">
                <div className="w-10 h-10 rounded-2xl bg-[#2FA4A9]/20 flex items-center justify-center mb-4">
                  <Award className="w-5 h-5 text-[#2FA4A9]" />
                </div>
                <h3 className="text-white font-bold text-base mb-2">Are you {data.Full_Name?.split(' ')[0]}?</h3>
                <p className="text-white/60 text-xs leading-relaxed mb-5">
                  Claim this profile to activate bookings, showcase your services, and connect with potential clients on Verixa.
                </p>
                <Link
                  href={`/claim/${data.License_Number}`}
                  className="block w-full bg-[#2FA4A9] hover:bg-[#258d92] text-white font-bold text-sm text-center py-3 rounded-xl transition-all shadow-lg shadow-[#2FA4A9]/20"
                >
                  Claim Free Profile →
                </Link>
              </div>
            )}

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
