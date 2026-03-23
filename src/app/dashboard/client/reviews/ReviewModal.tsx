"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { submitReview } from "@/actions/reviews.actions";

export default function ReviewModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a star rating.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview({
        bookingId: booking.id,
        consultantProfileId: booking.consultantProfileId,
        rating,
        comment,
      });
      onClose();
    } catch (e: any) {
      alert(e.message || "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
       <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#f5ecd8] bg-[#FDFCFB]">
            <h3 className="font-serif font-bold text-lg text-[#1A1A1A]">Leave a Review</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors" disabled={isSubmitting}>
               <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
             
             <div className="text-center mb-8">
               <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">How was your session with</p>
               <h4 className="font-serif font-bold text-2xl text-[#1A1A1A]">{booking.profile.fullName}?</h4>
             </div>

             <div className="flex justify-center gap-2 mb-8">
               {Array.from({ length: 5 }).map((_, i) => (
                 <button
                   key={i}
                   type="button"
                   onClick={() => setRating(i + 1)}
                   onMouseEnter={() => setHoverRating(i + 1)}
                   onMouseLeave={() => setHoverRating(0)}
                   className="p-1 focus:outline-none"
                   disabled={isSubmitting}
                 >
                   <Star 
                     className={`w-10 h-10 transition-all ${
                       (hoverRating || rating) > i ? 'fill-yellow-400 text-yellow-400 scale-110' : 'fill-gray-100 text-gray-200'
                     }`} 
                   />
                 </button>
               ))}
             </div>

             <div className="space-y-2 mb-8">
               <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Your Feedback (Optional)</label>
               <textarea 
                 rows={4} 
                 value={comment} 
                 onChange={e => setComment(e.target.value)} 
                 placeholder="What did you like about the consultation? Were your questions answered?"
                 className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3.5 rounded-xl text-sm focus:border-[#C29967] outline-none resize-none placeholder-gray-300"
                 disabled={isSubmitting}
               ></textarea>
               <p className="text-[11px] text-gray-400 font-medium">Your review will be public and helps other users find the best consultants.</p>
             </div>

             <div className="flex gap-4">
               <button 
                 type="button" 
                 onClick={onClose} 
                 className="flex-1 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-50 flex items-center justify-center transition-colors"
                 disabled={isSubmitting}
               >
                 Cancel
               </button>
               <button 
                 type="submit" 
                 disabled={isSubmitting || rating === 0}
                 className="flex-1 bg-[#1A1A1A] text-white py-3.5 rounded-xl font-bold hover:bg-black flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/5"
               >
                 {isSubmitting ? "Submitting..." : "Submit Review"}
               </button>
             </div>

          </form>
       </div>
    </div>
  );
}
