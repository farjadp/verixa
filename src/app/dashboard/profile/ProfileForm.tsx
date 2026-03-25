"use client";

import { useState } from "react";
import { Lock, UploadCloud, Save, X, CheckCircle } from "lucide-react";
import { updateConsultantProfile } from "@/actions/consultant.actions";
import { uploadConsultantImageAction } from "@/actions/upload.actions";
import { useRouter } from "next/navigation";

export default function ProfileForm({ profile, unlimitedMessengers }: { profile: any; unlimitedMessengers: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  // Customization fields
  const [avatarImage, setAvatarImage] = useState(profile?.avatarImage || "");
  const [coverImage, setCoverImage] = useState(profile?.coverImage || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [languages, setLanguages] = useState(profile?.languages || "");
  
  const [messengers, setMessengers] = useState<{ type: string; value: string }[]>(
    Array.isArray(profile?.messengers) ? profile.messengers : []
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("image", file);
      const url = await uploadConsultantImageAction(formData);
      if (type === 'avatar') setAvatarImage(url);
      else setCoverImage(url);
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    }
  };

  const addMessenger = () => {
    if (!unlimitedMessengers && messengers.length >= 1) {
      alert("Your current plan only allows 1 messaging app. Upgrade to PRO to add more.");
      return;
    }
    setMessengers([...messengers, { type: "WhatsApp", value: "" }]);
  };

  const removeMessenger = (index: number) => {
    setMessengers(messengers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConsultantProfile({
        avatarImage,
        coverImage,
        website,
        languages,
        messengers
      });
      alert("Profile Saved Successfully!");
      router.refresh();
    } catch (err) {
      alert("Error saving: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-8 pb-16">
      
      {/* SECTION: BASIC INFO (LOCKED) */}
      <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#F5F7FA] text-[#2FA4A9] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-bl-xl flex items-center gap-1.5 border-b border-l border-[#e5e7eb]">
            <Lock className="w-3 h-3" /> Synced from Official Registry
          </div>
          
          <h2 className="text-lg font-bold text-[#1A1F2B] mb-5">Official Data</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Full Name</label>
              <input type="text" value={profile?.fullName || ""} readOnly className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-gray-600 font-medium cursor-not-allowed outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">RCIC License</label>
              <input type="text" value={profile?.licenseNumber || ""} readOnly className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-gray-600 font-medium cursor-not-allowed outline-none" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">Official data cannot be changed directly here to maintain platform integrity. If this is incorrect, contact Verixa Support.</p>
      </div>

      {/* SECTION: MARKETING INFO (EDITABLE) */}
      <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1F2B] mb-5">Public Profile Data</h2>
          
          <div className="space-y-6">
            {/* COVER IMAGE */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#1A1F2B] block mb-3">Profile Cover / Banner</label>
              {coverImage ? (
                <div className="h-40 w-full rounded-2xl bg-gray-100 overflow-hidden relative mb-3 border border-[#e5e7eb]">
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setCoverImage("")} className="absolute top-2 right-2 bg-white/90 p-2 rounded-lg hover:bg-red-50 hover:text-red-500 shadow-sm transition-all"><X className="w-4 h-4" /></button>
                </div>
              ) : null}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <button type="button" className="bg-[#F5F7FA] border border-[#e5e7eb] text-[#1A1F2B] text-sm font-bold px-4 py-2 rounded-lg cursor-pointer hover:border-[#2FA4A9] hover:bg-white transition-all flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-gray-400" /> Upload Cover Image
                  </button>
                </div>
                <p className="text-xs text-gray-400">Recommended: 1200x400px. High quality banner for your profile header.</p>
              </div>
            </div>

            {/* AVATAR IMAGE */}
            <div className="pt-4 border-t border-[#e5e7eb]">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1A1F2B] block mb-3">Professional Headshot</label>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden relative group">
                   {avatarImage ? <img src={avatarImage} className="w-full h-full object-cover" alt="Avatar"/> : <UploadCloud className="w-8 h-8 group-hover:text-[#2FA4A9] transition-colors" />}
                   <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div>
                  <div className="relative inline-block">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <button type="button" className="bg-[#ffffff] border border-[#e5e7eb] text-[#1A1F2B] text-sm font-bold px-4 py-2 rounded-lg cursor-pointer hover:border-[#2FA4A9] transition-all">Upload Photo</button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Recommended: 400x400px, Professional headshot. Profiles with photos get 7x more clicks.</p>
                </div>
              </div>
            </div>

            {/* WEBSITE */}
            <div className="space-y-2 pt-4 border-t border-[#e5e7eb]">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1A1F2B]">Website URL</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3 rounded-xl text-[#1A1F2B] text-sm focus:border-[#2FA4A9]/50 focus:ring-4 focus:ring-[#2FA4A9]/10 outline-none transition-all" />
            </div>

            {/* MESSENGERS */}
            <div className="pt-6 mt-6 border-t border-[#e5e7eb]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1F2B]">Direct Messengers</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Allow clients to contact you directly. {unlimitedMessengers ? "You have unlimited access." : "Standard plan limited to 1 app."}
                  </p>
                </div>
                <button type="button" onClick={addMessenger} className="text-xs font-bold text-[#2FA4A9] hover:bg-[#F5F7FA] px-3 py-1.5 rounded-lg transition-colors flex items-center border border-transparent hover:border-[#e5e7eb]">
                  + Add Messenger
                </button>
              </div>
              
              <div className="space-y-3">
                {messengers.map((msg, index) => (
                  <div key={index} className="flex items-center gap-2 sm:gap-3">
                    <select 
                      value={msg.type} 
                      onChange={(e) => {
                        const newMsg = [...messengers];
                        newMsg[index].type = e.target.value;
                        setMessengers(newMsg);
                      }}
                      className="bg-[#F5F7FA] border border-[#e5e7eb] text-[#1A1F2B] text-sm font-bold px-3 sm:px-4 py-3 rounded-xl focus:border-[#2FA4A9] outline-none max-w-[120px] sm:max-w-none"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telegram">Telegram</option>
                      <option value="Viber">Viber</option>
                      <option value="Line">Line</option>
                      <option value="WeChat">WeChat</option>
                    </select>
                    <input 
                      type="text" 
                      value={msg.value} 
                      onChange={(e) => {
                        const newMsg = [...messengers];
                        newMsg[index].value = e.target.value;
                        setMessengers(newMsg);
                      }}
                      placeholder="Number or Username (e.g. +123456789 or @username)" 
                      className="flex-1 bg-[#ffffff] border border-[#e5e7eb] px-3 sm:px-4 py-3 rounded-xl text-[#1A1F2B] text-sm focus:border-[#2FA4A9] outline-none transition-all" 
                    />
                    <button type="button" onClick={() => removeMessenger(index)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" aria-label="Remove">×</button>
                  </div>
                ))}
                
                {messengers.length === 0 && (
                  <div className="text-sm text-gray-400 italic p-4 text-center border border-dashed border-gray-200 rounded-xl">
                    No messaging apps added yet.
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* SECTION: COMPANY ENRICHMENT SNAPSHOT */}
      {profile?.companyEnrichments?.filter((e: any) => e.matchStatus === 'matched').map((enrichment: any) => (
        <div key={enrichment.id} className="bg-gradient-to-br from-[#0F2A44] to-[#1A3A5A] rounded-3xl border border-[#e5e7eb] p-6 shadow-sm relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-bl-xl flex items-center gap-1.5 border-b border-l border-white/10">
            <CheckCircle className="w-3 h-3 text-green-400" /> Verified Record
          </div>
          
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">Official Business Registration Snapshot</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1">Legal Name</label>
              <div className="font-semibold">{enrichment.matchedLegalName}</div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1">Jurisdiction</label>
              <div className="font-semibold">{enrichment.jurisdiction}</div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1">Registry Number</label>
              <div className="font-semibold">{enrichment.registryNumber}</div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1">Incorporated On</label>
              <div className="font-semibold">{enrichment.incorporationDate ? new Date(enrichment.incorporationDate).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1">Registered Address</label>
              <div className="font-semibold">{enrichment.registeredAddress || 'N/A'}</div>
            </div>
            <div className="md:col-span-2 mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
               <div>Source: {enrichment.registrySource === 'federal_api' ? 'Federal Corporation API' : 'Canada Business Registries (MRAS)'}</div>
               <div>Last Checked: {new Date(enrichment.lastCheckedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      ))}

      {/* SECTION: LANGUAGES */}
      <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1F2B] mb-5">Practice Details</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1A1F2B]">Spoken Languages</label>
              <input 
                type="text" 
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="Comma separated languages (e.g. English, Persian, Turkish)" 
                className="w-full bg-[#ffffff] border border-[#e5e7eb] px-4 py-3 rounded-xl text-[#1A1F2B] text-sm focus:border-[#2FA4A9]/50 focus:ring-4 focus:ring-[#2FA4A9]/10 outline-none transition-all" 
              />
              <p className="text-xs text-gray-400 mt-2">Separate languages with commas.</p>
            </div>
          </div>
      </div>

      {/* SAVE CTA */}
      <div className="flex justify-end sticky bottom-6 z-20 pt-4">
        <button 
          type="button" 
          onClick={handleSave}
          disabled={saving}
          className="bg-[#0F2A44] disabled:bg-gray-400 text-white px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-black/10 hover:bg-black transition-all flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Profile Changes"}
        </button>
      </div>

    </form>
  );
}
