import { ArrowUpRight, Eye, MousePointerClick, Star, Users, ShieldCheck, Zap, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import AnnouncementBanner from "./AnnouncementBanner";

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export default async function ConsultantHome() {
  const session = await getServerSession(authOptions);
  
  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: (session?.user as any)?.id }
  });

  const now = new Date();
  
  // Action Required Bookings
  const actionRequiredBookings = profile ? await prisma.booking.findMany({
    where: {
      consultantProfileId: profile.id,
      OR: [
        { status: "PENDING" },
        { status: "CONFIRMED", meetingLink: null },
        { status: "CONFIRMED", scheduledEnd: { lt: now } }
      ]
    },
    include: { type: true },
    orderBy: { scheduledStart: "asc" },
    take: 5
  }) : [];

  const metrics = [
    { label: "Profile Views", value: "342", increase: "+14%", icon: Eye },
    { label: "Pending Actions", value: actionRequiredBookings.length.toString(), increase: "Priority", icon: AlertCircle },
    { label: "Booking Clicks", value: "48", increase: "+22%", icon: MousePointerClick },
    { label: "Avg Rating", value: "4.9", increase: "Top 5%", icon: Star },
  ];

  const unreadAnnouncement = await prisma.notification.findFirst({
    where: {
      userId: (session?.user as any)?.id,
      type: "ADMIN_ANNOUNCEMENT",
      isRead: false
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-8">
      {unreadAnnouncement && (
        <AnnouncementBanner announcement={unreadAnnouncement} />
      )}
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#1A1F2B]">Welcome back, {session?.user?.name?.split(' ')[0] || 'Consultant'}.</h1>
          <p className="text-gray-500 text-sm mt-1">Here's what is happening with your practice today.</p>
        </div>
        <Link 
          href="/dashboard/billing"
           className="bg-[#0F2A44] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-black transition-all flex items-center justify-center gap-2"
        >
          Upgrade for 5x Visibility <ArrowUpRight className="w-4 h-4 text-[#2FA4A9]" />
        </Link>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-[#e5e7eb] shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#F5F7FA] rounded-full group-hover:bg-[#e5e7eb] transition-colors"></div>
              <div className="relative">
                 <div className="flex items-center justify-between mb-4">
                   <div className="w-10 h-10 rounded-xl bg-[#F5F7FA] text-[#2FA4A9] flex items-center justify-center">
                     <Icon className="w-5 h-5" />
                   </div>
                   <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md">{m.increase}</span>
                 </div>
                 <h3 className="text-3xl font-black text-[#1A1F2B] mb-1">{m.value}</h3>
                 <p className="text-sm font-bold text-gray-400">{m.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ACTION INBOX */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-red-100 flex items-center justify-between bg-red-50/30">
            <div className="flex items-center gap-2">
               <AlertCircle className="w-5 h-5 text-red-500" />
               <h2 className="font-bold text-lg text-[#1A1F2B]">Action Inbox</h2>
            </div>
            {actionRequiredBookings.length > 0 && (
               <Link href="/dashboard/booking" className="text-sm font-bold text-red-600 hover:underline">View All Actions</Link>
            )}
          </div>
          
          <div className="flex-1 flex flex-col">
             {actionRequiredBookings.length === 0 ? (
               <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center flex-1">
                 <CheckCircle2 className="w-12 h-12 text-green-300 mb-3" />
                 <p className="font-bold text-[#1A1F2B]">You're all caught up!</p>
                 <p className="text-sm mt-1 max-w-[250px]">No pending requests or actions required at this time.</p>
               </div>
             ) : (
               <div className="divide-y divide-gray-100">
                  {actionRequiredBookings.map(booking => {
                    const isPending = booking.status === "PENDING";
                    const isMissingLink = booking.status === "CONFIRMED" && !booking.meetingLink;
                    const isAwaitingCompletion = booking.status === "CONFIRMED" && new Date(booking.scheduledEnd) < now;

                    return (
                      <div key={booking.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                         <div className="flex items-center gap-4">
                           <div className={`w-1.5 h-12 rounded-full ${isPending ? 'bg-orange-500' : isAwaitingCompletion ? 'bg-purple-500' : 'bg-red-500'}`} />
                           <div>
                             <h4 className="font-bold text-[#1A1F2B]">{booking.userFirstName} {booking.userLastName} <span className="text-gray-400 font-normal ml-1">· {booking.type.title}</span></h4>
                             <div className="flex items-center gap-3 text-xs font-bold mt-1">
                               {isPending && <span className="text-orange-600">Needs Response</span>}
                               {isMissingLink && <span className="text-red-500">Missing Meeting Link</span>}
                               {isAwaitingCompletion && <span className="text-purple-600">Awaiting Completion</span>}
                               <span className="text-gray-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(new Date(booking.scheduledStart), "MMM d, h:mm a")}</span>
                             </div>
                           </div>
                         </div>
                         <Link 
                           href={`/dashboard/booking/${booking.id}`}
                           className="bg-[#0F2A44] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-black transition-colors self-start sm:self-center whitespace-nowrap"
                         >
                           Take Action
                         </Link>
                      </div>
                    )
                  })}
               </div>
             )}
          </div>
        </div>

        {/* QUICK SETUP ACTIONS */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
           <h2 className="font-bold text-lg text-[#1A1F2B] mb-5">Profile Checklist</h2>
           <div className="space-y-4">
             <Link href="/dashboard/profile" className="block w-full p-4 rounded-2xl border border-gray-100 hover:border-[#2FA4A9]/30 hover:bg-[#ffffff] transition-all group">
               <h4 className="font-bold text-sm text-[#1A1F2B] group-hover:text-[#2FA4A9] transition-colors mb-1">Add Areas of Practice</h4>
               <p className="text-xs text-gray-500">List Express Entry, Study Permits, etc.</p>
             </Link>
             <Link href="/dashboard/booking" className="block w-full p-4 rounded-2xl border border-gray-100 hover:border-[#2FA4A9]/30 hover:bg-[#ffffff] transition-all group">
               <h4 className="font-bold text-sm text-[#1A1F2B] group-hover:text-[#2FA4A9] transition-colors mb-1">Enable Booking</h4>
               <p className="text-xs text-gray-500">Connect your calendar to get paid.</p>
             </Link>
             <Link href="/dashboard/profile" className="block w-full p-4 rounded-2xl border border-gray-100 hover:border-[#2FA4A9]/30 hover:bg-[#ffffff] transition-all group">
               <h4 className="font-bold text-sm text-[#1A1F2B] group-hover:text-[#2FA4A9] transition-colors mb-1">Upload Headshot</h4>
               <p className="text-xs text-gray-500">Increase trust and click-through rates.</p>
             </Link>
           </div>
        </div>

      </div>

      {/* EARNINGS & COMMISSION (ANTI-BYPASS & UPGRADE HOOK) */}
      <div className="mt-8 bg-[#0F2A44] text-white rounded-3xl p-8 border border-black shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="relative z-10 flex-1">
            <h2 className="text-xl font-serif font-bold text-[#2FA4A9] mb-2">Earnings & Commission</h2>
            <p className="text-gray-400 text-sm max-w-lg mb-6">You are currently on the <strong className="text-white">Free Plan (21% Commission)</strong>. Upgrade to keep more of what you earn.</p>
            
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Earned (30d)</p>
                <p className="text-3xl font-black">$1,000<span className="text-sm font-medium text-gray-500 ml-1">CAD</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Verixa Fee (21%)</p>
                <p className="text-3xl font-black text-red-400">-$210<span className="text-sm font-medium text-red-400/50 ml-1">CAD</span></p>
              </div>
              <div>
                <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">Net Earnings</p>
                <p className="text-3xl font-black text-green-400">$790<span className="text-sm font-medium text-green-400/50 ml-1">CAD</span></p>
              </div>
            </div>
         </div>
         
         <div className="relative z-10 w-full md:w-auto bg-white/5 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-sm">
            <p className="text-xs text-gray-300 font-bold uppercase tracking-widest mb-2">Optimize Revenue</p>
            <p className="text-sm text-gray-300 mb-4 max-w-[200px]">Upgrade to <strong className="text-white">Starter</strong> and pay only <strong className="text-white">8% commission</strong> ($80 fee).</p>
            <Link href="/dashboard/billing" className="inline-block w-full bg-[#2FA4A9] text-[#1A1F2B] font-bold py-3 rounded-xl hover:bg-[#258d92] transition-colors shadow-lg">
              Upgrade to Starter
            </Link>
         </div>
      </div>

      {/* GAMIFICATION & BADGES ENGINE */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-xl font-serif text-[#1A1F2B]">Achievements & Trust Badges</h2>
          <Link href="/dashboard/performance" className="text-sm font-bold text-[#2FA4A9] hover:underline">View All Badges</Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
           {/* Earned Badge 1 */}
           <div className="bg-gradient-to-br from-[#0F2A44] to-black rounded-3xl p-6 shadow-xl shadow-black/10 border border-black relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform"><ShieldCheck className="w-24 h-24 text-[#2FA4A9]" /></div>
             <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 border border-white/20">
               <ShieldCheck className="w-6 h-6 text-[#2FA4A9]" />
             </div>
             <h3 className="text-white font-bold mb-1">Verified Professional</h3>
             <p className="text-gray-400 text-xs">Identity and license fully verified.</p>
             <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase text-green-400">Active Award</span>
             </div>
           </div>

           {/* Earned Badge 2 */}
           <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#2FA4A9]/30 relative overflow-hidden">
             <div className="w-12 h-12 rounded-xl bg-[#F5F7FA] flex items-center justify-center mb-4">
               <Zap className="w-6 h-6 text-[#1A1F2B] fill-black" />
             </div>
             <h3 className="text-[#1A1F2B] font-bold mb-1">Fast Responder</h3>
             <p className="text-gray-500 text-xs">Average response time under 2 hours.</p>
             <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#2FA4A9]">Active on profile</span>
             </div>
           </div>

           {/* Locked Badge Progress 1 */}
           <div className="bg-gray-50 rounded-3xl p-6 border border-dashed border-gray-200 relative overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
             <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
               <Star className="w-6 h-6 text-gray-300" />
             </div>
             <div className="flex items-center justify-between mb-1">
               <h3 className="text-gray-600 font-bold">Top Rated Pro</h3>
               <span className="text-xs font-bold text-gray-400">7/10</span>
             </div>
             <p className="text-gray-400 text-xs">Collect 10 positive reviews.</p>
             <div className="mt-4 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#2FA4A9] rounded-full w-[70%]"></div>
             </div>
           </div>

           {/* Locked Badge Progress 2 */}
           <div className="bg-gray-50 rounded-3xl p-6 border border-dashed border-gray-200 relative overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
             <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
               <Users className="w-6 h-6 text-gray-300" />
             </div>
             <div className="flex items-center justify-between mb-1">
               <h3 className="text-gray-600 font-bold">10+ Clients Served</h3>
               <span className="text-xs font-bold text-gray-400">3/10</span>
             </div>
             <p className="text-gray-400 text-xs">Complete 10 paid bookings via Verixa.</p>
             <div className="mt-4 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#0F2A44] rounded-full w-[30%]"></div>
             </div>
           </div>
        </div>
      </div>

    </div>
  );
}
