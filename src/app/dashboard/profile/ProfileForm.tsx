"use client";

import { useState } from "react";
import { Lock, UploadCloud, Save, X, CheckCircle, Info, Shield, ThumbsUp, AlertTriangle, Check } from "lucide-react";
import { updateConsultantProfile } from "@/actions/consultant.actions";
import { consultantVerifyEnrichment } from "@/actions/enrichment.actions";
import { uploadConsultantImageAction } from "@/actions/upload.actions";
import { useRouter } from "next/navigation";
import { BioEditor } from "@/components/ui/BioEditor";

const ALL_LANGUAGES = [
  "English", "French", "Persian (Farsi)", "Spanish", "Arabic", "Mandarin",
  "Cantonese", "Hindi", "Punjabi", "Urdu", "Tagalog", "Korean", "Japanese",
  "Portuguese", "Russian", "Polish", "Ukrainian", "Turkish", "Vietnamese",
  "Bengali", "Gujarati", "Tamil", "Telugu", "Sinhala", "Nepali", "Somali",
  "Amharic", "Romanian", "Hungarian", "Italian", "German", "Dutch",
  "Greek", "Hebrew", "Swahili", "Indonesian", "Malay", "Thai",
];

const IMMIGRATION_PATHS = [
  { category: "Express Entry", items: [
    { key: "fswp", label: "Federal Skilled Worker Program (FSWP)" },
    { key: "cec", label: "Canadian Experience Class (CEC)" },
    { key: "fstp", label: "Federal Skilled Trades Program (FSTP)" },
    { key: "ee_healthcare", label: "Category-Based: Healthcare" },
    { key: "ee_stem", label: "Category-Based: STEM" },
    { key: "ee_trades", label: "Category-Based: Trades" },
    { key: "ee_transport", label: "Category-Based: Transport" },
    { key: "ee_agri", label: "Category-Based: Agriculture & Agri-food" },
    { key: "ee_french", label: "Category-Based: French-Language Proficiency" },
  ]},
  { category: "Provincial Nominee Programs (PNP)", items: [
    { key: "pnp_on", label: "Ontario – OINP" },
    { key: "pnp_bc", label: "British Columbia – BCPNP" },
    { key: "pnp_ab", label: "Alberta – AAIP" },
    { key: "pnp_sk", label: "Saskatchewan – SINP" },
    { key: "pnp_mb", label: "Manitoba – MPNP" },
    { key: "pnp_ns", label: "Nova Scotia – NSNP" },
    { key: "pnp_nb", label: "New Brunswick – NBPNP" },
    { key: "pnp_pei", label: "Prince Edward Island – PEI PNP" },
    { key: "pnp_nl", label: "Newfoundland & Labrador – NLPNP" },
  ]},
  { category: "Business & Investor Pathways", items: [
    { key: "biz_startup", label: "Start-Up Visa Program" },
    { key: "biz_selfemployed", label: "Self-Employed Persons Program" },
    { key: "biz_ict", label: "Intra-Company Transfer (ICT)" },
    { key: "biz_prov", label: "Provincial Entrepreneur Streams" },
  ]},
  { category: "Pilot Programs & Regional Pathways", items: [
    { key: "pilot_aip", label: "Atlantic Immigration Program (AIP)" },
    { key: "pilot_rcip", label: "Rural Community Immigration Pilot (RCIP)" },
    { key: "pilot_fcip", label: "Francophone Community Immigration Pilot (FCIP)" },
    { key: "pilot_agrifood", label: "Agri-Food Pilot" },
    { key: "pilot_empp", label: "Economic Mobility Pathways Pilot (EMPP)" },
  ]},
  { category: "Family Sponsorship", items: [
    { key: "fam_spouse", label: "Spouse / Common-law / Conjugal Partner" },
    { key: "fam_children", label: "Dependent Children" },
    { key: "fam_pgp", label: "Parent & Grandparent Program (PGP)" },
    { key: "fam_orphan", label: "Orphaned Relatives" },
    { key: "fam_lonely", label: "Lonely Canadian Exception" },
  ]},
  { category: "Quebec-Specific Programs", items: [
    { key: "qc_qswp", label: "Quebec Skilled Worker Program (QSWP)" },
    { key: "qc_peq", label: "Quebec Experience Program (PEQ)" },
    { key: "qc_biz", label: "Quebec Business Immigration" },
  ]},
  { category: "Caregiver Programs", items: [
    { key: "care_child", label: "Home Child Care Provider Pilot" },
    { key: "care_support", label: "Home Support Worker Pilot" },
  ]},
  { category: "Temporary to Permanent (TR to PR)", items: [
    { key: "tr_pgwp", label: "Post-Graduation Work Permit (PGWP)" },
    { key: "tr_lmia", label: "LMIA-based Work Permits" },
    { key: "tr_iec", label: "International Experience Canada (IEC)" },
  ]},
  { category: "Humanitarian & Refugee Pathways", items: [
    { key: "hum_gar", label: "Government-Assisted Refugees" },
    { key: "hum_psr", label: "Privately Sponsored Refugees" },
    { key: "hum_hc", label: "Humanitarian & Compassionate (H&C)" },
  ]},
];

