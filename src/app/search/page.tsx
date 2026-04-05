// ============================================================================
// Hardware Source: search/page.tsx
// Route: /search
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /search (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { searchConsultants, getUniqueProvinces, getUniqueStatuses } from "@/lib/db";
import { Search as SearchIcon, ShieldCheck, Star, Mail, Building2, ChevronLeft, ChevronRight, MapPin, Filter, AlertCircle, Globe, ArrowRight, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrackPageView from "@/components/TrackPageView";
import { prisma } from "@/lib/prisma";
import { ALL_SPECIALIZATION_ITEMS, ALL_LANGUAGES } from "@/lib/immigration-paths";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const statusFilter = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';
  const provinceFilter = typeof resolvedParams.province === 'string' ? resolvedParams.province : '';
  
  const claimedFilter = typeof resolvedParams.claimed === 'string' ? resolvedParams.claimed : '';
  const ratingFilterStr = typeof resolvedParams.rating === 'string' ? resolvedParams.rating : '';
  const specFilter = typeof resolvedParams.spec === 'string' ? resolvedParams.spec : '';
  const langFilter = typeof resolvedParams.lang === 'string' ? resolvedParams.lang : '';

  const pageStr = typeof resolvedParams.page === 'string' ? resolvedParams.page : '1';
  let page = parseInt(pageStr, 10);
  if (isNaN(page) || page < 1) page = 1;

  let inLicenseNumbers: string[] | undefined = undefined;

  // Pre-fetch from Postgres if advanced filters are used
  if (claimedFilter === 'true' || ratingFilterStr || specFilter || langFilter) {
    const prismaWhere: any = {};
    if (specFilter) {
      prismaWhere.specializations = { contains: `"${specFilter}"` };
    }
    if (langFilter) {
      prismaWhere.languages = { contains: langFilter };
    }

    const profiles = await prisma.consultantProfile.findMany({
      where: prismaWhere,
      select: { licenseNumber: true, reviews: { select: { rating: true } } }
    });

    let validProfiles = profiles;

    if (ratingFilterStr) {
      const minRating = parseFloat(ratingFilterStr);
      if (!isNaN(minRating)) {
        validProfiles = validProfiles.filter((p: any) => {
          if (p.reviews.length === 0) return false;
          const avg = p.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / p.reviews.length;
          return avg >= minRating;
        });
      }
    }

    inLicenseNumbers = validProfiles.map((p: any) => p.licenseNumber);
  }

  const limit = 24;
  const results = searchConsultants({ 
    search: q, 
    status: statusFilter, 
    province: provinceFilter, 
    page, 
    limit,
    inLicenseNumbers
  });

  const provinces = getUniqueProvinces();
  const statuses = getUniqueStatuses();

  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    if (provinceFilter) params.set("province", provinceFilter);
    if (claimedFilter) params.set("claimed", claimedFilter);
    if (ratingFilterStr) params.set("rating", ratingFilterStr);
    if (specFilter) params.set("spec", specFilter);
    if (langFilter) params.set("lang", langFilter);
    params.set("page", newPage.toString());
    return `/search?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#1A1F2B] flex flex-col">
      <TrackPageView 
        eventName="search_performed" 
        metadata={{ q, statusFilter, provinceFilter, page }} 
      />
      <Header />

      {/* SEARCH AREA - متمرکز و مدرن */}
      <div className="w-full bg-white pt-16 pb-12 px-8 border-b border-[#e5e7eb] bg-gradient-to-b from-[#ffffff] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-serif">Find a Verified RCIC</h1>
            <p className="text-[#1A1F2B]/70 mb-8 font-medium">Connect with professionals officially recognized by the CICC.</p>
            
            <form action="/search" method="GET" className="relative flex items-center group">
              <input type="hidden" name="status" value={statusFilter} />
              <input type="hidden" name="province" value={provinceFilter} />
              <div className="absolute left-5 text-gray-400 group-focus-within:text-[#2FA4A9] transition-colors">
                <SearchIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Name, ID Number, or Company..."
                className="w-full h-16 pl-14 pr-36 rounded-2xl bg-[#ffffff] border border-[#e5e7eb] focus:bg-white focus:border-[#2FA4A9]/50 focus:ring-4 focus:ring-[#2FA4A9]/10 transition-all outline-none text-lg shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
              />
              <button type="submit" className="absolute right-3 bg-[#0F2A44] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-95 shadow-lg shadow-black/10">
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-12 flex flex-col lg:flex-row gap-12">
        
        {/* SIDEBAR FILTERS - با طراحی تمیزتر */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="sticky top-32 space-y-10">
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-[#e5e7eb] pb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#2FA4A9]">Filters</h3>
                {(q || statusFilter || provinceFilter) && (
                  <Link href="/search" className="text-[10px] uppercase tracking-widest font-bold text-[#1A1F2B] hover:text-[#2FA4A9] transition-colors">Clear</Link>
                )}
              </div>
              
              <form action="/search" method="GET" className="space-y-8">
                {/* Preserve existing params implicitly or explicitly */}
                <input type="hidden" name="q" value={q} />
                <input type="hidden" name="status" value={statusFilter} />
                <input type="hidden" name="province" value={provinceFilter} />
                {claimedFilter === 'true' && <input type="hidden" name="claimed" value="true" />}
                
                {/* Active on Verixa */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#1A1F2B]">
                    <ShieldCheck className="w-4 h-4 text-[#2FA4A9]" />
                    Active on Verixa
                  </h4>
                  <Link 
                    href={claimedFilter === 'true' 
                      ? `/search?q=${q}&status=${statusFilter}&province=${provinceFilter}&rating=${ratingFilterStr}&spec=${specFilter}&lang=${langFilter}` 
                      : `/search?q=${q}&status=${statusFilter}&province=${provinceFilter}&claimed=true&rating=${ratingFilterStr}&spec=${specFilter}&lang=${langFilter}`
                    }
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all border ${claimedFilter === 'true' ? 'bg-[#2FA4A9]/10 border-[#2FA4A9]/30 text-[#2FA4A9]' : 'bg-white border-[#e5e7eb] text-gray-500 hover:bg-[#F5F7FA]'}`}
                  >
                    <span className="text-sm font-medium">Verified Profiles Only</span>
                    {claimedFilter === 'true' ? <ToggleRight className="w-5 h-5 flex-shrink-0" /> : <ToggleLeft className="w-5 h-5 flex-shrink-0 opacity-50" />}
                  </Link>
                </div>

                {/* Minimum Rating */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#1A1F2B]">Minimum Rating</h4>
                  <select 
                    name="rating"
                    className="w-full bg-white border border-[#e5e7eb] rounded-[16px] px-4 py-3 text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/50 shadow-sm transition-all"
                    defaultValue={ratingFilterStr}
                  >
                    <option value="">Any Rating</option>
                    <option value="4">4.0 Stars & Up</option>
                    <option value="4.5">4.5 Stars & Up</option>
                    <option value="5">5.0 Stars (Perfect)</option>
                  </select>
                </div>

                {/* Specializations */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#1A1F2B]">Areas of Practice</h4>
                  <select 
                    name="spec"
                    className="w-full bg-white border border-[#e5e7eb] rounded-[16px] px-4 py-3 text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/50 shadow-sm transition-all mb-3"
                    defaultValue={specFilter}
                  >
                    <option value="">Any Specialization</option>
                    {ALL_SPECIALIZATION_ITEMS.map(item => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Languages */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#1A1F2B]">Spoken Language</h4>
                  <select 
                    name="lang"
                    className="w-full bg-white border border-[#e5e7eb] rounded-[16px] px-4 py-3 text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/50 shadow-sm transition-all mb-3"
                    defaultValue={langFilter}
                  >
                    <option value="">Any Language</option>
                    {ALL_LANGUAGES.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full bg-[#1A1F2B] text-white rounded-[16px] py-3 text-sm font-bold hover:bg-[#2FA4A9] transition-all">
                    Apply Filters
                  </button>
                </div>

              </form>

              <div className="space-y-8 mt-8">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#1A1F2B]">Current Standing</h4>
                  <div className="flex flex-wrap lg:flex-col gap-2">
                    {['', ...statuses].map((s, idx) => {
                      const isSelected = statusFilter === s;
                      return (
                        <Link 
                          key={idx}
                          href={s ? `/search?q=${q}&province=${provinceFilter}&status=${encodeURIComponent(s)}&claimed=${claimedFilter}&rating=${ratingFilterStr}&spec=${specFilter}&lang=${langFilter}` : `/search?q=${q}&province=${provinceFilter}&claimed=${claimedFilter}&rating=${ratingFilterStr}&spec=${specFilter}&lang=${langFilter}`}
                          className={`px-4 py-2.5 rounded-[12px] text-sm font-medium transition-all ${isSelected ? 'bg-[#0F2A44] text-white shadow-md' : 'bg-white text-gray-500 hover:bg-[#ffffff] border border-[#e5e7eb]'}`}
                        >
                          {s || 'All Statuses'}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Province Selection */}

<div className="space-y-3">
  <h4 className="text-sm font-bold text-[#1A1F2B]">Province</h4>
  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
    <Link 
      href={`/search?q=${q}&status=${statusFilter}&claimed=${claimedFilter}&rating=${ratingFilterStr}&spec=${specFilter}&lang=${langFilter}`}
      className={`px-4 py-2.5 rounded-[12px] text-sm transition-all ${!provinceFilter ? 'bg-[#F5F7FA] text-[#1A1F2B] font-bold border border-[#e5e7eb]' : 'text-gray-500 hover:bg-[#ffffff] hover:text-[#1A1F2B]'}`}
    >
      All Regions
    </Link>
    {provinces.map((p: string) => (
      <Link 
        key={p}
        href={`/search?q=${q}&status=${statusFilter}&province=${encodeURIComponent(p)}&claimed=${claimedFilter}&rating=${ratingFilterStr}&spec=${specFilter}&lang=${langFilter}`}
        className={`px-4 py-2.5 rounded-[12px] text-sm transition-all ${provinceFilter === p ? 'bg-[#F5F7FA] text-[#1A1F2B] font-bold border border-[#e5e7eb]' : 'text-gray-500 hover:bg-[#ffffff] hover:text-[#1A1F2B]'}`}
      >
        {p}
      </Link>
    ))}
  </div>
</div>


              </div>
            </div>
          </div>
        </aside>

        {/* RESULTS - کارت‌های مدرن با جزییات جذاب */}
        <div className="flex-1">
          {results.data.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-[32px] py-32 text-center">
              <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No results found for your search.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.data.map((c) => {
                  const isActive = c.Status?.toLowerCase()?.includes('active');
                  return (
                    <div key={c.License_Number} className="group bg-white border border-[#e5e7eb] p-7 rounded-[32px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:border-[#2FA4A9]/30 transition-all relative overflow-hidden">
                      
                      {/* Background Decoration */}
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#ffffff] border border-[#e5e7eb] rounded-full group-hover:bg-[#F5F7FA] transition-colors" />

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-xl font-serif group-hover:text-[#2FA4A9] transition-colors">{c.Full_Name}</h3>
                              {isActive && (
                                <div className="flex items-center justify-center p-1.5 rounded-full bg-[#F5F7FA] border border-[#e5e7eb]" title="Active License">
                                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{c.License_Number}</span>
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-[#F5F7FA] border-[#e5e7eb] text-green-700' : 'bg-[#F5F7FA] border-[#e5e7eb] text-orange-600'}`}>
                            {c.Status}
                          </div>
                        </div>

                        <div className="space-y-3 mb-8">
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <Building2 className="w-4 h-4 text-[#2FA4A9]" />
                            <span className="truncate">{c.Company || 'Independent'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <MapPin className="w-4 h-4 text-[#2FA4A9]" />
                            <span>{c.Province || 'N/A'}{c.Province && c.Country ? ', ' : ''}{c.Country}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-[#e5e7eb]">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                             <Mail className="w-3.5 h-3.5" />
                             {c.Email ? <span className="max-w-[120px] truncate">{c.Email}</span> : 'Private'}
                          </div>
                          <Link href={`/consultant/${c.License_Number}`} className="flex items-center gap-1.5 text-sm font-bold text-[#1A1F2B] hover:text-[#2FA4A9] hover:gap-2.5 transition-all">
                            View Profile <ArrowRight className="w-4 h-4 text-[#2FA4A9]" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION - کلاسیک و مدرن */}
              {results.totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-4">
                  <Link href={page > 1 ? buildPageUrl(page - 1) : '#'} className={`w-12 h-12 flex items-center justify-center rounded-[16px] bg-white border border-[#e5e7eb] shadow-sm transition-all ${page > 1 ? 'hover:bg-[#ffffff] hover:border-[#2FA4A9]/30 text-[#1A1F2B]' : 'opacity-30 cursor-not-allowed text-gray-400'}`}>
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                  <div className="px-6 py-3 bg-white border border-[#e5e7eb] rounded-[16px] text-[13px] font-bold shadow-sm tracking-widest uppercase text-gray-500">
                    Page <span className="text-[#1A1F2B] mx-1">{page}</span> of {results.totalPages}
                  </div>
                  <Link href={page < results.totalPages ? buildPageUrl(page + 1) : '#'} className={`w-12 h-12 flex items-center justify-center rounded-[16px] bg-white border border-[#e5e7eb] shadow-sm transition-all ${page < results.totalPages ? 'hover:bg-[#ffffff] hover:border-[#2FA4A9]/30 text-[#1A1F2B]' : 'opacity-30 cursor-not-allowed text-gray-400'}`}>
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}