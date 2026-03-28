"use client";

import { useState, useEffect } from "react";
import { User, Mail, Shield, Lock, X, Save, KeyRound } from "lucide-react";
import { createUser, updateUser } from "@/actions/users.actions";

export default function UserModal({ 
  isOpen, 
  onClose, 
  userToEdit = null, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  userToEdit?: any; 
  onSuccess: () => void; 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "CLIENT",
    notifyUser: true
  });

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        name: userToEdit.name || "",
        email: userToEdit.email || "",
        password: "", // Never pre-fill password
        role: userToEdit.role || "CLIENT",
        notifyUser: false // Unchecked by default when editing
      });
    } else {
      setFormData({ name: "", email: "", password: "", role: "CLIENT", notifyUser: true });
    }
    setError("");
  }, [userToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      if (userToEdit) {
        // Edit mode
        await updateUser(userToEdit.id, formData);
      } else {
        // Create mode
        if (!formData.password) throw new Error("A temporary password is required for new users.");
        await createUser(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save user data.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0F2A44] border border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-serif font-black text-white">
            {userToEdit ? "Edit User Record" : "Provision New User"}
          </h2>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            {userToEdit ? "Modify credentials or change access level." : "Grant explicit access manually by generating an account."}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Jane Doe"
                className="w-full bg-black/20 border border-gray-700 pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none focus:border-[#2FA4A9] transition-colors"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="jane@example.com"
                className="w-full bg-black/20 border border-gray-700 pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none focus:border-[#2FA4A9] transition-colors"
              />
            </div>
          </div>

          {/* Role Field */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Authorization Level</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2FA4A9]" />
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full bg-[#16385A] border border-[#2FA4A9]/30 pl-10 pr-4 py-3 rounded-xl text-[#2FA4A9] font-bold focus:outline-none focus:border-[#2FA4A9] transition-colors appearance-none"
              >
                <option value="CLIENT">Client (Standard User)</option>
                <option value="CONSULTANT">Consultant (RCIC)</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span>{userToEdit ? "New Password (Optional)" : "Temporary Password"}</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type={userToEdit ? "text" : "password"} // Show text to admin if editing, maybe? Better to keep as password. Let's use text for admin copying.
                placeholder={userToEdit ? "Leave blank to keep unchanged" : "e.g. Temp123!"}
                required={!userToEdit}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-black/20 border border-gray-700 pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none focus:border-[#2FA4A9] transition-colors"
              />
              <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 cursor-pointer hover:text-white" onClick={() => setFormData({...formData, password: Math.random().toString(36).slice(-8) + "X!"})} />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-black/20 border border-gray-800 hover:border-gray-700 transition-colors mt-2">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={formData.notifyUser}
                onChange={(e) => setFormData({ ...formData, notifyUser: e.target.checked })}
                className="peer shrink-0 appearance-none w-5 h-5 border-2 border-gray-600 rounded checked:bg-[#2FA4A9] checked:border-[#2FA4A9] focus:outline-none transition-colors"
              />
              <svg 
                className="absolute w-3 h-3 left-1 flex-shrink-0 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="flex flex-col">
               <span className="text-white text-sm font-bold">
                 {userToEdit ? "Send Modification Notice" : "Send Welcome Invitation"}
               </span>
               <span className="text-gray-500 text-[10px]">
                 {userToEdit ? "Notifies user of their updated access level via email." : "Emails credentials securely to the user."}
               </span>
            </div>
          </label>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-white text-[#0F2A44] font-black uppercase text-xs py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all disabled:opacity-50"
          >
            {loading ? "Processing..." : (
               <><Save className="w-4 h-4" /> {userToEdit ? "Update Access Record" : "Provision Profile"}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
