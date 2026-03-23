import { CalendarDays, Save, Star, Clock, Video, FileText, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export default async function ClientHome() {
  const session = await getServerSession(authOptions);

  const userDetails = await prisma.user.findUnique({
    where: { email: session?.user?.email! },
    include: { clientProfile: true }
  });

  const profile = userDetails?.clientProfile;
  let recommendedConsultants: any[] = [];
  
  if (profile && profile.languages) {
    const langs = profile.languages.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
    if (langs.length > 0) {
      const orConditions = langs.map(l => ({ languages: { contains: l } }));
      recommendedConsultants = await prisma.consultantProfile.findMany({
        where: { OR: orConditions },
        take: 3
      });
    }
  }

  if (recommendedConsultants.length === 0) {
    recommendedConsultants = await prisma.consultantProfile.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' }
    });
  }

  return (
    <div className="space-y-8">
      {/* HEADER / NEXT BEST ACTION */}
      <div className="bg-[#0F2A44] text-white rounded-[32px] p-8 md:p-12 relative overflow-hidden shadow-xl shadow-black/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#2FA4A9]/30 to-transparent blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-serif font-bold mb-3 tracking-wide">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'Client'}.
          </h1>
          <p className="text-gray-400 text-sm mb-8 max-w-lg leading-relaxed">
            You have <strong className="text-white">1 upcoming consultation</strong> and 2 saved consultants waiting for your review. Let's get your immigration journey sorted.
          </p>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 max-w-3xl">
             <div className="w-16 h-16 rounded-[16px] bg-white text-[#1A1F2B] flex items-center justify-center shrink-0">
               <CalendarDays className="w-8 h-8 opacity-80" />
             </div>
             <div className="flex-1">
               <h3 className="text-white font-bold text-lg mb-1">Strategy Session with Amir Hossein</h3>
               <p className="text-gray-300 text-sm flex items-center gap-2">
                 <Clock className="w-4 h-4" /> Tomorrow at 10:00 AM EST &bull; <Video className="w-4 h-4 ml-2" /> Google Meet
               </p>
             </div>
             <div className="shrink-0 w-full md:w-auto">
                <Link href="/dashboard/client/bookings/1" className="block w-full text-center bg-[#2FA4A9] text-[#1A1F2B] font-bold px-6 py-3 rounded-xl hover:bg-[#258d92] transition-colors shadow-lg">
                  View Details
                </Link>
             </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link href="/search" className="bg-white p-6 rounded-3xl border border-[#e5e7eb] shadow-sm hover:shadow-md hover:border-[#2FA4A9]/30 transition-all group">
           <div className="w-12 h-12 bg-[#F5F7FA] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#2FA4A9]/10 transition-colors">
             <User className="w-6 h-6 text-[#1A1F2B] group-hover:text-[#2FA4A9] transition-colors" />
           </div>
           <h3 className="font-bold text-[#1A1F2B] mb-1">Find a Consultant</h3>
           <p className="text-xs text-gray-500">Search vetted and licensed immigration experts.</p>
        </Link>
        <Link href="/dashboard/client/saved" className="bg-white p-6 rounded-3xl border border-[#e5e7eb] shadow-sm hover:shadow-md hover:border-[#2FA4A9]/30 transition-all group">
           <div className="w-12 h-12 bg-[#F5F7FA] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#2FA4A9]/10 transition-colors">
             <Save className="w-6 h-6 text-[#1A1F2B] group-hover:text-[#2FA4A9] transition-colors" />
           </div>
           <h3 className="font-bold text-[#1A1F2B] mb-1">Compare Saved Profiles</h3>
           <p className="text-xs text-gray-500">Review the consultants you've bookmarked.</p>
        </Link>
        <Link href="/dashboard/client/reviews" className="bg-white p-6 rounded-3xl border border-[#e5e7eb] shadow-sm hover:shadow-md hover:border-[#2FA4A9]/30 transition-all group">
           <div className="w-12 h-12 bg-[#F5F7FA] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#2FA4A9]/10 transition-colors">
             <Star className="w-6 h-6 text-[#1A1F2B] group-hover:text-[#2FA4A9] transition-colors" />
           </div>
           <h3 className="font-bold text-[#1A1F2B] mb-1">Leave a Review</h3>
           <p className="text-xs text-gray-500">Help others by rating your past consultations.</p>
        </Link>
      </div>

      {/* RECENT ACTIVITY & RECOMMENDED */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Recent Activity */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
             <h2 className="font-bold text-xl font-serif tracking-tight text-[#1A1F2B]">Recent Activity</h2>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm shadow-[#0F2A44]/5">
            <div className="space-y-6">
              
              <div className="flex gap-4 items-start relative pb-6 border-b border-[#e5e7eb]">
                 <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                   <CalendarDays className="w-5 h-5" />
                 </div>
                 <div>
                   <h4 className="text-sm font-bold text-[#1A1F2B]">Consultation Confirmed</h4>
                   <p className="text-xs text-gray-500 mt-1">Amir Hossein confirmed your meeting for tomorrow. Check your email for the Google Meet link.</p>
                   <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-3 block">2 hours ago</span>
                 </div>
              </div>

              <div className="flex gap-4 items-start relative pb-6 border-b border-[#e5e7eb]">
                 <div className="w-10 h-10 rounded-full bg-[#F5F7FA] text-[#1A1F2B] flex items-center justify-center shrink-0">
                   <FileText className="w-5 h-5" />
                 </div>
                 <div>
                   <h4 className="text-sm font-bold text-[#1A1F2B]">Booking Request Sent</h4>
                   <p className="text-xs text-gray-500 mt-1">You requested a 30-min strategy session with Amir Hossein.</p>
                   <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-3 block">Yesterday</span>
                 </div>
              </div>

            </div>
            <Link href="/dashboard/client/bookings" className="text-sm font-bold text-[#2FA4A9] hover:underline mt-4 inline-block">
              View All History
            </Link>
          </div>
        </div>

        {/* Recommended Consultants */}
        <div>
          <div className="flex items-center justify-between mb-6">
             <h2 className="font-bold text-xl font-serif tracking-tight text-[#1A1F2B]">Recommended for You</h2>
          </div>
          <div className="space-y-4">
            {recommendedConsultants.map((c: any) => (
               <div key={c.id} className="bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#F5F7FA] text-[#1A1F2B] text-xl font-black font-serif flex flex-col items-center justify-center border-2 border-white shadow-sm ring-2 ring-[#e5e7eb]">
                    {c.fullName[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1F2B]">{c.fullName}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{c.company || "Independent RCIC"}</p>
                  </div>
                  {(profile?.languages && c.languages && profile.languages.split(',')[0].trim().toLowerCase() === c.languages.split(',')[0].trim().toLowerCase()) ? (
                     <p className="text-[10px] font-bold uppercase tracking-widest text-[#2FA4A9] bg-[#ffffff] px-3 py-1 rounded-lg border border-[#e5e7eb]">Language Match</p>
                  ) : (
                     <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-100">Top Rated</p>
                  )}
                  <Link href={`/consultant/${c.licenseNumber}`} className="mt-2 w-full flex items-center justify-center gap-2 border border-[#e5e7eb] rounded-xl py-2.5 text-xs font-bold text-[#1A1F2B] hover:bg-[#ffffff] hover:border-[#2FA4A9] transition-all">
                    View Profile <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                  </Link>
               </div>
            ))}
            
            {recommendedConsultants.length === 0 && (
               <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-2xl p-6 text-center text-sm text-gray-500">
                  Fill out your Immigration Profile to get personalized recommendations.
               </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
