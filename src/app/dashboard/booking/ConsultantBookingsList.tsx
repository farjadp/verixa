"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight, Video } from "lucide-react";
import Link from "next/link";
import { Booking } from "@prisma/client";

type ExtendedBooking = Booking & {
  type: { title: string; priceCents: number };
};

export default function ConsultantBookingsList({ bookings }: { bookings: ExtendedBooking[] }) {
  const [activeTab, setActiveTab] = useState<"ACTION_REQUIRED" | "UPCOMING" | "COMPLETED" | "CANCELLED">("ACTION_REQUIRED");

  const now = new Date();

  // Filter Logic
  const actionRequired = bookings.filter(b => 
    b.status === "PENDING" || 
    (b.status === "CONFIRMED" && !b.meetingLink) || 
    (b.status === "CONFIRMED" && new Date(b.scheduledEnd) < now) // Needs to be marked completed
  );

  const upcoming = bookings.filter(b => b.status === "CONFIRMED" && new Date(b.scheduledEnd) >= now && !!b.meetingLink);
  const completed = bookings.filter(b => b.status === "COMPLETED");
  const cancelled = bookings.filter(b => ["CANCELLED", "CANCELLED_BY_USER", "CANCELLED_BY_CONSULTANT", "DECLINED", "NO_SHOW"].includes(b.status));

  const getFilteredBookings = () => {
    switch (activeTab) {
      case "ACTION_REQUIRED": return actionRequired.sort((a,b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
      case "UPCOMING": return upcoming.sort((a,b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
      case "COMPLETED": return completed.sort((a,b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
      case "CANCELLED": return cancelled.sort((a,b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
      default: return [];
    }
  };

  const displayedBookings = getFilteredBookings();

  return (
    <div className="space-y-6">
      
      {/* TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: "ACTION_REQUIRED", label: "Action Required", icon: AlertCircle, count: actionRequired.length },
          { id: "UPCOMING", label: "Upcoming", icon: CalendarDays, count: upcoming.length },
          { id: "COMPLETED", label: "Completed", icon: CheckCircle2, count: completed.length },
          { id: "CANCELLED", label: "Cancelled", icon: XCircle, count: cancelled.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                isActive 
                  ? tab.id === "ACTION_REQUIRED" ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "bg-[#1A1A1A] text-white shadow-md shadow-black/10"
                  : "bg-white text-gray-500 border border-gray-100 hover:border-gray-300 hover:text-[#1A1A1A]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? (tab.id === 'ACTION_REQUIRED' ? 'bg-white/20' : 'bg-white/20') : 'bg-gray-100 text-gray-600'}`}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {displayedBookings.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">No bookings found</h3>
            <p className="text-gray-500">You don't have any bookings in this category.</p>
          </div>
        ) : (
          displayedBookings.map(booking => {
            const isPending = booking.status === "PENDING";
            const needsLink = booking.status === "CONFIRMED" && !booking.meetingLink;
            const needsCompletion = booking.status === "CONFIRMED" && new Date(booking.scheduledEnd) < now;

            return (
              <Link href={`/dashboard/booking/${booking.id}`} key={booking.id} className="block group">
                <div className="bg-white border border-gray-100 hover:border-[#C29967] rounded-2xl p-6 transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  
                  {/* Left Accent Bar for Action Required */}
                  {activeTab === "ACTION_REQUIRED" && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPending ? 'bg-orange-500' : needsCompletion ? 'bg-purple-500' : 'bg-red-500'}`} />
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-[#1A1A1A] text-lg">{booking.userFirstName} {booking.userLastName}</h3>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                        {booking.type.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <CalendarDays className="w-4 h-4 text-[#C29967]" />
                        {format(new Date(booking.scheduledStart), "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-4 h-4 text-[#C29967]" />
                        {format(new Date(booking.scheduledStart), "h:mm a")}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Video className="w-4 h-4 text-[#C29967]" />
                        {booking.meetingMethod || "Online"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
                    {/* Urgency / Status Badges */}
                    {activeTab === "ACTION_REQUIRED" && (
                      <div className="text-left md:text-right mr-4">
                        {isPending && <p className="text-orange-600 font-bold text-sm">Response Required</p>}
                        {needsLink && <p className="text-red-500 font-bold text-sm">Missing Meeting Link</p>}
                        {needsCompletion && <p className="text-purple-600 font-bold text-sm">Awaiting Completion</p>}
                      </div>
                    )}
                    
                    <button className="bg-[#FDFCFB] text-[#1A1A1A] font-bold px-6 py-3 rounded-xl border border-gray-100 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors flex items-center gap-2">
                       {activeTab === "ACTION_REQUIRED" ? "Take Action" : "View Details"}
                       <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
