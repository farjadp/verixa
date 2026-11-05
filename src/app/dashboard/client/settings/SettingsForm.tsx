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
      const res = await updateProfileSettings({ name: formData.name });
      if (!res.success) {
        setError(res.error);
        return;
      }
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
             className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3.5 rounded-xl text-sm focus:border-[#2FA4A9] outline-none transition-colors" 
           />
         </div>
         <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
           <input 
             type="email" 
             value={formData.email} 
             readOnly
             aria-describedby="email-help"
             className="w-full bg-mist border border-[#e5e7eb] px-4 py-3.5 rounded-xl text-sm text-gray-500 outline-none cursor-not-allowed" 
           />
           <p id="email-help" className="text-xs text-gray-500">To change your email, contact support so we can verify the new address.</p>
         </div>
       </div>

       {error && <p className="text-sm font-bold text-red-500 bg-red-50 p-3 rounded-xl">{error}</p>}
       {success && <p className="text-sm font-bold text-green-600 bg-green-50 p-3 rounded-xl">Profile updated successfully!</p>}

       <div className="pt-4 flex justify-end">
         <button 
           type="submit" 
           disabled={isSubmitting}
           className="bg-[#0F2A44] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-black/5 disabled:opacity-50"
         >
           {isSubmitting ? "Saving..." : "Save Changes"}
         </button>
       </div>
    </form>
  );
}
