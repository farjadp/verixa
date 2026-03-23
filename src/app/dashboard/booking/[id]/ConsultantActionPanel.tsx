"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { updateBookingStatus, markBookingNoShow, markBookingCompleted } from "@/actions/booking.actions";
import { Check, X, Video, FileText, Send, AlertTriangle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ConsultantActionPanel({ booking }: { booking: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const defaults = booking.profile?.bookingSettings || {};
  const [linkInput, setLinkInput] = useState(booking.meetingLink || defaults.defaultMeetingLink || "");
  const [notesInput, setNotesInput] = useState(booking.consultantNotes || defaults.defaultMeetingInstructions || "");
  const [method, setMethod] = useState(booking.meetingMethod || defaults.defaultMeetingMethod || "VIDEO");
  const [isConfirming, setIsConfirming] = useState(false);

  const isPending = booking.status === "PENDING";
  const isConfirmed = booking.status === "CONFIRMED";
  const isPast = new Date(booking.scheduledEnd) < new Date();
  
  const handleConfirmAccept = async () => {
    try {
      setLoading(true);
      await updateBookingStatus(booking.id, "CONFIRMED", {
        meetingLink: linkInput,
        meetingMethod: method,
        consultantNotes: notesInput
      });
      setIsConfirming(false);
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this booking?")) return;
    try {
      setLoading(true);
      await updateBookingStatus(booking.id, "DECLINED");
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleUpdateDetails = async () => {
    try {
      setLoading(true);
      await updateBookingStatus(booking.id, booking.status, {
        meetingLink: linkInput,
        consultantNotes: notesInput,
        meetingMethod: method
      });
      alert("Meeting details updated successfully.");
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleMarkCompleted = async () => {
    try {
      setLoading(true);
      await markBookingCompleted(booking.id);
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleMarkNoShow = async () => {
    if (!confirm("Mark this client as a No-Show? This affects their reliability score.")) return;
    try {
      setLoading(true);
      await markBookingNoShow(booking.id);
      router.refresh();
    } finally { setLoading(false); }
  };


  if (booking.status === "COMPLETED") {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Check className="w-6 h-6" />
          <div>
            <h3 className="font-bold text-lg">Session Completed</h3>
            <p className="opacity-90">You have successfully marked this consultation as complete.</p>
          </div>
        </div>
      </div>
    );
  }

  if (["DECLINED", "CANCELLED", "CANCELLED_BY_USER", "CANCELLED_BY_CONSULTANT", "NO_SHOW"].includes(booking.status)) {
    return (
      <div className="bg-gray-100 border border-gray-200 text-gray-600 p-6 rounded-3xl flex items-center gap-3">
        <X className="w-6 h-6" />
        <div>
          <h3 className="font-bold text-lg">Session Inactive</h3>
          <p className="opacity-90">Current status: {booking.status}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* PHASE 1: ACCEPT / DECLINE PENDING REQUESTS */}
      {isPending && (
        <div className="bg-[#1A1A1A] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#C29967]/20 rounded-full blur-3xl mix-blend-screen" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 text-orange-400">
               <Clock className="w-5 h-5" />
               <span className="font-bold text-sm tracking-widest uppercase">Response Required</span>
            </div>
            
            <h2 className="text-3xl font-serif font-bold">New Booking Request</h2>
            <p className="text-gray-300 max-w-lg leading-relaxed">
               Please review the client's information below. Accepting this booking will automatically notify the client and lock this time slot.
            </p>
            
            {!isConfirming ? (
              <div className="flex flex-wrap gap-4 pt-4">
                 <button 
                  onClick={() => setIsConfirming(true)} 
                  className="bg-[#C29967] hover:bg-[#a07a4f] text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#C29967]/30"
                 >
                   <Check className="w-5 h-5" /> Accept Booking
                 </button>
                 <button 
                  onClick={handleDecline}
                  disabled={loading}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl transition-all"
                 >
                   Decline
                 </button>
              </div>
            ) : (
              <div className="pt-6 mt-4 border-t border-white/10 space-y-5">
                 <h3 className="font-bold text-xl text-white">Confirm Meeting Details</h3>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-300 mb-1">Meeting Method</label>
                   <select 
                     value={method} 
                     onChange={e => setMethod(e.target.value)} 
                     className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C29967] appearance-none"
                   >
                     <option value="VIDEO" className="text-black">Video Call</option>
                     <option value="PHONE" className="text-black">Phone Call</option>
                     <option value="IN_PERSON" className="text-black">In Person</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-300 mb-1">Meeting Link / Address</label>
                   <input 
                     type="text" 
                     value={linkInput} 
                     onChange={e => setLinkInput(e.target.value)} 
                     placeholder="e.g. Zoom link or Office address"
                     className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#C29967]"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-300 mb-1">Preparation Instructions (Visible to Client)</label>
                   <textarea 
                     value={notesInput} 
                     onChange={e => setNotesInput(e.target.value)} 
                     rows={3} 
                     placeholder="e.g. Please join 5 minutes early."
                     className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C29967] resize-none"
                   />
                 </div>
                 
                 <div className="flex flex-wrap gap-4 pt-4">
                   <button 
                     onClick={handleConfirmAccept} 
                     disabled={loading}
                     className="bg-[#C29967] text-white font-bold px-8 py-3.5 rounded-xl flex items-center gap-2 hover:bg-[#a07a4f] transition-colors"
                   >
                     <Send className="w-5 h-5" /> Confirm & Send Details
                   </button>
                   <button 
                     onClick={() => setIsConfirming(false)} 
                     disabled={loading}
                     className="bg-transparent border border-white/20 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
                   >
                     Cancel
                   </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHASE 2: ADD MEETING LINK FOR CONFIRMED */}
      {isConfirmed && !isPast && (
        <div className="bg-white border-2 border-[#f5ecd8] p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#f5ecd8] pb-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[#C29967]/10 flex items-center justify-center text-[#C29967]">
                  <Video className="w-5 h-5" />
               </div>
               <div>
                 <h3 className="font-bold text-xl text-[#1A1A1A]">Meeting Details</h3>
                 {booking.meetingLink ? (
                    <p className="text-green-600 font-bold text-sm flex items-center gap-1 mt-0.5"><Check className="w-3.5 h-3.5" /> Link attached</p>
                 ) : (
                    <p className="text-red-500 font-bold text-sm flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3.5 h-3.5" /> Missing link required for session</p>
                 )}
               </div>
             </div>
          </div>

          <div className="space-y-4">
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Meeting Platform / Method</label>
               <input 
                 type="text" 
                 value={method} 
                 onChange={e => setMethod(e.target.value)} 
                 placeholder="e.g. Zoom, Google Meet, In-Person Address"
                 className="w-full bg-[#FDFCFB] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#C29967]"
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Meeting Link</label>
               <input 
                 type="url" 
                 value={linkInput} 
                 onChange={e => setLinkInput(e.target.value)} 
                 placeholder="https://..."
                 className="w-full bg-[#FDFCFB] border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-[#C29967]"
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Preparation Instructions (Visible to Client)</label>
               <textarea 
                 value={notesInput} 
                 onChange={e => setNotesInput(e.target.value)} 
                 rows={3} 
                 placeholder="Any documents they need to prepare?"
                 className="w-full bg-[#FDFCFB] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#C29967] resize-none"
               />
             </div>
             
             <div className="flex justify-end pt-2">
               <button 
                 onClick={handleUpdateDetails} 
                 disabled={loading}
                 className="bg-[#1A1A1A] text-white font-bold px-8 py-3.5 rounded-xl hover:bg-black transition-colors flex items-center gap-2"
               >
                 <Send className="w-4 h-4" /> Save & Notify Client
               </button>
             </div>
          </div>
        </div>
      )}

      {/* PHASE 3/4: SESSION COMPLETION */}
      {isConfirmed && isPast && (
        <div className="bg-purple-50 border-2 border-purple-100 p-8 rounded-3xl shadow-sm space-y-4 text-center">
           <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-2">
             <Check className="w-8 h-8" />
           </div>
           <h3 className="font-bold text-2xl text-purple-900">Session Completed?</h3>
           <p className="text-purple-700/80 max-w-md mx-auto">
             The scheduled time for this session has passed. Please update the outcome of this meeting to trigger the review process.
           </p>

           <div className="flex justify-center gap-4 pt-4">
              <button 
                onClick={handleMarkCompleted}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-purple-500/30 transition-all flex items-center gap-2"
              >
                <Check className="w-5 h-5" /> Yes, Mark Completed
              </button>
              <button 
                onClick={handleMarkNoShow}
                disabled={loading}
                className="bg-white border-2 border-purple-200 text-purple-700 font-bold px-8 py-4 rounded-xl hover:bg-purple-100 transition-all"
              >
                Client No-Show
              </button>
           </div>
        </div>
      )}

    </div>
  );
}