export default function ProfileForm({ profile, unlimitedMessengers, bioFeature }: { profile: any; unlimitedMessengers: boolean; bioFeature?: string | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  const [avatarImage, setAvatarImage] = useState(profile?.avatarImage || "");
  const [coverImage, setCoverImage] = useState(profile?.coverImage || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const rawLangs: string = profile?.languages || "";
  const [selectedLangs, setSelectedLangs] = useState<string[]>(
    rawLangs ? rawLangs.split(",").map((l: string) => l.trim()).filter(Boolean) : []
  );
  const [langSearch, setLangSearch] = useState("");
  const [langOpen, setLangOpen] = useState(false);

  const toggleLang = (lang: string) => {
    setSelectedLangs(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const filteredLangs = ALL_LANGUAGES.filter(l =>
    l.toLowerCase().includes(langSearch.toLowerCase())
  );
  
  const [messengers, setMessengers] = useState<{ type: string; value: string }[]>(
    Array.isArray(profile?.messengers) ? profile.messengers : []
  );

  // Specializations
  const rawSpecs: string = (profile as any)?.specializations || "";
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(
    rawSpecs ? (() => { try { return JSON.parse(rawSpecs); } catch { return []; } })() : []
  );
  const [specSearch, setSpecSearch] = useState("");
  const [specOpen, setSpecOpen] = useState(false);

  const toggleSpec = (key: string) => {
    setSelectedSpecs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const allSpecItems = IMMIGRATION_PATHS.flatMap(c => c.items);
  const filteredSpecItems = specSearch
    ? allSpecItems.filter(i => i.label.toLowerCase().includes(specSearch.toLowerCase()))
    : null; // null = show grouped

  // In-person
  const [offersInPerson, setOffersInPerson] = useState<boolean>((profile as any)?.offersInPerson ?? false);
  const [officeAddress, setOfficeAddress] = useState<string>((profile as any)?.officeAddress || "");

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
        languages: selectedLangs.join(", "),
        messengers,
        specializations: JSON.stringify(selectedSpecs),
        offersInPerson,
        officeAddress: offersInPerson ? officeAddress : "",
        bio,
      });
      alert("Profile Saved Successfully!");
      router.refresh();
    } catch (err) {
      alert("Error saving: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyEnrichment = async (id: string, currentStatus: string) => {
    if (currentStatus === 'consultant_verified') return;
    setIsChecking(true);
    try {
      const res = await consultantVerifyEnrichment(id);
      if (res.success) {
        alert("Thank you! The record has been verified and permanently published to your profile.");
        router.refresh();
      } else {
        alert("Failed to verify: " + res.error);
      }
    } catch (error) {
      alert("Error processing verification.");
    }
    setIsChecking(false);
  };

  const handleRequestCorrection = () => {
    alert("Support request sent! Our team will review the registry snapshot and contact you shortly to correct the record.");
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
                <p className="text-xs text-gray-400">Recommended: 1200x400px. Max 10MB. High quality banner for your profile header.</p>
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
                  <p className="text-xs text-gray-400 mt-2">Recommended: 400x400px. Max 10MB. Profiles with photos get 7x more clicks.</p>
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

            {/* PROFESSIONAL BIO */}
            <div className="pt-6 mt-6 border-t border-[#e5e7eb]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1F2B]">Professional Bio</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Describe your background, values, and why clients should choose you.
                  </p>
                </div>
              </div>

              {!bioFeature ? (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
                  <Lock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#1A1F2B] mb-1">Custom Bio Locked</h4>
                  <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                    Your current plan uses standard automated bios. Upgrade to write your own rich-text professional background.
                  </p>
                  <button type="button" className="bg-[#2FA4A9] text-white px-5 py-2 rounded-lg text-xs font-bold transition-all hover:bg-[#258d92]">
                    Upgrade Plan
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <BioEditor 
                    value={bio} 
                    onChange={setBio} 
                    placeholder="E.g. I am a licensed RCIC with over 10 years of experience..." 
                  />
                  {bioFeature !== "unlimited" && (
                     <p className="text-xs text-gray-400 text-right mt-1">
                       {(() => {
                         try {
                           const l = JSON.parse(bioFeature).maxLength;
                           const current = bio.replace(/<[^>]*>?/gm, '').length;
                           return `${current} / ${l} characters`;
                         } catch(e) { return ""; }
                       })()}
                     </p>
                  )}
                </div>
              )}
            </div>
            
          </div>
      </div>

      {/* SECTION: COMPANY ENRICHMENT SNAPSHOT */}
      {profile?.companyEnrichments?.filter((e: any) => e.matchStatus === 'ambiguous' || e.matchStatus === 'matched' || e.matchStatus === 'consultant_verified').map((enrichment: any) => {
        const isVerified = enrichment.matchStatus === 'consultant_verified';
        const isAuto = enrichment.matchStatus === 'ambiguous';

        let themeClass = "bg-gradient-to-br from-[#0F2A44] to-[#1A3A5A] text-white border-transparent";
        let badgeClass = "bg-white/10 text-white border-white/10";
        let icon = <CheckCircle className="w-3 h-3 text-green-400" />;
        let label = "Government Verified";

        if (isAuto) {
          themeClass = "bg-[#F8FAFC] text-[#1A1F2B] border-[#e5e7eb]";
          badgeClass = "bg-orange-100 text-orange-800 border-orange-200";
          icon = <Info className="w-3 h-3 text-orange-600" />;
          label = "Auto-Matched (Pending Your Verification)";
        } else if (isVerified) {
          themeClass = "bg-gradient-to-br from-[#FFD700]/10 to-[#FFF8DC] text-[#1A1F2B] border-[#FFD700]/30 shadow-[0_0_15px_rgba(255,215,0,0.1)]";
          badgeClass = "bg-[#FFD700] text-[#8B6508] border-[#DAA520]";
          icon = <Shield className="w-3 h-3 text-[#8B6508] fill-current" />;
          label = "Verified by You";
        }

        return (
          <div key={enrichment.id} className={`rounded-3xl border p-6 shadow-sm relative overflow-hidden ${themeClass}`}>
            <div className={`absolute top-0 right-0 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-bl-xl flex items-center gap-1.5 border-b border-l ${badgeClass}`}>
              {icon} {label}
            </div>
            
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">Official Business Registration Snapshot</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isVerified ? 'text-gray-500' : 'text-white/50'}`}>Legal Name</label>
                <div className="font-semibold">{enrichment.matchedLegalName}</div>
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isVerified ? 'text-gray-500' : 'text-white/50'}`}>Jurisdiction</label>
                <div className="font-semibold">{enrichment.jurisdiction}</div>
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isVerified ? 'text-gray-500' : 'text-white/50'}`}>Registry Number</label>
                <div className="font-semibold">{enrichment.registryNumber}</div>
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isVerified ? 'text-gray-500' : 'text-white/50'}`}>Incorporated On</label>
                <div className="font-semibold">{enrichment.incorporationDate ? new Date(enrichment.incorporationDate).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div className="md:col-span-2">
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isAuto || isVerified ? 'text-gray-500' : 'text-white/50'}`}>Registered Address</label>
                <div className="font-semibold">{enrichment.registeredAddress || 'N/A'}</div>
              </div>
              
              <div className="md:col-span-2 mt-4 pt-4 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className={`text-xs ${isAuto || isVerified ? 'text-gray-500' : 'text-white/50'}`}>
                    <div>Source: {enrichment.registrySource === 'federal_api' ? 'Federal Corporation API' : 'Canada Business Registries (MRAS)'}</div>
                    <div>Last Checked: {new Date(enrichment.lastCheckedAt).toLocaleDateString()}</div>
                 </div>

                 {!isVerified && (
                   <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                      <button 
                        type="button"
                        onClick={handleRequestCorrection}
                        className={`flex-1 sm:flex-none px-4 py-2 border rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isAuto ? 'border-orange-200 text-orange-700 hover:bg-orange-50' : 'border-white/20 hover:bg-white/10'}`}
                      >
                         <AlertTriangle className="w-4 h-4" /> Request Correction
                      </button>
                      <button 
                        type="button"
                        disabled={isChecking}
                        onClick={() => handleVerifyEnrichment(enrichment.id, enrichment.matchStatus)}
                        className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 ${isAuto ? 'bg-black text-white' : 'bg-[#2FA4A9] text-white hover:bg-[#258d92]'}`}
                      >
                         <ThumbsUp className="w-4 h-4" /> {isChecking ? 'Saving...' : 'Yes, This Is My Company'}
                      </button>
                   </div>
                 )}
              </div>
            </div>
          </div>
        );
      })}

      {/* SECTION: LANGUAGES */}
      <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1F2B] mb-5">Practice Details</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1A1F2B]">Spoken Languages</label>

              {/* Selected tags */}
              {selectedLangs.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedLangs.map(lang => (
                    <span key={lang} className="inline-flex items-center gap-1.5 bg-[#2FA4A9]/10 text-[#2FA4A9] border border-[#2FA4A9]/20 text-xs font-bold px-3 py-1.5 rounded-full">
                      {lang}
                      <button type="button" onClick={() => toggleLang(lang)} className="hover:text-red-500 transition-colors">×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Dropdown trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangOpen(o => !o)}
                  className="w-full bg-white border border-[#e5e7eb] px-4 py-3 rounded-xl text-sm text-left text-gray-500 hover:border-[#2FA4A9] transition-all flex items-center justify-between"
                >
                  <span>{selectedLangs.length === 0 ? 'Select languages...' : `${selectedLangs.length} language${selectedLangs.length > 1 ? 's' : ''} selected`}</span>
                  <span className="text-gray-400 text-xs">{langOpen ? '▲' : '▼'}</span>
                </button>

                {langOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={langSearch}
                        onChange={e => setLangSearch(e.target.value)}
                        placeholder="Search languages..."
                        className="w-full px-3 py-2 text-sm border border-gray-100 rounded-xl outline-none focus:border-[#2FA4A9] bg-gray-50"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1">
                      {filteredLangs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No results</p>
                      ) : filteredLangs.map(lang => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLang(lang)}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                            selectedLangs.includes(lang)
                              ? 'bg-[#2FA4A9]/10 text-[#2FA4A9] font-semibold'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            selectedLangs.includes(lang) ? 'bg-[#2FA4A9] border-[#2FA4A9]' : 'border-gray-300'
                          }`}>
                            {selectedLangs.includes(lang) && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          {lang}
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-gray-100">
                      <button type="button" onClick={() => setLangOpen(false)} className="w-full text-xs font-bold text-[#2FA4A9] py-1.5 hover:bg-gray-50 rounded-lg transition">
                        Done ({selectedLangs.length} selected)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* SECTION: IMMIGRATION SPECIALIZATIONS */}
      <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#1A1F2B] mb-1">Immigration Specializations</h2>
        <p className="text-xs text-gray-400 mb-5">Select all immigration pathways you practice. Shown on your public profile to help clients find the right consultant.</p>

        {selectedSpecs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedSpecs.map(key => {
              const item = allSpecItems.find(i => i.key === key);
              return item ? (
                <span key={key} className="inline-flex items-center gap-1.5 bg-[#2FA4A9]/10 text-[#2FA4A9] border border-[#2FA4A9]/20 text-xs font-bold px-3 py-1.5 rounded-full">
                  {item.label}
                  <button type="button" onClick={() => toggleSpec(key)} className="hover:text-red-500 transition-colors">×</button>
                </span>
              ) : null;
            })}
          </div>
        )}

        <div className="relative">
          <button type="button" onClick={() => setSpecOpen(o => !o)}
            className="w-full bg-white border border-[#e5e7eb] px-4 py-3 rounded-xl text-sm text-left text-gray-500 hover:border-[#2FA4A9] transition-all flex items-center justify-between">
            <span>{selectedSpecs.length === 0 ? 'Select specializations...' : `${selectedSpecs.length} selected`}</span>
            <span className="text-gray-400 text-xs">{specOpen ? '▲' : '▼'}</span>
          </button>

          {specOpen && (
            <div className="absolute z-50 mt-2 w-full bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <input type="text" value={specSearch} onChange={e => setSpecSearch(e.target.value)}
                  placeholder="Search pathways..." autoFocus
                  className="w-full px-3 py-2 text-sm border border-gray-100 rounded-xl outline-none focus:border-[#2FA4A9] bg-gray-50" />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredSpecItems ? (
                  <div className="p-1">
                    {filteredSpecItems.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No results</p>
                    ) : filteredSpecItems.map(item => (
                      <button key={item.key} type="button" onClick={() => toggleSpec(item.key)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${selectedSpecs.includes(item.key) ? 'bg-[#2FA4A9]/10 text-[#2FA4A9] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedSpecs.includes(item.key) ? 'bg-[#2FA4A9] border-[#2FA4A9]' : 'border-gray-300'}`}>
                          {selectedSpecs.includes(item.key) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : IMMIGRATION_PATHS.map(cat => (
                  <div key={cat.category}>
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{cat.category}</p>
                    </div>
                    {cat.items.map(item => (
                      <button key={item.key} type="button" onClick={() => toggleSpec(item.key)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${selectedSpecs.includes(item.key) ? 'bg-[#2FA4A9]/10 text-[#2FA4A9] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedSpecs.includes(item.key) ? 'bg-[#2FA4A9] border-[#2FA4A9]' : 'border-gray-300'}`}>
                          {selectedSpecs.includes(item.key) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-gray-100">
                <button type="button" onClick={() => { setSpecOpen(false); setSpecSearch(""); }}
                  className="w-full text-xs font-bold text-[#2FA4A9] py-1.5 hover:bg-gray-50 rounded-lg transition">
                  Done ({selectedSpecs.length} selected)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: IN-PERSON CONSULTATION */}
      <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#1A1F2B] mb-1">Consultation Mode</h2>
        <p className="text-xs text-gray-400 mb-5">Specify whether you accept in-person consultations in addition to online sessions.</p>

        <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl mb-4">
          <div>
            <p className="font-bold text-sm text-[#1A1F2B]">Accept In-Person Consultations</p>
            <p className="text-xs text-gray-400 mt-0.5">Clients will be able to request office visits</p>
          </div>
          <button type="button" onClick={() => setOffersInPerson(v => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${offersInPerson ? 'bg-[#2FA4A9]' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${offersInPerson ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {offersInPerson && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#1A1F2B]">Office Address *</label>
            <input type="text" value={officeAddress} onChange={e => setOfficeAddress(e.target.value)}
              placeholder="123 Main St, Toronto, ON M5V 2T6, Canada"
              className="w-full bg-white border border-[#e5e7eb] px-4 py-3 rounded-xl text-[#1A1F2B] text-sm focus:border-[#2FA4A9]/50 focus:ring-4 focus:ring-[#2FA4A9]/10 outline-none transition-all" />
            <p className="text-xs text-gray-400">This address will be shown to clients who book in-person meetings.</p>
          </div>
        )}
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
