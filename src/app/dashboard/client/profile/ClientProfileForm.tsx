"use client";

import { useState } from "react";
import { updateClientProfile } from "@/actions/clientProfile.actions";
import { Loader2, ShieldCheck } from "lucide-react";

export default function ClientProfileForm({ initialData }: { initialData: any }) {
  const [formData, setFormData] = useState({
    nationality: initialData?.nationality || "",
    languages: initialData?.languages || "",
    currentCountry: initialData?.currentCountry || "",
    immigrationGoals: initialData?.immigrationGoals || "",
    educationLevel: initialData?.educationLevel || "",
    maritalStatus: initialData?.maritalStatus || "",
    age: initialData?.age || "",
    shareWithConsultant: initialData?.shareWithConsultant ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    setError("");

    try {
      await updateClientProfile({
        ...formData,
        age: formData.age ? Number(formData.age) : undefined,
      });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setError(e.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
       
       {error && <p className="text-sm font-bold text-red-500 bg-red-50 p-4 rounded-xl">{error}</p>}
       {success && <p className="text-sm font-bold text-green-700 bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Profile updated successfully! Your matches have been refreshed.</p>}

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Nationality */}
         <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nationality / Citizenship</label>
           <input 
             type="text" 
             placeholder="e.g. Iran, India, Brazil"
             value={formData.nationality} 
             onChange={e => handleUpdate("nationality", e.target.value)} 
             className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none transition-colors placeholder:text-gray-300" 
           />
         </div>

         {/* Current Country */}
         <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Current Country of Residence</label>
           <input 
             type="text" 
             placeholder="e.g. UAE, Canada, Germany"
             value={formData.currentCountry} 
             onChange={e => handleUpdate("currentCountry", e.target.value)} 
             className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none transition-colors placeholder:text-gray-300" 
           />
         </div>

         {/* Languages */}
         <div className="space-y-2 md:col-span-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Spoken Languages</label>
           <input 
             type="text" 
             placeholder="e.g. English, Persian, French"
             value={formData.languages} 
             onChange={e => handleUpdate("languages", e.target.value)} 
             className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none transition-colors placeholder:text-gray-300" 
           />
           <p className="text-[11px] text-gray-400 font-medium">We occasionally use this to recommend consultants who speak your language natively.</p>
         </div>

         {/* Immigration Goals */}
         <div className="space-y-2 md:col-span-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Primary Immigration Goals</label>
           <select 
             value={formData.immigrationGoals} 
             onChange={e => handleUpdate("immigrationGoals", e.target.value)} 
             className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none transition-colors text-[#1A1F2B]" 
           >
             <option value="">Select a goal...</option>
             <option value="Express Entry">Express Entry / PR</option>
             <option value="Study Permit">Study Permit</option>
             <option value="Work Permit">Work Permit</option>
             <option value="Family Sponsorship">Family Sponsorship</option>
             <option value="Business / Investor">Business / Startup Visa</option>
             <option value="Visitor Visa">Visitor Visa / Tourist</option>
             <option value="Citizenship">Citizenship Application</option>
             <option value="Refugee / Asylum">Refugee / Asylum</option>
             <option value="Other">Other</option>
           </select>
         </div>

         {/* Education */}
         <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Highest Education Level</label>
           <select 
             value={formData.educationLevel} 
             onChange={e => handleUpdate("educationLevel", e.target.value)} 
             className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none transition-colors text-[#1A1F2B]" 
           >
             <option value="">Select level...</option>
             <option value="High School">High School</option>
             <option value="Diploma / Certificate">Diploma / Certificate</option>
             <option value="Bachelor's Degree">Bachelor's Degree</option>
             <option value="Master's Degree">Master's Degree</option>
             <option value="PhD / Doctorate">PhD / Doctorate</option>
           </select>
         </div>

         {/* Marital Status & Age */}
         <div className="grid grid-cols-2 gap-4 space-y-0">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Marital Status</label>
              <select 
                value={formData.maritalStatus} 
                onChange={e => handleUpdate("maritalStatus", e.target.value)} 
                className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none transition-colors text-[#1A1F2B]" 
              >
                <option value="">Select...</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Age</label>
              <input 
                type="number" 
                placeholder="e.g. 28"
                value={formData.age} 
                onChange={e => handleUpdate("age", e.target.value)} 
                className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none transition-colors placeholder:text-gray-300" 
              />
            </div>
         </div>
       </div>

       {/* Sharing Toggle */}
       <div className="pt-6 border-t border-[#e5e7eb]">
          <div className="flex items-start gap-4 p-5 bg-[#ffffff] rounded-2xl border border-gray-100">
             <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
               <input 
                 type="checkbox" 
                 className="sr-only peer" 
                 checked={formData.shareWithConsultant} 
                 onChange={(e) => handleUpdate("shareWithConsultant", e.target.checked)} 
               />
               <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2FA4A9]"></div>
             </label>
             <div>
               <h4 className="font-bold text-[#1A1F2B] text-sm">Share Profile with Consultants</h4>
               <p className="text-sm text-gray-500 mt-1">
                 When enabled, any consultant you book a session with will automatically receive this profile a few hours before the meeting. This helps them prepare and skips the basic questions so you get more value out of your paid time.
               </p>
             </div>
          </div>
       </div>

       <div className="pt-4 flex justify-end">
         <button 
           type="submit" 
           disabled={isSubmitting}
           className="bg-[#0F2A44] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-black/5 flex items-center gap-2 disabled:opacity-50"
         >
           {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
           {isSubmitting ? "Saving Profile..." : "Save Immigration Profile"}
         </button>
       </div>
    </form>
  );
}
