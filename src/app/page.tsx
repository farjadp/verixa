// ============================================================================
// Hardware Source: src/app/page.tsx
// Route: /
// Version: 1.0.0 — 2026-04-08
// Why: Primary public landing route for SEO capture, trust-building, and conversion into consultant discovery.
// Domain: Public Acquisition
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Public trust surface; prioritize resilient rendering and graceful fallback behavior on data-source failure.
// Critical Path: Top-of-funnel acquisition page; outages here directly impact discovery and booking pipeline.
// Primary Dependencies: Header/Footer, HeroSearch, consultant aggregates, article feed, platform settings assets.
// Failure Strategy: Must render with safe fallbacks when DB/settings fetch fails (avoid SSR 500).
// ============================================================================
import { Search, ShieldCheck, Star, ArrowRight, Check, MapPin, Globe, Shield, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailable, markDatabaseUnavailable } from "@/lib/db-availability";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LatestArticles from "@/components/home/LatestArticles";
import HeroSearch from "@/components/home/HeroSearch";

export const revalidate = 600; // Refetch data every 10 minutes
const FALLBACK_TOTAL_COUNT = 15420;

export default async function Home() {
  const dbUnavailable = isDatabaseUnavailable();
  const totalCountResult = dbUnavailable
    ? { ok: false as const, value: FALLBACK_TOTAL_COUNT }
    : await prisma.consultantProfile
      .count()
      .then((value) => ({ ok: true as const, value }))
      .catch((error) => {
        markDatabaseUnavailable(error);
        console.error("Home: consultant count query failed", error);
        return { ok: false as const, value: FALLBACK_TOTAL_COUNT };
      });
  const totalCount = totalCountResult.value;
  const formattedCount = new Intl.NumberFormat("en-US").format(totalCount || FALLBACK_TOTAL_COUNT);
  const skipAdditionalQueries = dbUnavailable || !totalCountResult.ok;

  // Featured: ordered by claimed first, then alphabetically.
  const featuredRaw = skipAdditionalQueries
    ? []
    : await prisma.consultantProfile.findMany({
      take: 8,
      orderBy: [
        { userId: { sort: "desc", nulls: "last" } },
        { fullName: "asc" }
      ],
      select: {
        licenseNumber: true,
        fullName: true,
        status: true,
        company: true,
        province: true,
        country: true,
      },
    }).catch((error) => {
      console.error("Home: featured consultants query failed", error);
      return [];
    });

  const featuredRCICs = featuredRaw.map((p) => ({
    License_Number: p.licenseNumber,
    Full_Name: p.fullName,
    Status: p.status || "Active",
    Company: p.company || null,
    Province: p.province || null,
    Country: p.country || null,
  }));

  // Newest verified accounts
  const newestVerified = skipAdditionalQueries
    ? []
    : await prisma.consultantProfile.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      where: { status: { not: "PENDING" } },
      select: {
        licenseNumber: true,
        avatarImage: true,
        fullName: true,
        company: true,
        province: true,
        country: true,
      },
    }).catch((error) => {
      console.error("Home: newest verified query failed", error);
      return [];
    });


  return (
    <main className="min-h-screen bg-[#ffffff] text-[#1A1F2B] font-serif">
      <Header />



{/* ---------------- 2. HERO: SOPHISTICATED & TRUSTED (NEW DESIGN) ---------------- */}
      <section className="relative max-w-7xl mx-auto px-8 pt-24 pb-32 overflow-visible">
        {/* المان‌های دکوراتیو پس‌زمینه برای عمق دادن به صفحه */}
        <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-[#2FA4A9]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-blue-50/50 blur-[100px] rounded-full" />

        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* بخش سمت چپ: محتوا و سرچ */}
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F7FA] border border-gray-100 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FA4A9] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FA4A9]"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0F2A44]">Verified CICC Network</span>
              </div>
              
              <h1 className="text-7xl md:text-[100px] font-medium leading-[0.95] tracking-tight text-[#0F2A44]">
                Immigration <br/>
                <span className="italic font-light text-[#2FA4A9]">without the doubt.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-500 font-sans leading-relaxed max-w-xl">
                The premier verified directory for Canadian immigration. We bridge the gap between ambitious futures and licensed professionals.
              </p>
            </div>

            {/* باکس سرچ پیشرفته با افکت Shadow و Focus جذاب */}
            <div className="relative max-w-2xl font-sans group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#2FA4A9]/20 to-transparent rounded-[32px] blur opacity-25 group-focus-within:opacity-100 transition duration-1000"></div>
              <HeroSearch />
              
              {/* تاییدیه اجتماعی (Social Proof) زیر سرچ باکس */}
              <div className="flex items-center gap-6 mt-6 px-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                      <User className="w-6 h-6 text-gray-400 mt-2" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-[#2FA4A9] flex items-center justify-center text-[10px] font-bold text-white leading-none">
                    +{formattedCount.split(',')[0]}k
                  </div>
                </div>
                <p className="text-sm text-gray-400 font-sans">
                  Trusted by <span className="text-[#0F2A44] font-bold">15,000+</span> applicants this month
                </p>
              </div>
            </div>
          </div>

          {/* بخش سمت راست: کارت پروفایل تعاملی */}
          <div className="lg:col-span-5 relative">
            {/* نشان شناور تاییدیه لحظه‌ای */}
            <div className="absolute -top-12 -right-6 z-20 animate-bounce transition-all duration-[3000ms]">
               <div className="bg-white p-4 rounded-3xl shadow-2xl border border-gray-50 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Sync Status</p>
                    <p className="text-xs font-bold text-green-700 leading-none">Real-time Verified</p>
                  </div>
               </div>
            </div>

            <div className="relative group">
              {/* افکت چرخش کارت در پس‌زمینه */}
              <div className="absolute inset-0 bg-[#0F2A44] rounded-[48px] rotate-3 scale-[0.98] opacity-5 group-hover:rotate-1 transition-transform duration-500"></div>
              <div className="relative bg-white border border-gray-100 p-8 md:p-12 rounded-[48px] shadow-[0_50px_100px_-20px_rgba(15,42,68,0.1)] font-sans overflow-hidden">
                
                <div className="flex flex-col gap-8">
                  <div className="flex justify-between items-start">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center border border-gray-100">
                        <User className="w-12 h-12 text-gray-300" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-xl">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-orange-400 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-4 h-4 fill-current" />)}
                      </div>
                      <p className="font-bold text-2xl text-[#0F2A44]">5.0 <span className="text-sm text-gray-400 font-normal">/ 120 reviews</span></p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-3xl font-bold text-[#0F2A44] mb-2">Sarah Jenkins, RCIC</h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-semibold border border-gray-100">R532104</span>
                      <span className="px-3 py-1 bg-[#2FA4A9]/10 text-[#2FA4A9] rounded-full text-xs font-bold border border-[#2FA4A9]/10">Active Member</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-[#F5F7FA] border border-gray-50 group/item hover:bg-white hover:shadow-lg transition-all">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Specialty</p>
                      <p className="font-bold text-[#0F2A44]">Business Class</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-[#F5F7FA] border border-gray-100 group/item hover:bg-white hover:shadow-lg transition-all">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Response Time</p>
                      <p className="font-bold text-[#0F2A44]">&lt; 2 Hours</p>
                    </div>
                  </div>

                  <button className="w-full py-5 bg-[#0F2A44] text-white rounded-3xl font-bold text-lg hover:shadow-xl hover:shadow-[#0F2A44]/20 transition-all active:scale-95">
                    View Verified Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>






      {/* ---------------- 2.5 DISCOVER CONSULTANTS SLIDER (REDESIGNED) ---------------- */}
      <section className="w-full bg-[#F5F7FA] py-24 font-sans border-y border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-1/4 -z-0 w-[500px] h-[500px] bg-[#2FA4A9]/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#2FA4A9] animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#2FA4A9]">Explore Network</span>
              </div>
              <h3 className="text-4xl md:text-5xl font-medium tracking-tight text-[#0F2A44]">
                Discover <span className="italic font-light text-gray-400">Consultants.</span>
              </h3>
            </div>
            <div className="hidden md:block pb-2">
              <Link href="/search" className="group flex items-center gap-2 text-sm font-bold text-[#0F2A44] hover:text-[#2FA4A9] transition-colors">
                Search the Registry <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          
          <div className="flex gap-8 overflow-x-auto pb-12 snap-x custom-scrollbar">
            {featuredRCICs.map((rcic) => (
               <Link href={`/consultant/${rcic.License_Number}`} key={rcic.License_Number} className="min-w-[320px] max-w-[320px] group relative bg-white p-8 rounded-[32px] shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(47,164,169,0.15)] transition-all duration-500 overflow-hidden border border-gray-100 hover:border-[#2FA4A9]/30 flex flex-col snap-start transform hover:-translate-y-2">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2FA4A9] to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-16 h-16 bg-gray-50 rounded-[20px] flex items-center justify-center border border-gray-100 group-hover:scale-110 group-hover:bg-[#2FA4A9]/5 transition-all duration-500">
                      <User className="w-8 h-8 text-gray-300 group-hover:text-[#2FA4A9] transition-colors duration-500" />
                    </div>
                    <div className="bg-[#F5F7FA] p-2.5 rounded-xl text-gray-400 group-hover:bg-[#2FA4A9]/10 group-hover:text-[#2FA4A9] transition-colors duration-500">
                      <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <h4 className="font-bold text-xl text-[#0F2A44] group-hover:text-[#2FA4A9] transition-colors mb-2 line-clamp-1">{rcic.Full_Name}</h4>
                    <p className="text-xs text-gray-500 font-medium line-clamp-2 h-8 leading-relaxed mb-6">{rcic.Company || 'Independent Immigration Practice'}</p>
                    
                    <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-4">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center">
                           <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                         </div>
                         <span className="text-xs font-bold text-gray-500">Active</span>
                      </div>
                      
                      {(rcic.Province || rcic.Country) && (
                        <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {[rcic.Province, rcic.Country].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
               </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 2.6 NEWLY VERIFIED ACCOUNTS SLIDER (REDESIGNED DARK THEME) ---------------- */}
      <section className="w-full bg-[#0F2A44] py-24 font-sans overflow-hidden relative text-white">
        {/* Background Accents */}
        <div className="absolute bottom-0 left-0 w-full h-full opacity-20 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute bottom-0 left-1/4 -z-0 w-[600px] h-[600px] bg-[#2FA4A9]/10 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#2FA4A9] animate-pulse shadow-[0_0_10px_#2FA4A9]"></span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#2FA4A9]">Live Updates</span>
              </div>
              <h3 className="text-4xl md:text-5xl font-medium tracking-tight">
                Recently <span className="italic font-light text-gray-400">Verified.</span>
              </h3>
            </div>
            <div className="hidden md:block pb-2">
              <Link href="/search" className="group flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors">
                View All Members <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-12 snap-x custom-scrollbar">
            {newestVerified.length > 0 ? newestVerified.map((rcic) => (
               <Link href={`/consultant/${rcic.licenseNumber}`} key={rcic.licenseNumber} className="min-w-[340px] max-w-[340px] bg-white/5 backdrop-blur-md p-6 rounded-[32px] border border-white/10 hover:border-[#2FA4A9]/50 hover:bg-white/10 transition-all duration-300 cursor-pointer snap-start group relative overflow-hidden transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2FA4A9]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="flex items-center gap-5 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center shrink-0 group-hover:border-[#2FA4A9] transition-colors duration-500">
                      {rcic.avatarImage ? (
                        <Image
                          src={rcic.avatarImage}
                          alt={rcic.fullName}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <User className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-white group-hover:text-[#2FA4A9] transition-colors line-clamp-1">{rcic.fullName}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                        <span className="text-xs text-green-400 font-medium tracking-wide">Verified Identity</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative z-10 p-5 rounded-2xl bg-black/20 border border-white/5 group-hover:bg-black/30 transition-colors">
                    <p className="text-sm text-gray-300 font-medium line-clamp-1 mb-3">{rcic.company || 'Independent Practice'}</p>
                    <div className="flex flex-wrap items-center gap-2">
                       <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 text-[10px] font-bold uppercase tracking-wider border border-white/5">
                         {rcic.licenseNumber}
                       </span>
                      {(rcic.province || rcic.country) && (
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 text-[10px] font-bold uppercase tracking-wider border border-white/5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {[rcic.province, rcic.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
               </Link>
            )) : (
              <div className="w-full text-center py-16 text-gray-500 font-medium bg-white/5 rounded-[32px] border border-white/10 border-dashed">
                Waiting for the first verified members...
              </div>
            )}
          </div>
        </div>
      </section>

{/* ---------------- 3. HOW IT WORKS / TRUST LAYER (REDESIGNED) ---------------- */}
      <section className="bg-white py-32 border-b border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-5xl md:text-6xl font-medium tracking-tight mb-6">
                Verification <span className="italic font-light text-gray-400">made simple.</span>
              </h2>
              <p className="text-xl text-gray-500 font-sans">
                Three rigorous layers of transparency to ensure your immigration journey starts on solid ground.
              </p>
            </div>
            <div className="hidden md:block pb-2">
              <div className="flex items-center gap-2 text-[#2FA4A9] font-bold uppercase tracking-widest text-xs border-b-2 border-[#2FA4A9] pb-1">
                Our Methodology <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop Only) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-gray-100 -z-10" />

            {[
              {
                step: "01",
                title: "Search & Filter",
                desc: "Navigate through thousands of RCICs using advanced filters for language, location, and specialization.",
                icon: <Search className="w-6 h-6" />,
              },
              {
                step: "02",
                title: "Live Validation",
                desc: "Our engine cross-references CICC databases hourly to confirm active licensing and disciplinary history.",
                icon: <ShieldCheck className="w-6 h-6" />,
              },
              {
                step: "03",
                title: "Secure Contact",
                desc: "Connect directly via encrypted channels. No middlemen, no hidden fees—just direct professional access.",
                icon: <Globe className="w-6 h-6" />,
              },
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="group relative bg-white border border-gray-100 p-10 rounded-[40px] hover:border-[#2FA4A9] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(47,164,169,0.1)]"
              >
                <div className="absolute -top-6 -right-4 text-8xl font-black text-gray-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-sans">
                  {item.step}
                </div>
                
                <div className="w-14 h-14 bg-[#F5F7FA] text-[#0F2A44] rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#2FA4A9] group-hover:text-white transition-colors duration-500">
                  {item.icon}
                </div>

                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="text-[#2FA4A9] font-mono text-sm">{item.step}.</span>
                  {item.title}
                </h3>
                
                <p className="text-gray-500 font-sans leading-relaxed relative z-10">
                  {item.desc}
                </p>

                <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-tighter text-gray-300 group-hover:text-[#2FA4A9] transition-colors">
                  Learn More <div className="w-0 group-hover:w-8 h-[1px] bg-[#2FA4A9] transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>






      {/* ---------------- 4. BENTO: SIMPLE & ELEGANT ---------------- */}
      <section className="max-w-7xl mx-auto px-8 py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
          
          <div className="bg-[#0F2A44] text-white p-12 rounded-[40px] flex flex-col justify-between group cursor-pointer overflow-hidden relative">
            <div className="space-y-6 relative z-10">
              <h2 className="text-5xl font-medium tracking-tight">Are you a licensed professional?</h2>
              <p className="text-gray-400 font-sans text-lg max-w-sm">Your future clients are searching right now. Don&apos;t let your profile stay empty and miss out on premium leads.</p>
              <button className="flex items-center gap-3 font-bold border-b border-white pb-1 group-hover:gap-5 transition-all">
                Claim your RCIC Profile <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
              <Shield className="w-40 h-40" />
            </div>
          </div>

          <div className="grid gap-8">
            <div className="bg-gray-50 p-10 rounded-[40px] flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-2xl font-medium">Global Network</h3>
                <p className="text-gray-500 font-sans">Experts in 20+ languages.</p>
              </div>
              <Globe className="w-12 h-12 text-gray-300" />
            </div>
            <div className="bg-[#F5F7FA] p-10 rounded-[40px] flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-2xl font-medium">Location Based</h3>
                <p className="text-gray-500 font-sans">Find someone in your city.</p>
              </div>
              <MapPin className="w-12 h-12 text-[#2FA4A9]" />
            </div>
          </div>

        </div>
      </section>

      {/* ---------------- 4.5 LATEST ARTICLES / INTELLIGENCE ---------------- */}
      <LatestArticles />



      {/* ---------------- 5. THE PROMISE ---------------- */}
      <section className="max-w-4xl mx-auto px-8 py-32 text-center space-y-12">
        <h2 className="text-5xl md:text-7xl font-medium tracking-tight">The path to Canada is clearer with a trusted guide.</h2>
        <Link href="/search" className="inline-block bg-[#0F2A44] text-white px-12 py-6 rounded-full font-bold text-xl hover:scale-105 transition shadow-2xl">
          Search All Consultants
        </Link>
      </section>
            {/* ---------------- 2.2 STATS: THE NUMBERS OF TRUST ---------------- */}
      <section className="w-full bg-[#0F2A44] py-24 relative overflow-hidden">
        {/* Decorative Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%23ffffff' stroke-width='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
        />
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 items-center">
            
            {/* Stat 1 */}
            <div className="space-y-2 group">
              <div className="text-[#2FA4A9] text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-8 h-[1px] bg-[#2FA4A9] group-hover:w-12 transition-all" />
                Verified
              </div>
              <h3 className="text-5xl md:text-6xl font-medium text-white tracking-tighter">
                {formattedCount}<span className="text-[#2FA4A9] ml-1">+</span>
              </h3>
              <p className="text-gray-400 font-sans text-sm md:text-base leading-relaxed">
                Licensed RCICs actively <br className="hidden md:block"/> synced with CICC records.
              </p>
            </div>

            {/* Stat 2 */}
            <div className="space-y-2 group">
              <div className="text-[#2FA4A9] text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-8 h-[1px] bg-[#2FA4A9] group-hover:w-12 transition-all" />
                Reliability
              </div>
              <h3 className="text-5xl md:text-6xl font-medium text-white tracking-tighter">
                99.9<span className="text-[#2FA4A9] ml-1">%</span>
              </h3>
              <p className="text-gray-400 font-sans text-sm md:text-base leading-relaxed">
                Fraud detection rate for <br className="hidden md:block"/> unverified consultants.
              </p>
            </div>

            {/* Stat 3 */}
            <div className="space-y-2 group">
              <div className="text-[#2FA4A9] text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-8 h-[1px] bg-[#2FA4A9] group-hover:w-12 transition-all" />
                Global Reach
              </div>
              <h3 className="text-5xl md:text-6xl font-medium text-white tracking-tighter">
                45<span className="text-[#2FA4A9] ml-1">+</span>
              </h3>
              <p className="text-gray-400 font-sans text-sm md:text-base leading-relaxed">
                Countries where our users <br className="hidden md:block"/> find their legal guides.
              </p>
            </div>

            {/* Stat 4 */}
            <div className="space-y-2 group">
              <div className="text-[#2FA4A9] text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-8 h-[1px] bg-[#2FA4A9] group-hover:w-12 transition-all" />
                Real-Time
              </div>
              <h3 className="text-5xl md:text-6xl font-medium text-white tracking-tighter">
                60<span className="text-[#2FA4A9] ml-1">m</span>
              </h3>
              <p className="text-gray-400 font-sans text-sm md:text-base leading-relaxed">
                Update frequency to ensure <br className="hidden md:block"/> data absolute accuracy.
              </p>
            </div>

          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  );
}
