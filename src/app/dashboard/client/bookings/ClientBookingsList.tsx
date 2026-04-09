"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Clock, Video, User, ChevronRight, XCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Booking, ConsultantProfile, ConsultationType } from "@prisma/client";

type PopulatedBooking = Booking & {
  profile: ConsultantProfile;
  type: ConsultationType;
};

export default function ClientBookingsList({ bookings }: { bookings: PopulatedBooking[] }) {
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Pending" | "Completed" | "Cancelled">("Upcoming");

  // Tab filtering logic
  const filteredBookings = bookings.filter((b) => {
    switch (activeTab) {
      case "Upcoming":
        return b.status === "CONFIRMED" && new Date(b.scheduledStart) > new Date();
      case "Pending":
        return b.status === "PENDING";
      case "Completed":
        return b.status === "COMPLETED";
      case "Cancelled":
        return ["CANCELLED_BY_USER", "CANCELLED_BY_CONSULTANT", "DECLINED", "NO_SHOW"].includes(b.status);
      default:
        return true;
    }
  });

  const tabs = ["Upcoming", "Pending", "Completed", "Cancelled"] as const;

  return (
    <div className="space-y-6">
      {/* TABS HEADER */}
      <div className="flex gap-8 border-b border-[#e5e7eb]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#2FA4A9] text-[#1A1F2B]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab}
            <span className="ml-2 text-xs bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full">
              {bookings.filter(b => {
                 if (tab === "Upcoming") return b.status === "CONFIRMED" && new Date(b.scheduledStart) > new Date();
                 if (tab === "Pending") return b.status === "PENDING";
                 if (tab === "Completed") return b.status === "COMPLETED";
                 if (tab === "Cancelled") return ["CANCELLED_BY_USER", "CANCELLED_BY_CONSULTANT", "DECLINED", "NO_SHOW"].includes(b.status);
                 return false;
              }).length}
            </span>
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white border text-center border-[#e5e7eb] rounded-3xl p-12 shadow-sm">
             <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
             <h3 className="font-bold text-lg text-[#1A1F2B] mb-1">No {activeTab.toLowerCase()} bookings</h3>
             <p className="text-gray-500 text-sm max-w-sm mx-auto">
               When you book a consultation, it will show up here.
             </p>
             {activeTab === "Upcoming" && (
                <Link href="/search" className="mt-6 inline-block bg-[#0F2A44] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black shadow-lg">
                  Find a Consultant
                </Link>
             )}
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white border border-[#e5e7eb] rounded-[24px] p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center hover:shadow-md transition-all group">
               {/* Avatar */}
               <div className="w-16 h-16 rounded-[16px] bg-[#F5F7FA] flex items-center justify-center shrink-0 border border-[#e5e7eb]/50">
                  <User className="w-8 h-8 opacity-40 text-[#2FA4A9]" />
               </div>

               {/* Meta */}
               <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg font-serif text-[#1A1F2B]">{booking.profile.fullName}</h3>
                    {booking.status === "CONFIRMED" && <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">Confirmed</span>}
                    {booking.status === "PENDING" && <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">Pending</span>}
                    {booking.status === "DECLINED" && <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">Declined</span>}
                  </div>
                  <p className="text-sm font-bold text-gray-500">{booking.type.title}</p>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {format(new Date(booking.scheduledStart), "MMMM d, yyyy")}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(new Date(booking.scheduledStart), "h:mm a")} - {format(new Date(booking.scheduledEnd), "h:mm a")}</span>
                    <span className="flex items-center gap-1"><Video className="w-4 h-4" /> {booking.meetingMethod || "Virtual"}</span>
                  </div>
               </div>

               {/* Actions */}
               <div className="w-full md:w-auto flex items-center gap-3 shrink-0 border-t border-[#e5e7eb] md:border-none pt-4 md:pt-0 mt-2 md:mt-0">
                  {booking.status === "CONFIRMED" && booking.meetingLink && (
                    <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="bg-[#2FA4A9] text-[#1A1F2B] font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#258d92] transition-colors shadow-sm">
                      Join Meeting
                    </a>
                  )}
                  {booking.status === "PENDING" && (
                    <button 
                       onClick={async () => {
                         if(confirm("Are you sure you want to cancel this booking request?")) {
                           const { cancelBookingRequest } = await import("@/actions/booking.actions");
                           try {
                             await cancelBookingRequest(booking.id);
                             window.location.reload();
                           } catch(e) {
                             alert("Failed to cancel booking.");
                           }
                         }
                       }}
                       className="bg-gray-100 text-gray-600 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors shadow-sm"
                    >
                      Cancel Request
                    </button>
                  )}
                  <Link href={`/dashboard/client/bookings/${booking.id}`} className="bg-white border border-[#e5e7eb] text-[#1A1F2B] font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#ffffff] hover:border-[#2FA4A9]/30 transition-all flex items-center gap-1">
                    Details <ChevronRight className="w-4 h-4" />
                  </Link>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
