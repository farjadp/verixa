// ============================================================================
// Hardware Source: page.tsx
// Route: /page.tsx
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /page.tsx (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { Search, ShieldCheck, Star, ArrowRight, Check, MapPin, Globe, Shield, User } from "lucide-react";
import Link from "next/link";
import { getTotalConsultantsCount, getFeaturedConsultants } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LatestArticles from "@/components/home/LatestArticles";

export const revalidate = 3600; // Refetch data every hour (Static generation optimization)

export default async function Home() {
  const totalCount = getTotalConsultantsCount();
  const featuredRCICs = getFeaturedConsultants(8);
  const formattedCount = new Intl.NumberFormat('en-US').format(totalCount);

  return (
    <main className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-serif">
      <Header />

      {/* ---------------- 2. HERO: CLEAN & CALM ---------------- */}
      <section className="max-w-7xl mx-auto px-8 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-10">
          <div className="flex items-center gap-3 text-sm font-bold text-[#C29967] uppercase tracking-widest">
            <div className="w-12 h-[1px] bg-[#C29967]" />
            CICC Licensed Only
          </div>
          
          <h1 className="text-6xl md:text-8xl font-medium leading-[1.05] tracking-tight">
            Your Canadian <br/>
            <span className="italic font-light">future, verified.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 font-sans leading-relaxed max-w-xl">
            The most reliable way to find and verify licensed Canadian Immigration Consultants. No noise. No fraud. Just the right professional for your case.
          </p>

          {/* Direct Search Bar */}
          <div className="flex flex-col gap-4 pt-8 font-sans max-w-2xl">
            <div className="relative group shadow-sm hover:shadow-xl transition-all rounded-full">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-[#C29967] transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Search by name, license number, or city..." 
                className="w-full bg-white border border-gray-200 py-6 pl-16 pr-32 rounded-full text-lg focus:border-[#C29967] outline-none transition-all"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#1A1A1A] text-white px-8 py-3.5 rounded-full font-bold hover:bg-gray-800 transition">
                Search
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 px-6 text-sm">
              <p className="text-gray-400">
                Popular: <span className="underline cursor-pointer hover:text-black transition">Express Entry</span>, <span className="underline cursor-pointer hover:text-black transition">Study Permit</span>
              </p>
              <div className="flex items-center gap-2 text-[#C29967] font-semibold bg-[#F6F3F0] px-4 py-1.5 rounded-full w-fit">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse border border-white"></div>
                Over {formattedCount} Verified RCICs synced hourly
              </div>
            </div>
          </div>
        </div>

        {/* The "Review Card" - Pure Glassmorphism */}
        <div className="relative">
          <div className="absolute -inset-10 bg-[#C29967]/5 blur-3xl rounded-full" />
          <div className="relative bg-white border border-gray-100 p-10 rounded-[40px] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.05)] space-y-8 font-sans">
             <div className="flex justify-between items-start">
               <div className="flex gap-4">
                 <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                 </div>
                 <div>
                    <h3 className="font-bold text-xl flex items-center gap-2">
                      Anjali Sharma <ShieldCheck className="w-5 h-5 text-blue-600" />
                    </h3>
                    <p className="text-gray-500 text-sm">Express Entry Specialist</p>
                 </div>
               </div>
               <div className="flex items-center gap-1 text-[#C29967]">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold">4.9</span>
               </div>
             </div>

             {/* Badges and Validation */}
             <div className="flex justify-start">
               <div className="flex items-center gap-1.5 mb-1 bg-[#F6F3F0] text-[#C29967] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-[#f5ecd8]">
                 <Shield className="w-3 h-3" /> Verixa Verified
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                   <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">CICC Status</p>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                     <p className="font-bold text-green-700">Active License</p>
                   </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                   <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Experience</p>
                   <p className="font-bold">12+ Years</p>
                </div>
             </div>

             <div className="flex gap-2">
                {['English', 'Hindi', 'Punjabi'].map(lang => (
                  <span key={lang} className="px-4 py-1.5 border border-gray-200 rounded-full text-xs font-semibold">{lang}</span>
                ))}
             </div>

             <button className="w-full py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl font-bold transition">
               View Full Credentials
             </button>
          </div>
        </div>
      </section>

      {/* ---------------- 2.5 TRENDING/TOP RATED SLIDER ---------------- */}
      <section className="w-full bg-[#F6F3F0] py-16 font-sans border-y border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-bold tracking-tight uppercase text-gray-500">Top Rated This Week</h3>
            <Link href="/search?sort=rating" className="text-sm font-bold border-b-2 border-[#1A1A1A] pb-0.5 hover:text-[#C29967] hover:border-[#C29967] transition-colors">See All Top Rated</Link>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x custom-scrollbar">
            {featuredRCICs.map((rcic) => (
               <Link href={`/consultant/${rcic.License_Number}`} key={rcic.License_Number} className="min-w-[300px] bg-white p-6 rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer snap-start flex flex-col justify-between border border-gray-50 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <User className="w-7 h-7 text-gray-400 group-hover:text-[#C29967] transition-colors" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#FDFCFB] border border-[#f5ecd8] px-3 py-1.5 rounded-xl text-[#C29967]">
                      <Star className="w-3.5 h-3.5 fill-current" /> <span className="font-bold text-sm">Top</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-lg font-serif group-hover:text-[#C29967] transition-colors line-clamp-1 pr-2">{rcic.Full_Name}</h4>
                      <Check className="w-4 h-4 text-blue-500 bg-blue-50 rounded-full p-0.5 shrink-0" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium line-clamp-1">{rcic.Company || 'Independent Practice'}</p>
                    {(rcic.Province || rcic.Country) && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {[rcic.Province, rcic.Country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
               </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 3. HOW IT WORKS / TRUST LAYER ---------------- */}
      <section className="bg-white py-32 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-3 gap-16">
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-[#C29967] border border-[#C29967]/20 bg-[#C29967]/5 py-1 px-3 rounded-full w-fit">Step 1</h4>
            <h3 className="text-3xl font-medium">Search.</h3>
            <p className="text-gray-500 font-sans leading-relaxed">Find consultants by name, location, or specialty. Browse through thousands of curated professionals ready to take your case natively.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-[#C29967] border border-[#C29967]/20 bg-[#C29967]/5 py-1 px-3 rounded-full w-fit">Step 2</h4>
            <h3 className="text-3xl font-medium">Verify.</h3>
            <p className="text-gray-500 font-sans leading-relaxed">Check their real-time CICC standing through our synchronized database. We display past suspensions, active limits, and authentic verified reviews.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-[#C29967] border border-[#C29967]/20 bg-[#C29967]/5 py-1 px-3 rounded-full w-fit">Step 3</h4>
            <h3 className="text-3xl font-medium">Connect.</h3>
            <p className="text-gray-500 font-sans leading-relaxed">Schedule a consultation and contact them directly with absolute confidence. Our platform's messaging is encrypted and 100% secure.</p>
          </div>
        </div>
      </section>

      {/* ---------------- 4. BENTO: SIMPLE & ELEGANT ---------------- */}
      <section className="max-w-7xl mx-auto px-8 py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
          
          <div className="bg-[#1A1A1A] text-white p-12 rounded-[40px] flex flex-col justify-between group cursor-pointer overflow-hidden relative">
            <div className="space-y-6 relative z-10">
              <h2 className="text-5xl font-medium tracking-tight">Are you a licensed professional?</h2>
              <p className="text-gray-400 font-sans text-lg max-w-sm">Your future clients are searching right now. Don't let your profile stay empty and miss out on premium leads.</p>
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
            <div className="bg-[#F6F3F0] p-10 rounded-[40px] flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-2xl font-medium">Location Based</h3>
                <p className="text-gray-500 font-sans">Find someone in your city.</p>
              </div>
              <MapPin className="w-12 h-12 text-[#C29967]" />
            </div>
          </div>

        </div>
      </section>

      {/* ---------------- 4.5 LATEST ARTICLES / INTELLIGENCE ---------------- */}
      <LatestArticles />

      {/* ---------------- 5. THE PROMISE ---------------- */}
      <section className="max-w-4xl mx-auto px-8 py-32 text-center space-y-12">
        <h2 className="text-5xl md:text-7xl font-medium tracking-tight">The path to Canada is clearer with a trusted guide.</h2>
        <Link href="/search" className="inline-block bg-[#1A1A1A] text-white px-12 py-6 rounded-full font-bold text-xl hover:scale-105 transition shadow-2xl">
          Search All Consultants
        </Link>
      </section>

      <Footer />
    </main>
  );
}