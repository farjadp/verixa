"use client";

import { useState } from "react";
import { changePassword } from "@/actions/settings.actions";

export default function PasswordForm() {
  const [formData, setFormData] = useState({ current: "", newPass: "", confirm: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    setError("");

    if (formData.newPass !== formData.confirm) {
      setError("New passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      await changePassword({ current: formData.current, newPass: formData.newPass });
      setSuccess(true);
      setFormData({ current: "", newPass: "", confirm: "" });
    } catch (e: any) {
      setError(e.message || "Failed to change password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
       <div className="space-y-2 max-w-md">
         <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Current Password</label>
         <input 
           required 
           type="password" 
           value={formData.current} 
           onChange={e => setFormData(p => ({...p, current: e.target.value}))} 
           className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3.5 rounded-xl text-sm focus:border-[#C29967] outline-none transition-colors" 
         />
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
         <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">New Password</label>
           <input 
             required 
             type="password" 
             value={formData.newPass} 
             onChange={e => setFormData(p => ({...p, newPass: e.target.value}))} 
             className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3.5 rounded-xl text-sm focus:border-[#C29967] outline-none transition-colors" 
           />
         </div>
         <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Confirm New Password</label>
           <input 
             required 
             type="password" 
             value={formData.confirm} 
             onChange={e => setFormData(p => ({...p, confirm: e.target.value}))} 
             className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3.5 rounded-xl text-sm focus:border-[#C29967] outline-none transition-colors" 
           />
         </div>
       </div>

       {error && <p className="text-sm font-bold text-red-500 bg-red-50 p-3 rounded-xl">{error}</p>}
       {success && <p className="text-sm font-bold text-green-600 bg-green-50 p-3 rounded-xl">Password updated successfully!</p>}

       <div className="pt-4 flex justify-end">
         <button 
           type="submit" 
           disabled={isSubmitting}
           className="bg-white border text-gray-700 border-gray-200 px-8 py-3 rounded-xl font-bold hover:bg-gray-50 hover:border-[#C29967] hover:text-[#C29967] transition-all shadow-sm disabled:opacity-50"
         >
           {isSubmitting ? "Updating..." : "Update Password"}
         </button>
       </div>
    </form>
  );
}
