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
    role: "CLIENT"
  });

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        name: userToEdit.name || "",
        email: userToEdit.email || "",
        password: "", // Never pre-fill password
        role: userToEdit.role || "CLIENT"
      });
    } else {
      setFormData({ name: "", email: "", password: "", role: "CLIENT" });
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
