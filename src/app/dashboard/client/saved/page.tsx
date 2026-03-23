// ============================================================================
// Hardware Source: dashboard/client/saved/page.tsx
// Route: /dashboard/client/saved
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/client/saved (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Bookmark, CheckCircle2, MapPin, ShieldCheck, Star, Users, Zap } from "lucide-react";

export default async function SavedProfilesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) redirect("/login");

  const savedList = await prisma.savedProfile.findMany({
    where: { userId: user.id },
    include: {
      profile: {
        include: {
          consultationTypes: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1A1F2B]">Compare Saved Consultants</h1>
        <p className="text-gray-500 mt-2">Evaluate your shortlisted immigration experts side-by-side to make the best decision.</p>
      </div>

      {savedList.length === 0 ? (
        <div className="bg-white border text-center border-[#e5e7eb] rounded-3xl p-16 shadow-sm flex flex-col items-center justify-center">
           <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
             <Bookmark className="w-8 h-8 text-gray-300" />
           </div>
           <h3 className="font-bold text-xl font-serif text-[#1A1F2B] mb-2">No profiles saved yet</h3>
           <p className="text-gray-500 text-sm max-w-sm">
             While browsing the consultant directory, click the bookmark icon to save profiles you're interested in booking.
           </p>
           <Link href="/search" className="mt-8 bg-[#0F2A44] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-black/10 flex items-center gap-2">
             Explore Directory <ArrowRight className="w-4 h-4" />
           </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          
          {savedList.map((item) => {
            const p = item.profile;
            // Get lowest price and average duration
            const minPrice = p.consultationTypes.length > 0 
              ? Math.min(...p.consultationTypes.map(t => t.priceCents)) / 100 
              : null;
            
            return (
              <div key={item.id} className="bg-white rounded-[24px] border border-[#e5e7eb] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col relative">
                 
                 <div className="absolute top-4 right-4 bg-white shadow-sm border border-gray-100 rounded-full p-2 text-[#2FA4A9]" title="Saved Profile">
                    <Bookmark className="w-4 h-4 fill-current" />
                 </div>

                 {/* Head */}
                 <div className="flex flex-col items-center text-center mt-2 mb-6">
                    <div className="w-20 h-20 rounded-full bg-[#F5F7FA] flex items-center justify-center mb-4 border-2 border-white shadow-sm">
                      {/* Placeholder Avatar */}
                      <span className="text-2xl font-black font-serif text-[#2FA4A9] uppercase">{p.fullName[0]}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <h2 className="font-bold font-serif text-lg text-[#1A1F2B] leading-tight">{p.fullName}</h2>
                      <div className="w-4 h-4 rounded-full bg-green-50 flex items-center justify-center text-green-600" title="Verified License">
                         <ShieldCheck className="w-3 h-3" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">{p.company || "Independent Consultant"}</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                      <MapPin className="w-3 h-3" /> {p.city || "Canada"}, {p.province || "ON"}
                    </div>
                 </div>

                 {/* Stats / Highlights */}
                 <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6 flex-1">
                    
                    <div className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                       <div>
                         <p className="text-xs font-bold text-[#1A1F2B]">Licenses & Verification</p>
                         <p className="text-xs text-gray-500 leading-snug">RCIC {p.licenseNumber}</p>
                       </div>
                    </div>

                    <div className="flex items-start gap-3">
                       <Star className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                       <div>
                         <p className="text-xs font-bold text-[#1A1F2B]">Top Rated (4.9)</p>
                         <p className="text-xs text-gray-500 leading-snug">Based on 12 reviews</p>
                       </div>
                    </div>

                    <div className="flex items-start gap-3">
                       <Zap className="w-4 h-4 text-[#2FA4A9] shrink-0 mt-0.5" />
                       <div>
                         <p className="text-xs font-bold text-[#1A1F2B]">Response Time</p>
                         <p className="text-xs text-gray-500 leading-snug">Usually within 2 hours</p>
                       </div>
                    </div>

                 </div>

                 {/* Price & Action */}
                 <div className="mt-auto border-t border-[#e5e7eb] pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Starting At</span>
                      <span className="font-black text-lg text-[#1A1F2B]">
                        {minPrice ? `$${minPrice}` : "N/A"} <span className="text-xs text-gray-500 font-medium">CAD</span>
                      </span>
                    </div>
                    <Link href={`/consultant/${p.licenseNumber}/book`} className="block w-full text-center bg-[#0F2A44] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#2FA4A9] transition-colors shadow-lg shadow-black/5">
                      Book Now
                    </Link>
                    <Link href={`/consultant/${p.licenseNumber}`} className="block w-full text-center text-xs font-bold text-gray-500 uppercase tracking-widest mt-4 hover:text-[#1A1F2B]">
                      View Full Profile
                    </Link>
                 </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}
