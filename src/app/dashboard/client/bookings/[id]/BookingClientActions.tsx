"use client";

import { useState } from "react";
import { cancelBookingRequest } from "@/actions/booking.actions";
import { useRouter } from "next/navigation";

export default function BookingClientActions({ 
  bookingId, 
  status, 
  meetingLink,
  consultantSlug
}: { 
  bookingId: string; 
  status: string;
  meetingLink: string | null;
  consultantSlug: string;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();

  const handleCancelClick = async () => {
    if (confirm("Are you sure you want to cancel this booking request?")) {
      setIsCancelling(true);
      try {
        await cancelBookingRequest(bookingId);
        router.refresh();
      } catch (e: any) {
        alert(e.message || "Failed to cancel booking.");
        setIsCancelling(false);
      }
    }
  };

  return (
    <div className="bg-gray-50 rounded-[24px] border border-gray-200 p-6 flex flex-col gap-3">
      <h3 className="text-sm font-bold text-gray-600 mb-2">Need Help?</h3>
      
      {status === "PENDING" && (
        <button 
          onClick={handleCancelClick}
          disabled={isCancelling}
          className="w-full bg-white border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {isCancelling ? "Cancelling..." : "Cancel Request"}
        </button>
      )}

      {status === "CONFIRMED" && meetingLink && (
        <a 
          href={meetingLink} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block text-center w-full bg-[#C29967] border border-[#b0895c] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#a07a4f] transition-colors shadow-sm"
        >
          Join Meeting
        </a>
      )}

      {status === "COMPLETED" && (
        <button 
          onClick={() => router.push(`/dashboard/client/reviews?bookingId=${bookingId}`)}
          className="w-full bg-[#1A1A1A] border border-black text-white py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors shadow-sm"
        >
          Leave a Review
        </button>
      )}

      <button onClick={() => window.open(`/consultant/${consultantSlug}`, '_blank')} className="w-full bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors shadow-sm">
        Contact Consultant
      </button>

      <button onClick={() => router.push('/dashboard/support')} className="w-full bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors shadow-sm mt-1">
        Platform Support
      </button>
    </div>
  );
}
