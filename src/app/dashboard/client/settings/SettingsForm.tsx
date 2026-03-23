"use client";

import { useState } from "react";
import { updateProfileSettings } from "@/actions/settings.actions";

export default function SettingsForm({ user }: { user: { name: string; email: string } }) {
  const [formData, setFormData] = useState(user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    setError("");

    try {
      await updateProfileSettings(formData);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
         <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
           <input 
             required 
             type="text" 
             value={formData.name} 
             onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
             className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3.5 rounded-xl text-sm focus:border-[#C29967] outline-none transition-colors" 
           />
         </div>
         <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
           <input 
             required 
             type="email" 
             value={formData.email} 
             onChange={e => setFormData(p => ({...p, email: e.target.value}))} 
             className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3.5 rounded-xl text-sm focus:border-[#C29967] outline-none transition-colors" 
           />
           <p className="text-[10px] text-gray-400 font-medium">Changing your email may require you to log in again.</p>
         </div>
       </div>

       {error && <p className="text-sm font-bold text-red-500 bg-red-50 p-3 rounded-xl">{error}</p>}
       {success && <p className="text-sm font-bold text-green-600 bg-green-50 p-3 rounded-xl">Profile updated successfully!</p>}

       <div className="pt-4 flex justify-end">
         <button 
           type="submit" 
           disabled={isSubmitting}
           className="bg-[#1A1A1A] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-black/5 disabled:opacity-50"
         >
           {isSubmitting ? "Saving..." : "Save Changes"}
         </button>
       </div>
    </form>
  );
}
