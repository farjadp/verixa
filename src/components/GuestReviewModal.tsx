"use client";

import { useState } from "react";
import { X, Star, AlertCircle } from "lucide-react";
import { submitGuestReview } from "@/actions/reviews.actions";

export default function GuestReviewModal({ licenseNumber, consultantName, onClose }: { licenseNumber: string, consultantName: string, onClose: () => void }) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    if (!guestName.trim() || !guestEmail.trim()) {
      setError("Name and email are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await submitGuestReview({ licenseNumber, guestName, guestEmail, rating, comment });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-lg font-serif">Write a Review</h3>
          <button onClick={onClose} className="p-2 bg-white rounded-full border border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6 flex flex-col items-center justify-center">
            <p className="text-sm font-semibold text-gray-500 mb-3">Rate your experience with {consultantName}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={`w-8 h-8 ${star <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-100'}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Your Name</label>
                <input required type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="John Doe" className="w-full border py-2.5 px-3 rounded-xl text-sm focus:border-[#2FA4A9] outline-none bg-gray-50 focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Email Address</label>
                <input required type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="john@example.com" className="w-full border py-2.5 px-3 rounded-xl text-sm focus:border-[#2FA4A9] outline-none bg-gray-50 focus:bg-white transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Your Review</label>
              <textarea 
                required 
                value={comment} 
                onChange={e => setComment(e.target.value)} 
                placeholder="Share your experience..." 
                rows={4}
                className="w-full border py-3 px-4 rounded-xl text-sm focus:border-[#2FA4A9] outline-none bg-gray-50 focus:bg-white transition-colors resize-none"
              />
            </div>
            
            <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-start gap-3">
               <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
               <p className="text-xs text-orange-700 leading-relaxed font-medium">As a guest reviewer, an "Unverified" badge will be publicly displayed next to your review.</p>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-4 font-medium text-center">{error}</p>
          )}

          <div className="mt-6">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#0F2A44] hover:bg-black text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Post Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
