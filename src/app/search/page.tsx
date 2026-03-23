import { searchConsultants, getUniqueProvinces, getUniqueStatuses } from "@/lib/db";
import { Search as SearchIcon, ShieldCheck, Mail, Building2, ChevronLeft, ChevronRight, MapPin, Filter, AlertCircle, Globe, ArrowRight } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const statusFilter = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';
  const provinceFilter = typeof resolvedParams.province === 'string' ? resolvedParams.province : '';
  const pageStr = typeof resolvedParams.page === 'string' ? resolvedParams.page : '1';
  let page = parseInt(pageStr, 10);
  if (isNaN(page) || page < 1) page = 1;

  const limit = 24;
  const results = searchConsultants({ search: q, status: statusFilter, province: provinceFilter, page, limit });
  const provinces = getUniqueProvinces();
  const statuses = getUniqueStatuses();

  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    if (provinceFilter) params.set("province", provinceFilter);
    params.set("page", newPage.toString());
    return `/search?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans text-[#1A1A1A] flex flex-col">
      <Header />

      {/* SEARCH AREA - متمرکز و مدرن */}
      <div className="w-full bg-white pt-16 pb-12 px-8 border-b border-[#f5ecd8] bg-gradient-to-b from-[#FDFCFB] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-serif">Find a Verified RCIC</h1>
            <p className="text-[#1A1A1A]/70 mb-8 font-medium">Connect with professionals officially recognized by the CICC.</p>
            
            <form action="/search" method="GET" className="relative flex items-center group">
              <input type="hidden" name="status" value={statusFilter} />
              <input type="hidden" name="province" value={provinceFilter} />
              <div className="absolute left-5 text-gray-400 group-focus-within:text-[#C29967] transition-colors">
                <SearchIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Name, ID Number, or Company..."
                className="w-full h-16 pl-14 pr-36 rounded-2xl bg-[#FDFCFB] border border-[#f5ecd8] focus:bg-white focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/10 transition-all outline-none text-lg shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
              />
              <button type="submit" className="absolute right-3 bg-[#1A1A1A] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-95 shadow-lg shadow-black/10">
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
              <div className="flex items-center justify-between mb-6 border-b border-[#f5ecd8] pb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#C29967]">Filters</h3>
                {(q || statusFilter || provinceFilter) && (
                  <Link href="/search" className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] hover:text-[#C29967] transition-colors">Clear</Link>
                )}
              </div>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#1A1A1A]">Current Standing</h4>
                  <div className="flex flex-wrap lg:flex-col gap-2">
                    {['', ...statuses].map((s, idx) => {
                      const isSelected = statusFilter === s;
                      return (
                        <Link 
                          key={idx}
                          href={s ? `/search?q=${q}&province=${provinceFilter}&status=${encodeURIComponent(s)}` : `/search?q=${q}&province=${provinceFilter}`}
                          className={`px-4 py-2.5 rounded-[12px] text-sm font-medium transition-all ${isSelected ? 'bg-[#1A1A1A] text-white shadow-md' : 'bg-white text-gray-500 hover:bg-[#FDFCFB] border border-[#f5ecd8]'}`}
                        >
                          {s || 'All Statuses'}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Province Selection */}

<div className="space-y-3">
  <h4 className="text-sm font-bold text-[#1A1A1A]">Province</h4>
  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
    <Link 
      href={`/search?q=${q}&status=${statusFilter}`}
      className={`px-4 py-2.5 rounded-[12px] text-sm transition-all ${!provinceFilter ? 'bg-[#F6F3F0] text-[#1A1A1A] font-bold border border-[#f5ecd8]' : 'text-gray-500 hover:bg-[#FDFCFB] hover:text-[#1A1A1A]'}`}
    >
      All Regions
    </Link>
    {provinces.map(p => (
      <Link 
        key={p}
        href={`/search?q=${q}&status=${statusFilter}&province=${encodeURIComponent(p)}`}
        className={`px-4 py-2.5 rounded-[12px] text-sm transition-all ${provinceFilter === p ? 'bg-[#F6F3F0] text-[#1A1A1A] font-bold border border-[#f5ecd8]' : 'text-gray-500 hover:bg-[#FDFCFB] hover:text-[#1A1A1A]'}`}
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
                    <div key={c.License_Number} className="group bg-white border border-[#f5ecd8] p-7 rounded-[32px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:border-[#C29967]/30 transition-all relative overflow-hidden">
                      
                      {/* Background Decoration */}
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#FDFCFB] border border-[#f5ecd8] rounded-full group-hover:bg-[#F6F3F0] transition-colors" />

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-xl font-serif group-hover:text-[#C29967] transition-colors">{c.Full_Name}</h3>
                              {isActive && (
                                <div className="flex items-center justify-center p-1.5 rounded-full bg-[#F6F3F0] border border-[#f5ecd8]" title="Active License">
                                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{c.License_Number}</span>
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-[#F6F3F0] border-[#f5ecd8] text-green-700' : 'bg-[#F6F3F0] border-[#f5ecd8] text-orange-600'}`}>
                            {c.Status}
                          </div>
                        </div>

                        <div className="space-y-3 mb-8">
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <Building2 className="w-4 h-4 text-[#C29967]" />
                            <span className="truncate">{c.Company || 'Independent'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <MapPin className="w-4 h-4 text-[#C29967]" />
                            <span>{c.Province || 'N/A'}{c.Province && c.Country ? ', ' : ''}{c.Country}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-[#f5ecd8]">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                             <Mail className="w-3.5 h-3.5" />
                             {c.Email ? <span className="max-w-[120px] truncate">{c.Email}</span> : 'Private'}
                          </div>
                          <Link href={`/consultant/${c.License_Number}`} className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A1A] hover:text-[#C29967] hover:gap-2.5 transition-all">
                            View Profile <ArrowRight className="w-4 h-4 text-[#C29967]" />
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
                  <Link href={page > 1 ? buildPageUrl(page - 1) : '#'} className={`w-12 h-12 flex items-center justify-center rounded-[16px] bg-white border border-[#f5ecd8] shadow-sm transition-all ${page > 1 ? 'hover:bg-[#FDFCFB] hover:border-[#C29967]/30 text-[#1A1A1A]' : 'opacity-30 cursor-not-allowed text-gray-400'}`}>
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                  <div className="px-6 py-3 bg-white border border-[#f5ecd8] rounded-[16px] text-[13px] font-bold shadow-sm tracking-widest uppercase text-gray-500">
                    Page <span className="text-[#1A1A1A] mx-1">{page}</span> of {results.totalPages}
                  </div>
                  <Link href={page < results.totalPages ? buildPageUrl(page + 1) : '#'} className={`w-12 h-12 flex items-center justify-center rounded-[16px] bg-white border border-[#f5ecd8] shadow-sm transition-all ${page < results.totalPages ? 'hover:bg-[#FDFCFB] hover:border-[#C29967]/30 text-[#1A1A1A]' : 'opacity-30 cursor-not-allowed text-gray-400'}`}>
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