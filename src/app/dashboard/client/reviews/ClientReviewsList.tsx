"use client";

import { useState } from "react";
import { Star, MessageSquare, Clock, ArrowRight, ShieldCheck, User } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import ReviewModal from "./ReviewModal";

export default function ClientReviewsList({ 
  submittedReviews, 
  unreviewedBookings 
}: { 
  submittedReviews: any[]; 
  unreviewedBookings: any[]; 
}) {
  const [activeTab, setActiveTab] = useState<"pending" | "submitted">("pending");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const handleOpenReview = (booking: any) => {
    setSelectedBooking(booking);
    setIsReviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
       
       {/* TABS */}
       <div className="flex border-b border-[#f5ecd8] gap-8">
          <button 
             onClick={() => setActiveTab("pending")} 
             className={`pb-4 text-sm font-bold uppercase tracking-widest relative ${activeTab === "pending" ? 'text-[#1A1A1A]' : 'text-gray-400 hover:text-gray-600'}`}
          >
             Pending Reviews ({unreviewedBookings.length})
             {activeTab === "pending" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C29967]"></div>}
          </button>
          <button 
             onClick={() => setActiveTab("submitted")} 
             className={`pb-4 text-sm font-bold uppercase tracking-widest relative ${activeTab === "submitted" ? 'text-[#1A1A1A]' : 'text-gray-400 hover:text-gray-600'}`}
          >
             Submitted Reviews ({submittedReviews.length})
             {activeTab === "submitted" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C29967]"></div>}
          </button>
       </div>

       {/* CONTENT */}
       <div>
         
         {activeTab === "pending" && (
           <div className="space-y-4">
             {unreviewedBookings.length === 0 ? (
                <div className="bg-white border text-center border-[#f5ecd8] rounded-3xl p-16 shadow-sm flex flex-col items-center justify-center">
                   <div className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center mb-4">
                     <ShieldCheck className="w-8 h-8 text-green-500" />
                   </div>
                   <h3 className="font-bold text-xl font-serif text-[#1A1A1A] mb-2">You're all caught up!</h3>
                   <p className="text-gray-500 text-sm max-w-sm">
                     You have no pending reviews. Complete a consultation to leave a review.
                   </p>
                </div>
             ) : (
                unreviewedBookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-2xl border border-[#f5ecd8] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-[#C29967] transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[#F6F3F0] flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                          <span className="text-xl font-black font-serif text-[#C29967] uppercase">{b.profile.fullName[0]}</span>
                        </div>
                        <div>
                          <Link href={`/consultant/${b.profile.licenseNumber}`} className="font-bold font-serif text-lg text-[#1A1A1A] hover:text-[#C29967] transition-colors">
                             {b.profile.fullName}
                          </Link>
                          <p className="text-sm text-gray-500 font-medium">{b.type?.title || "Immigration Consultation"}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(new Date(b.scheduledStart), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                     </div>
                     <button 
                       onClick={() => handleOpenReview(b)}
                       className="w-full md:w-auto bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#C29967] transition-colors shadow-lg shadow-black/5 shrink-0"
                     >
                        Write a Review
                     </button>
                  </div>
                ))
             )}
           </div>
         )}

         {activeTab === "submitted" && (
           <div className="space-y-4">
             {submittedReviews.length === 0 ? (
                <div className="bg-white border text-center border-[#f5ecd8] rounded-3xl p-16 shadow-sm flex flex-col items-center justify-center">
                   <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                     <MessageSquare className="w-8 h-8 text-gray-300" />
                   </div>
                   <h3 className="font-bold text-xl font-serif text-[#1A1A1A] mb-2">No reviews yet</h3>
                   <p className="text-gray-500 text-sm max-w-sm">
                     Once you leave a review for a consultant, it will appear here.
                   </p>
                </div>
             ) : (
                submittedReviews.map((r) => (
                  <div key={r.id} className="bg-white rounded-2xl border border-[#f5ecd8] p-6 shadow-sm flex flex-col gap-4">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[#F6F3F0] flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-[#C29967]/30" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Consultant</p>
                            <Link href={`/consultant/${r.profile?.licenseNumber}`} className="font-bold font-serif text-lg text-[#1A1A1A] hover:text-[#C29967] transition-colors">
                               {r.profile?.fullName}
                            </Link>
                          </div>
                       </div>
                       
                       <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                           <div className="flex items-center gap-1 p-2 bg-yellow-50 rounded-lg shrink-0">
                               {Array.from({ length: 5 }).map((_, i) => (
                                 <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                               ))}
                           </div>
                           <div className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest shrink-0 ${r.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                             {r.status.replace("_", " ")}
                           </div>
                       </div>
                     </div>
                     
                     {r.comment && (
                       <div className="bg-[#FDFCFB] border border-[#f5ecd8] rounded-xl p-5 mt-2">
                          <p className="text-gray-600 text-sm leading-relaxed italic">"{r.comment}"</p>
                       </div>
                     )}

                     <div className="flex justify-between items-center text-xs text-gray-400 font-bold uppercase tracking-wide mt-2 pt-4 border-t border-[#f5ecd8]">
                        <span>Posted on {format(new Date(r.createdAt), 'MMM d, yyyy')}</span>
                        {r.booking && <span>Booking ID: {r.booking.id.slice(-6).toUpperCase()}</span>}
                     </div>
                  </div>
                ))
             )}
           </div>
         )}
         
       </div>
       
       {isReviewModalOpen && selectedBooking && (
          <ReviewModal 
            booking={selectedBooking} 
            onClose={() => {
              setIsReviewModalOpen(false);
              setSelectedBooking(null);
            }} 
          />
       )}
    </div>
  );
}
