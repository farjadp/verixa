"use client";

import { useState, useTransition } from "react";
import { updateBookingSettings } from "@/actions/booking.actions";
import { Save, Video, Phone, Users, CalendarDays, Link 
} from "lucide-react";

export default function BookingSettingsForm({ initialData }: { initialData: any }) {
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const [formData, setFormData] = useState({
    bufferMinutes: initialData?.bufferMinutes || 15,
    minimumNoticeHours: initialData?.minimumNoticeHours || 24,
    autoConfirm: initialData?.autoConfirm || false,
    defaultMeetingMethod: initialData?.defaultMeetingMethod || "VIDEO",
    defaultMeetingProvider: initialData?.defaultMeetingProvider || "MANUAL",
    defaultMeetingLink: initialData?.defaultMeetingLink || "",
    defaultMeetingInstructions: initialData?.defaultMeetingInstructions || ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const checked = type === "checkbox" ? e.target.checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleProviderSelect = (provider: string) => {
    if (provider !== "MANUAL") return; // Others are disabled
    setFormData(prev => ({ ...prev, defaultMeetingProvider: provider }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");

    startTransition(async () => {
      try {
        await updateBookingSettings({
          ...formData,
          bufferMinutes: Number(formData.bufferMinutes),
          minimumNoticeHours: Number(formData.minimumNoticeHours)
        });
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch (error) {
        console.error("Failed to save booking settings", error);
        setSaveStatus("error");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* SECTION: MEETING SETUP (PHASE 22) */}
      <div className="bg-white rounded-3xl border border-[#f5ecd8] p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold font-serif text-[#1A1A1A]">Meeting Delivery</h2>
          <p className="text-sm text-gray-500 mt-1">Configure how your consultations are generated and delivered.</p>
        </div>

        <div className="space-y-8">
          
          {/* Default Method */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Default Meeting Method</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "VIDEO", icon: Video, label: "Video Call" },
                { id: "PHONE", icon: Phone, label: "Phone Call" },
                { id: "IN_PERSON", icon: Users, label: "In Person" }
              ].map(method => (
                <label 
                  key={method.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.defaultMeetingMethod === method.id ? 'border-[#C29967] bg-[#F6F3F0]' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <input 
                    type="radio" 
                    name="defaultMeetingMethod" 
                    value={method.id} 
                    checked={formData.defaultMeetingMethod === method.id}
                    onChange={handleChange}
                    className="hidden" 
                  />
                  <method.icon className={`w-5 h-5 ${formData.defaultMeetingMethod === method.id ? 'text-[#C29967]' : 'text-gray-400'}`} />
                  <span className={`font-bold text-sm ${formData.defaultMeetingMethod === method.id ? 'text-[#1A1A1A]' : 'text-gray-600'}`}>{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery Option / Provider */}
          <div className="space-y-3 pt-6 border-t border-[#f5ecd8]">
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Meeting Delivery Option</label>
              <span className="text-xs font-bold text-[#C29967] bg-[#F6F3F0] px-2 py-0.5 rounded-md">Multi-Provider Ready</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Manual */}
               <div 
                 onClick={() => handleProviderSelect("MANUAL")}
                 className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.defaultMeetingProvider === "MANUAL" ? 'border-[#1A1A1A] bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
               >
                 <div className="flex items-center gap-3 mb-2">
                   <div className={`w-4 h-4 rounded-full border-4 ${formData.defaultMeetingProvider === "MANUAL" ? 'border-[#1A1A1A]' : 'border-gray-300'}`} />
                   <h3 className="font-bold text-[#1A1A1A]">Manual link or instructions</h3>
                 </div>
                 <p className="text-sm text-gray-500 pl-7">You will provide a link or instructions manually when you accept a booking.</p>
               </div>

               {/* Google Calendar (Disabled) */}
               <div className="p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-white opacity-60 cursor-not-allowed">
                 <div className="flex items-center gap-3 mb-2 justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                     <h3 className="font-bold text-gray-500">Google Calendar integration</h3>
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-2 py-1 rounded-md">Coming Soon</span>
                 </div>
                 <p className="text-sm text-gray-400 pl-7">Auto-generate Meet links and sync availability.</p>
               </div>
               
               {/* Zoom Integration (Disabled) */}
               <div className="p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-white opacity-60 cursor-not-allowed">
                 <div className="flex items-center gap-3 mb-2 justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                     <h3 className="font-bold text-gray-500">Zoom integration</h3>
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-2 py-1 rounded-md">Coming Soon</span>
                 </div>
                 <p className="text-sm text-gray-400 pl-7">Natively create Zoom meetings across organizations.</p>
               </div>
            </div>
          </div>

          {/* Manual Link Details (only show if MANUAL is selected) */}
          {formData.defaultMeetingProvider === "MANUAL" && (
            <div className="pt-6 border-t border-[#f5ecd8] space-y-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] block">Default Meeting Link <span className="text-gray-400 font-normal lowercase">(Optional)</span></label>
                 <div className="relative">
                   <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                   <input 
                     type="url" 
                     name="defaultMeetingLink"
                     value={formData.defaultMeetingLink}
                     onChange={handleChange}
                     placeholder="https://zoom.us/my/personalroom" 
                     className="w-full bg-[#FDFCFB] border border-[#f5ecd8] pl-11 pr-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967] outline-none transition-all" 
                   />
                 </div>
                 <p className="text-xs text-gray-500">This link will auto-fill when you confirm requests.</p>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Default Instructions <span className="text-gray-400 font-normal lowercase">(Optional)</span></label>
                 <textarea 
                   rows={3} 
                   name="defaultMeetingInstructions"
                   value={formData.defaultMeetingInstructions}
                   onChange={handleChange}
                   placeholder="e.g. Please join 5 minutes early. If the room is locked, I am finishing a previous session." 
                   className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967] outline-none transition-all resize-none"
                 ></textarea>
                 <p className="text-xs text-gray-500">Standard instructions appended to your manual meeting links or phone calls.</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: SCHEDULING RULES */}
      <div className="bg-white rounded-3xl border border-[#f5ecd8] p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
           <div>
             <h2 className="text-xl font-bold font-serif text-[#1A1A1A]">Scheduling Rules</h2>
             <p className="text-sm text-gray-500 mt-1">Control your buffer times and booking conditions.</p>
           </div>
           <CalendarDays className="w-8 h-8 text-gray-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
             <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Minimum Notice (Hours)</label>
             <input 
               type="number" 
               name="minimumNoticeHours"
               value={formData.minimumNoticeHours}
               onChange={handleChange}
               className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967] outline-none" 
             />
           </div>
           
           <div className="space-y-2">
             <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Buffer Between Sessions (Mins)</label>
             <input 
               type="number" 
               name="bufferMinutes"
               value={formData.bufferMinutes}
               onChange={handleChange}
               className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967] outline-none" 
             />
           </div>
        </div>
      </div>

      {/* SAVE CTA */}
      <div className="flex justify-end sticky bottom-6 z-20">
        <button 
          type="submit" 
          disabled={isPending || saveStatus === "saving"}
          className="bg-[#1A1A1A] text-white px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-black/10 hover:bg-black transition-all flex items-center gap-2 disabled:opacity-70"
        >
          <Save className="w-5 h-5" /> 
          {saveStatus === "saving" ? "Saving..." : saveStatus === "success" ? "Settings Saved!" : "Save Meeting Setup"}
        </button>
      </div>

      {saveStatus === "error" && (
        <div className="text-red-500 text-sm font-bold text-right mt-2">
          Failed to save settings. Please try again.
        </div>
      )}

    </form>
  );
}
