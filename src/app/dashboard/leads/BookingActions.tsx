"use client";

import { useState } from "react";
import { Check, X, Link as LinkIcon, Loader2 } from "lucide-react";
import { updateBookingStatus } from "@/actions/booking.actions";
import { useRouter } from "next/navigation";

export default function BookingActions({ bookingId, currentStatus }: { bookingId: string, currentStatus: string }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatusChange = async (status: any, promptForLink: boolean = false) => {
    let meetingLink = undefined;
    if (promptForLink) {
      const link = window.prompt("Enter the meeting link (Google Meet, Zoom, etc):");
      if (link === null) return; // cancelled
      meetingLink = link;
    }

    setIsProcessing(true);
    try {
      await updateBookingStatus(bookingId, status, { meetingLink });
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to update status.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (currentStatus !== "PENDING") {
    return (
      <span className={`text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider ${
        currentStatus === "CONFIRMED" ? "bg-green-50 text-green-700" :
        currentStatus === "DECLINED" ? "bg-red-50 text-red-700" :
        "bg-gray-100 text-gray-600"
      }`}>
        {currentStatus}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button 
        disabled={isProcessing}
        onClick={() => handleStatusChange("CONFIRMED", true)}
        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept
      </button>
      <button 
        disabled={isProcessing}
        onClick={() => handleStatusChange("DECLINED")}
        className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Decline
      </button>
    </div>
  );
}
