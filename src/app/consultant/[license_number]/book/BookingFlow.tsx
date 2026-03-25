"use client";

import { useState } from "react";
import { Clock, Video, ArrowRight, Phone, Users, CheckCircle2, ChevronRight, Globe, AlertCircle, FileText } from "lucide-react";
import { format, addDays, startOfToday } from "date-fns";
import { getAvailableSlots, createBookingRequest } from "@/actions/booking.actions";
import CountrySelect from "@/components/ui/CountrySelect";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { createPaymentIntentAction } from "@/actions/stripe.actions";
import StripePaymentForm from "./StripePaymentForm";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function BookingFlow({ profile, sessionUser }: { profile: any; sessionUser?: any }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedType, setSelectedType] = useState<any | null>(null);
  
  // Date Selection
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{ start: Date; end: Date }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  // Intake Form
  const [formData, setFormData] = useState({
    firstName: sessionUser?.name?.split(" ")[0] || "",
    lastName: sessionUser?.name?.split(" ").slice(1).join(" ") || "",
    email: sessionUser?.email || "",
    phone: "",
    country: "",
    preferredLanguage: "English",
    serviceNeeded: "",
    urgency: "Standard",
    preferredCommunicationMethod: "Video Call",
    caseDescription: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  
  // Stripe States
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);

  const steps = ["Session", "Time", "Details", "Review", "Done"];

  const handleSelectType = (type: any) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleSelectDate = async (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setIsLoadingSlots(true);
    try {
      // Format to YYYY-MM-DD local
      const dateStr = format(date, "yyyy-MM-dd");
      const slots = await getAvailableSlots(profile.licenseNumber, dateStr, selectedType.id);
      setAvailableSlots(slots);
    } catch (e) {
      console.error(e);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleProceedToReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    
    setIsPreparingPayment(true);
    setSubmitError("");
    setStep(4);
    
    try {
      // Generate the Hold PaymentIntent based strictly on the selected Consultation Type price
      const res = await createPaymentIntentAction(selectedType.priceCents, {
        licenseNumber: profile.licenseNumber,
        clientEmail: formData.email,
        consultationTypeId: selectedType.id
      });
      
      if (res.success && res.clientSecret) {
        setClientSecret(res.clientSecret);
      } else {
        setSubmitError(res.error || "Failed to initialize secure payment gateway. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setSubmitError("Failed to initialize payment gateway.");
    } finally {
      setIsPreparingPayment(false);
    }
  };

  // Now only called AFTER Stripe Elements successfully authorizes the hold
  const handleFinalBookingSubmission = async (paymentIntentId: string) => {
    if (!selectedType || !selectedSlot) return;
    setSubmitError("");
    setIsPreparingPayment(true);
    
    // TRACK: Payment Authorized (Escrow lock succeeded)
    try {
      const vid = localStorage.getItem("vx_visitor_id");
      await fetch("/api/analytics/event", {
        method: "POST",
        body: JSON.stringify({
          eventName: "payment_authorized",
          consultantId: profile.id,
          sessionId: vid,
          specialization: selectedType?.title,
        }),
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) { /* ignore */ }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      const newBooking = await createBookingRequest({
        licenseNumber: profile.licenseNumber,
        consultationTypeId: selectedType.id,
        scheduledStart: selectedSlot.start.toISOString(),
        scheduledEnd: selectedSlot.end.toISOString(),
        userFirstName: formData.firstName,
        userLastName: formData.lastName,
        userEmail: formData.email,
        userPhone: formData.phone,
        country: formData.country,
        preferredLanguage: formData.preferredLanguage,
        serviceNeeded: formData.serviceNeeded,
        urgency: formData.urgency,
        preferredCommunicationMethod: formData.preferredCommunicationMethod,
        caseDescription: formData.caseDescription,
        stripePaymentIntentId: paymentIntentId, // <--- Attach the Escrow Hold ID
      });
      window.location.href = `/dashboard/client/bookings/${newBooking.id}/success`;
    } catch (e: any) {
      console.error(e);
      setSubmitError(e.message || "An unexpected error occurred finalizing your booking. Please contact support.");
      setIsSubmitting(false); // only re-enable if failed
    } 
  };

  if (step === 5) {
    return (
      <div className="bg-white rounded-3xl border border-[#e5e7eb] p-10 text-center shadow-xl shadow-black/5">
        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold font-serif mb-4 text-[#1A1F2B]">Your booking request has been sent</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto text-sm">
          The consultant will review your request shortly. 
          Upon confirmation, meeting details will be unlocked in your dashboard.
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <button onClick={() => window.location.href = '/dashboard/client/bookings'} className="bg-[#0F2A44] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-black transition-all">
            View My Bookings
          </button>
          <button onClick={() => window.location.href = `/consultant/${profile.slug}`} className="text-gray-500 hover:text-gray-900 font-semibold text-sm py-2">
            Return to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#e5e7eb] p-8 shadow-xl shadow-black/5 min-h-[600px] flex flex-col">
       
       {/* STEPPER UI */}
       <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4 hide-scrollbar">
         {steps.map((label, idx) => {
           const s = idx + 1;
           const isActive = s === step;
           const isPast = s < step;
           return (
             <div key={s} className="flex items-center">
               <div className="flex items-center gap-2">
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                   isActive ? "bg-[#0F2A44] text-white" : 
                   isPast ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                 }`}>
                   {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                 </div>
                 <span className={`text-xs font-bold uppercase tracking-wider ${
                   isActive ? "text-[#1A1F2B]" : isPast ? "text-green-600" : "text-gray-400"
                 }`}>{label}</span>
               </div>
               {s < 5 && (
                 <ChevronRight className="w-4 h-4 mx-2 text-gray-200" />
               )}
             </div>
           );
         })}
       </div>

       {/* STEP 1: TYPES */}
       {step === 1 && (
         <div className="grid grid-cols-1 gap-4 flex-1">
           {profile.consultationTypes.length === 0 ? (
             <p className="text-gray-400">No active consultation types.</p>
           ) : (
             profile.consultationTypes.map((type: any) => (
               <button 
                  key={type.id}
                  onClick={() => handleSelectType(type)}
                  className="text-left border border-gray-100 hover:border-[#2FA4A9] hover:bg-[#ffffff] transition-all rounded-2xl p-6 flex items-center justify-between group"
               >
                 <div>
                   <h3 className="font-bold text-[#1A1F2B] text-lg mb-1">{type.title}</h3>
                   <p className="text-sm text-gray-500 mb-4">{type.description}</p>
                   <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {type.durationMinutes} Min</span>
                      <span className="flex items-center gap-1">
                        {type.communicationType === 'VIDEO' && <Video className="w-3.5 h-3.5" />}
                        {type.communicationType === 'PHONE' && <Phone className="w-3.5 h-3.5" />}
                        {type.communicationType === 'IN_PERSON' && <Users className="w-3.5 h-3.5" />}
                        {type.communicationType}
                      </span>
                      <span className="text-[#2FA4A9] text-sm">${(type.priceCents / 100).toFixed(2)} CAD</span>
                   </div>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#2FA4A9] group-hover:text-white transition-colors shrink-0 ml-4">
                   <ArrowRight className="w-5 h-5" />
                 </div>
               </button>
             ))
           )}
         </div>
       )}

       {/* STEP 2: CALENDAR & TIME */}
       {step === 2 && (
         <div className="flex-1 flex flex-col h-full">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 border-b border-gray-100 pb-8 mb-4">
             <div>
               <h3 className="font-bold text-gray-500 text-sm mb-4 uppercase tracking-widest">Select Day</h3>
               <div className="grid grid-cols-3 gap-2">
                 {Array.from({ length: 14 }).map((_, i) => {
                   const d = addDays(startOfToday(), i);
                   const isSelected = selectedDate?.toDateString() === d.toDateString();
                   return (
                     <button 
                       key={i} 
                       onClick={() => handleSelectDate(d)}
                       className={`p-3 rounded-xl border text-center transition-all ${isSelected ? 'border-[#2FA4A9] bg-[#2FA4A9] text-white shadow-md' : 'border-gray-100 text-gray-600 hover:border-[#2FA4A9] hover:bg-[#ffffff]'}`}
                     >
                       <p className="text-[10px] font-bold uppercase mb-1 opacity-70">{format(d, 'EEE')}</p>
                       <p className="text-lg font-black">{format(d, 'd')}</p>
                       <p className="text-[10px] uppercase font-bold opacity-70">{format(d, 'MMM')}</p>
                     </button>
                   );
                 })}
               </div>
             </div>

             <div>
               <h3 className="font-bold text-gray-500 text-sm mb-4 uppercase tracking-widest flex items-center justify-between">
                 <span>Available Times</span>
                 <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600 flex items-center gap-1"><Globe className="w-3 h-3" /> Local Time</span>
               </h3>
               {!selectedDate ? (
                 <p className="text-gray-400 text-sm text-center py-10 bg-gray-50 border border-dashed rounded-2xl">Select a date to see times.</p>
               ) : isLoadingSlots ? (
                 <p className="text-gray-400 text-sm py-4 text-center">Checking availability...</p>
               ) : availableSlots.length === 0 ? (
                 <div className="bg-orange-50 rounded-xl p-6 text-center border border-orange-100">
                   <AlertCircle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                   <h4 className="font-bold text-orange-900 mb-1">No slots available</h4>
                   <p className="text-orange-600 text-xs">This date is fully booked or no availability is set. Please try another date.</p>
                 </div>
               ) : (
                 <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {availableSlots.map((slot, idx) => {
                      const isSelected = selectedSlot?.start.toISOString() === slot.start.toISOString();
                      return (
                        <button 
                          key={idx}
                          onClick={() => setSelectedSlot(slot)}
                          className={`w-full p-4 rounded-xl border text-center transition-all font-bold ${isSelected ? 'border-[#2FA4A9] text-[#2FA4A9] bg-[#ffffff] shadow-sm' : 'border-gray-200 text-gray-600 hover:border-[#2FA4A9] hover:text-[#2FA4A9]'}`}
                        >
                           {format(new Date(slot.start), 'hh:mm a')}
                        </button>
                      );
                   })}
                 </div>
               )}
             </div>
           </div>

           <div className="flex items-center justify-between pt-2">
             <button type="button" onClick={() => setStep(1)} className="text-sm font-bold text-gray-400 hover:text-gray-800">Back</button>
             {selectedSlot && (
               <button onClick={() => setStep(3)} className="bg-[#0F2A44] text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-black transition-all">
                 Continue to Details
               </button>
             )}
           </div>
         </div>
       )}

       {/* STEP 3: DETAILS (Intake Form) */}
       {step === 3 && (
         <form onSubmit={handleProceedToReview} className="flex-1 flex flex-col h-full">
           <div className="flex-1 overflow-y-auto pr-2 pb-6 space-y-6">
             {sessionUser && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between mb-4">
                   <div>
                     <p className="text-sm font-bold text-[#1A1F2B]">Booking as {sessionUser.name}</p>
                     <p className="text-xs text-gray-500">{sessionUser.email}</p>
                   </div>
                   <div title="Auto-filled from account">
                     <CheckCircle2 className="w-5 h-5 text-green-500 cursor-pointer" />
                   </div>
                </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               {!sessionUser && (
                 <>
                   <div className="space-y-2">
                     <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">First Name</label>
                     <input required type="text" value={formData.firstName} onChange={e => setFormData(p => ({...p, firstName: e.target.value}))} className="w-full bg-[#ffffff] border border-gray-200 px-4 py-3 rounded-xl text-sm focus:border-[#2FA4A9] outline-none" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Last Name</label>
                     <input required type="text" value={formData.lastName} onChange={e => setFormData(p => ({...p, lastName: e.target.value}))} className="w-full bg-[#ffffff] border border-gray-200 px-4 py-3 rounded-xl text-sm focus:border-[#2FA4A9] outline-none" />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                     <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                     <input required type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full bg-[#ffffff] border border-gray-200 px-4 py-3 rounded-xl text-sm focus:border-[#2FA4A9] outline-none" />
                   </div>
                 </>
               )}
               <div className="space-y-2">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Phone</label>
                 <input required type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full bg-[#ffffff] border border-gray-200 px-4 py-3 rounded-xl text-sm focus:border-[#2FA4A9] outline-none" />
               </div>
               <div className="space-y-2 relative z-50">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Country of Residence</label>
                 <CountrySelect 
                   value={formData.country} 
                   onChange={(val) => setFormData(p => ({...p, country: val}))} 
                   className="w-full bg-[#ffffff] border border-gray-200 px-4 py-3 rounded-xl text-sm focus:border-[#2FA4A9] outline-none"
                 />
               </div>
               
               <div className="space-y-2">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Service Needed</label>
                 <select required value={formData.serviceNeeded} onChange={e => setFormData(p => ({...p, serviceNeeded: e.target.value}))} className="w-full bg-[#ffffff] border border-gray-200 px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none">
                   <option value="" disabled>Select Goal</option>
                   <option>Express Entry</option>
                   <option>Study Permit</option>
                   <option>Work Permit</option>
                   <option>Family Sponsorship</option>
                   <option>Citizenship</option>
                   <option>General Inquiry</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Urgency</label>
                 <select required value={formData.urgency} onChange={e => setFormData(p => ({...p, urgency: e.target.value}))} className="w-full bg-[#ffffff] border border-gray-200 px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none">
                   <option>Standard / No rush</option>
                   <option>Soon (Next 3 months)</option>
                   <option>Urgent (Deadline approaching)</option>
                 </select>
               </div>
               <div className="space-y-2 md:col-span-2">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Brief Case Description</label>
                 <textarea required rows={3} placeholder="Tell us briefly about your situation..." value={formData.caseDescription} onChange={e => setFormData(p => ({...p, caseDescription: e.target.value}))} className="w-full bg-[#ffffff] border border-gray-200 px-4 py-3 rounded-xl text-sm focus:border-[#2FA4A9] outline-none resize-none"></textarea>
               </div>
             </div>
           </div>

           <div className="flex items-center justify-between pt-6 border-t border-gray-100 shrink-0">
             <button type="button" onClick={() => setStep(2)} className="text-sm font-bold text-gray-400 hover:text-gray-800">Back</button>
             <button type="submit" className="bg-[#0F2A44] text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-black transition-all">
               Review Booking
             </button>
           </div>
         </form>
       )}

       {/* STEP 4: REVIEW */}
       {step === 4 && (
         <div className="flex-1 flex flex-col h-full">
           <div className="flex-1 overflow-y-auto mb-6">
             <div className="bg-[#F8F9FA] border border-gray-200 rounded-2xl p-6 mb-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Meeting Summary</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-500">Consultant</span>
                    <span className="text-sm font-bold text-gray-900 text-right">{profile.fullName}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-500">Session Type</span>
                    <span className="text-sm font-bold text-gray-900 text-right">{selectedType?.title} <br/><span className="text-xs text-gray-400 font-normal">{selectedType?.durationMinutes} minutes • {selectedType?.communicationType}</span></span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-500">Date & Time</span>
                    <span className="text-sm font-bold text-gray-900 text-right">{selectedSlot && format(selectedSlot.start, "EEEE, MMMM d, yyyy")}<br/><span className="text-[#2FA4A9]">{selectedSlot && format(selectedSlot.start, "hh:mm a")}</span></span>
                  </div>
                  <div className="flex justify-between items-start border-t border-gray-200 pt-4 mt-2">
                    <span className="text-sm font-bold text-gray-900">Total Price</span>
                    <span className="text-lg font-black text-[#1A1F2B]">${selectedType ? (selectedType.priceCents / 100).toFixed(2) : "0.00"} CAD</span>
                  </div>
                </div>
             </div>

             <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Your Details</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Name</p>
                    <p className="font-semibold text-gray-900">{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Contact</p>
                    <p className="font-semibold text-gray-900 truncate">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Country</p>
                    <p className="font-semibold text-gray-900">{formData.country}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Goal</p>
                    <p className="font-semibold text-gray-900">{formData.serviceNeeded}</p>
                  </div>
                </div>
             </div>

             <div className="mt-6 flex items-start gap-3 text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-200">
               <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
               <p>By submitting this request, you agree to Verixa's terms of service and the consultant's cancellation policy. Meeting details will be provided upon confirmation.</p>
             </div>

             <div className="mt-8 border-t border-gray-100 pt-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Secure Payment Authorization</h4>
                {isPreparingPayment ? (
                  <div className="p-10 border border-gray-100 rounded-2xl flex items-center justify-center bg-gray-50">
                    <div className="w-6 h-6 border-2 border-[#0F2A44] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat' } }}>
                    <StripePaymentForm priceCents={selectedType?.priceCents || 0} onSuccess={handleFinalBookingSubmission} />
                  </Elements>
                ) : (
                  <div className="p-6 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
                    Failed to connect to gateway. Please go back and try again.
                  </div>
                )}
             </div>

             {submitError && (
               <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm flex items-start gap-2 font-medium">
                 <AlertCircle className="w-5 h-5 shrink-0" />
                 {submitError}
               </div>
             )}
           </div>

           <div className="flex items-center justify-between pt-6 border-t border-gray-100 shrink-0">
             <button type="button" onClick={() => setStep(3)} disabled={isSubmitting || isPreparingPayment} className="text-sm font-bold text-gray-400 hover:text-gray-800 disabled:opacity-50">Back to Details</button>
             {/* Note: The submission button is now safely handled natively inside the StripePaymentForm component above */}
           </div>
         </div>
       )}

    </div>
  );
}
