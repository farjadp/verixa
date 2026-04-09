"use client";

import { useState } from "react";
import { Settings, Save, Layout, CreditCard, Users, Shield, Cpu, ExternalLink, RefreshCw, Bell, ShieldAlert, Bot, Sparkles, UploadCloud, X, Image as ImageIcon } from "lucide-react";
import { updatePlatformSettings } from "@/actions/settings.actions";
import { generateBackup } from "@/actions/backup.actions";
import { uploadImageAction } from "@/actions/upload.actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AnnouncementComposer from "../announcements/AnnouncementComposer";

export default function PlatformSettingsClient({
  initialSettings
}: {
  initialSettings: Record<string, string>
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("VARIABLES");
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [formData, setFormData] = useState({
    blogWidgetRandomCount: initialSettings.blogWidgetRandomCount || "5",
    blogWidgetTopCount: initialSettings.blogWidgetTopCount || "5",
    platformFeePercent: initialSettings.platformFeePercent || "21",
    maintenanceMode: initialSettings.maintenanceMode === "true",
    stripeMode: initialSettings.stripeMode || "TEST",
    aiContentModel: initialSettings.aiContentModel || "gpt-4o",
    aiImageModel: initialSettings.aiImageModel || "FAL_FLUX_SCHNELL",
    siteName: initialSettings.siteName || "",
    headerLogo: initialSettings.headerLogo || "",
    footerLogo: initialSettings.footerLogo || "",
    favicon: initialSettings.favicon || "",
    supportEmail: initialSettings.supportEmail || "",
    primaryPhone: initialSettings.primaryPhone || "",
    seoTitle: initialSettings.seoTitle || "",
    seoDescription: initialSettings.seoDescription || "",
    seoImage: initialSettings.seoImage || "",
    consultantRelatedCount: initialSettings.consultantRelatedCount || "3",
    consultantTopCount: initialSettings.consultantTopCount || "3",
    consultantRelatedArticlesCount: initialSettings.consultantRelatedArticlesCount || "3",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: 'headerLogo' | 'footerLogo' | 'favicon' | 'seoImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const form = new FormData();
      form.append("image", file);
      const url = await uploadImageAction(form);
      setFormData(f => ({ ...f, [key]: url }));
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = Object.entries(formData).map(([k, v]) => ({ 
        key: k, 
        value: typeof v === "boolean" ? String(v) : v 
      }));
      await updatePlatformSettings(payload);
      router.refresh();
      alert("System Master Config Synchronized Successfully");
    } catch (e) {
      console.error(e);
      alert("Failed to synchronize config");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await generateBackup();
      if (res && !res.success) {
        alert("Failed to generate backup: " + res.error);
      } else {
        alert("Database Backup generated successfully! Check your admin email.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to generate backup: " + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between bg-[#0F2A44] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden border border-white/10">
        <div className="relative z-10 w-full flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-[#2FA4A9] mb-2 flex items-center gap-3">
              <Settings className="w-8 h-8 text-white relative top-0.5" />
              Platform Configuration Engine
            </h1>
            <p className="text-gray-400 font-medium">Global variable mappings. Variables auto-revalidate dynamic front-ends via ISR triggers.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="hidden lg:flex items-center gap-2 bg-[#2FA4A9] hover:bg-[#a88252] text-white px-8 py-4 rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {isSaving ? <span className="animate-spin text-white">◒</span> : <Save className="w-5 h-5" />}
            {isSaving ? "Synchronizing..." : "Save Master Config"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 shrink-0">
        
        {/* NAV TABS */}
        <div className="lg:col-span-1 space-y-2">
           <button 
             onClick={() => setActiveTab("VARIABLES")} 
             className={`w-full flex items-center gap-3 p-4 border rounded-2xl font-bold shadow-sm transition-all ${
               activeTab === "VARIABLES" ? "bg-white border-[#2FA4A9] text-[#2FA4A9]" : "border-transparent text-gray-500 hover:bg-white"
             }`}
           >
             <Layout className="w-5 h-5" /> Global Variables
           </button>
           <button 
             onClick={() => setActiveTab("ANNOUNCEMENTS")} 
             className={`w-full flex items-center gap-3 p-4 border rounded-2xl font-bold shadow-sm transition-all ${
               activeTab === "ANNOUNCEMENTS" ? "bg-white border-[#2FA4A9] text-[#2FA4A9]" : "border-transparent text-gray-500 hover:bg-white"
             }`}
           >
             <Bell className="w-5 h-5" /> In-App Announcements
           </button>
           <button 
             onClick={() => setActiveTab("TOOLS")} 
             className={`w-full flex items-center gap-3 p-4 border rounded-2xl font-bold shadow-sm transition-all ${
               activeTab === "TOOLS" ? "bg-white border-[#2FA4A9] text-[#2FA4A9]" : "border-transparent text-gray-500 hover:bg-white"
             }`}
           >
             <Cpu className="w-5 h-5" /> System Integrations
           </button>
        </div>

        {/* SETTINGS PANELS */}
        <div className="lg:col-span-3 space-y-8">
          
           {/* GLOBAL VARIABLES TAB */}
           {activeTab === "VARIABLES" && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               {/* BRANDING & IDENTITY */}
               <div className="bg-white p-8 rounded-3xl border border-[#e5e7eb] shadow-sm">
                 <h2 className="text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
                   <ImageIcon className="w-5 h-5 text-[#2FA4A9]" /> Branding & Identity
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Website Name</label>
                     <input 
                       type="text"
                       value={formData.siteName}
                       onChange={(e) => setFormData(f => ({...f, siteName: e.target.value}))}
                       className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-lg font-bold text-[#1A1F2B] bg-transparent"
                       placeholder="e.g. Verixa Global"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Support Email</label>
                     <input 
                       type="email"
                       value={formData.supportEmail}
                       onChange={(e) => setFormData(f => ({...f, supportEmail: e.target.value}))}
                       className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-lg font-bold text-[#1A1F2B] bg-transparent"
                       placeholder="e.g. support@verixa.com"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Primary Phone</label>
                     <input 
                       type="text"
                       value={formData.primaryPhone}
                       onChange={(e) => setFormData(f => ({...f, primaryPhone: e.target.value}))}
                       className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-lg font-bold text-[#1A1F2B] bg-transparent"
                       placeholder="e.g. +1 800 123 4567"
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {[{ key: 'headerLogo', label: 'Header Logo (Light/Dark)' }, { key: 'footerLogo', label: 'Footer Logo (Monochrome/Dark)' }, { key: 'favicon', label: 'Favicon (Square Icon)' }].map(item => (
                     <div key={item.key} className="space-y-3">
                       <label className="text-xs font-bold uppercase tracking-wider text-[#1A1F2B] block">{item.label}</label>
                       {(formData as any)[item.key] ? (
                         <div className="h-32 w-full rounded-2xl bg-[#F5F7FA] border border-[#e5e7eb] flex items-center justify-center relative overflow-hidden group">
                           <img src={(formData as any)[item.key]} alt={item.label} className="max-h-full max-w-full object-contain p-4" />
                           <button type="button" onClick={() => setFormData(f => ({...f, [item.key]: ""}))} className="absolute top-2 right-2 bg-white/90 p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 shadow-sm transition-all opacity-0 group-hover:opacity-100">
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       ) : (
                         <div className="flex items-center justify-center">
                           <div className="relative w-full h-32 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#2FA4A9] hover:bg-[#F5F7FA] transition-colors cursor-pointer group">
                             <UploadCloud className="w-6 h-6 mb-2 group-hover:text-[#2FA4A9]" />
                             <span className="text-xs font-bold group-hover:text-[#2FA4A9]">Upload Image</span>
                             <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, item.key as any)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                           </div>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>

               {/* GLOBAL SEO SETTINGS */}
               <div className="bg-white p-8 rounded-3xl border border-[#e5e7eb] shadow-sm">
                 <h2 className="text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
                   <ExternalLink className="w-5 h-5 text-[#2FA4A9]" /> Full Site Global SEO
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Global Meta Title</label>
                     <input 
                       type="text"
                       value={formData.seoTitle}
                       onChange={(e) => setFormData(f => ({...f, seoTitle: e.target.value}))}
                       className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-lg font-bold text-[#1A1F2B] bg-transparent"
                       placeholder="e.g. Verixa | Trusted Immigration Consultants"
                     />
                   </div>
                   <div className="space-y-4 row-span-2">
                     <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Default OpenGraph Image</label>
                     {formData.seoImage ? (
                       <div className="h-40 w-full rounded-2xl bg-[#F5F7FA] border border-[#e5e7eb] flex items-center justify-center relative overflow-hidden group">
                         <img src={formData.seoImage} alt="SEO OpenGraph" className="max-h-full max-w-full object-cover p-1" />
                         <button type="button" onClick={() => setFormData(f => ({...f, seoImage: ""}))} className="absolute top-2 right-2 bg-white/90 p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 shadow-sm transition-all opacity-0 group-hover:opacity-100">
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                     ) : (
                       <div className="flex items-center justify-center w-full">
                         <div className="relative w-full h-40 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#2FA4A9] hover:bg-[#F5F7FA] transition-colors cursor-pointer group">
                           <UploadCloud className="w-6 h-6 mb-2 group-hover:text-[#2FA4A9]" />
                           <span className="text-xs font-bold group-hover:text-[#2FA4A9]">Upload Default Share Image (1200x630)</span>
                           <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'seoImage')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                         </div>
                       </div>
                     )}
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Global Meta Description</label>
                     <textarea 
                       value={formData.seoDescription}
                       onChange={(e) => setFormData(f => ({...f, seoDescription: e.target.value}))}
                       rows={4}
                       className="w-full border-2 border-gray-100 rounded-2xl focus:border-[#2FA4A9] focus:outline-none p-4 text-base font-medium text-[#1A1F2B] bg-gray-50 transition-colors"
                       placeholder="e.g. Find, verify, and choose licensed immigration consultants..."
                     />
                   </div>
                  </div>
                </div>

                {/* PUBLIC PROFILES & WIDGETS SECTION */}
                <div className="bg-white p-8 rounded-3xl border border-[#e5e7eb] shadow-sm">
                  <h2 className="text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#2FA4A9]" /> Consultant Public Profiles & Widgets
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Related Consultants Limit</label>
                      <input 
                        type="number"
                        min="0"
                        max="20"
                        value={formData.consultantRelatedCount}
                        onChange={(e) => setFormData(f => ({...f, consultantRelatedCount: e.target.value}))}
                        className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-lg font-bold text-[#1A1F2B] bg-transparent"
                        placeholder="e.g. 3"
                      />
                      <p className="text-xs text-gray-400 mt-2">Number of related consultants to show based on province.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Top Consultants Limit</label>
                      <input 
                        type="number"
                        min="0"
                        max="20"
                        value={formData.consultantTopCount}
                        onChange={(e) => setFormData(f => ({...f, consultantTopCount: e.target.value}))}
                        className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-lg font-bold text-[#1A1F2B] bg-transparent"
                        placeholder="e.g. 3"
                      />
                      <p className="text-xs text-gray-400 mt-2">Number of top featured consultants to display.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Related Articles Limit</label>
                      <input 
                        type="number"
                        min="0"
                        max="20"
                        value={formData.consultantRelatedArticlesCount}
                        onChange={(e) => setFormData(f => ({...f, consultantRelatedArticlesCount: e.target.value}))}
                        className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-lg font-bold text-[#1A1F2B] bg-transparent"
                        placeholder="e.g. 3"
                      />
                      <p className="text-xs text-gray-400 mt-2">Number of related blog articles shown per profile.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-[#e5e7eb] shadow-sm">
            <h2 className="text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#2FA4A9]" /> Transactional & Revenue Logic
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Platform Fee Percentage (%)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={formData.platformFeePercent}
                    onChange={(e) => setFormData(f => ({...f, platformFeePercent: e.target.value}))}
                    className="w-24 border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-2xl font-black text-[#1A1F2B] bg-transparent"
                  />
                  <span className="text-2xl font-black text-gray-300">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Commission taken from the gross amount of every consultation booking.</p>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Gateway Mode</label>
                <div className="flex gap-2">
                  {["TEST", "LIVE"].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setFormData(f => ({...f, stripeMode: mode}))}
                      className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border ${
                        formData.stripeMode === mode 
                          ? "bg-[#0F2A44] text-white border-[#0F2A44] shadow-lg" 
                          : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {mode === "LIVE" && <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />}
                      Stripe {mode}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed italic">
                  Note: Switching to LIVE requires valid production API keys in your environment variables.
                </p>
              </div>
            </div>
          </div>

          {/* SYSTEM STATUS */}
          <div className="bg-white p-8 rounded-3xl border border-[#e5e7eb] shadow-sm">
            <h2 className="text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#2FA4A9]" /> System Continuity & Security
            </h2>
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="font-bold text-[#1A1F2B]">Maintenance Mode</p>
                <p className="text-xs text-gray-400 mt-1">Temporarily disable public access to the platform for maintenance.</p>
              </div>
              <button
                onClick={() => setFormData(f => ({ ...f, maintenanceMode: !f.maintenanceMode }))}
                className={`relative w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none ${
                  formData.maintenanceMode ? "bg-red-500" : "bg-gray-200"
                }`}
              >
                <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
                  formData.maintenanceMode ? "translate-x-8" : "translate-x-0"
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 mt-4">
              <div>
                <p className="font-bold text-[#1A1F2B]">Database Backup</p>
                <p className="text-xs text-gray-400 mt-1">Generate a full database backup and send it to the admin email.</p>
              </div>
              <button
                onClick={handleBackup}
                disabled={isBackingUp}
                className="flex items-center gap-2 bg-[#0F2A44] hover:bg-[#1a3a5c] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                {isBackingUp ? <span className="animate-spin">◒</span> : <RefreshCw className="w-4 h-4" />}
                {isBackingUp ? "Generating..." : "Generate Backup"}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ANNOUNCEMENTS TAB */}
      {activeTab === "ANNOUNCEMENTS" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AnnouncementComposer />
        </div>
      )}

      {/* TOOLS TAB */}
      {activeTab === "TOOLS" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-3xl border border-[#e5e7eb] shadow-sm">
            <h2 className="text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#2FA4A9]" /> AI Engine Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">AI Content Model</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "gpt-4.1", label: "GPT-4.1", badge: "NEW" },
                    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", badge: "NEW" },
                    { id: "gpt-4.1-nano", label: "GPT-4.1 Nano", badge: "NEW" },
                    { id: "o4-mini", label: "o4-mini", badge: "NEW" },
                    { id: "o3", label: "o3", badge: null },
                    { id: "gpt-4o", label: "gpt-4o", badge: null },
                    { id: "gpt-4o-mini", label: "gpt-4o-mini", badge: null },
                    { id: "gpt-4.5-preview", label: "gpt-4.5-preview", badge: null },
                  ].map(({ id, label, badge }) => (
                    <button
                      key={id}
                      onClick={() => setFormData(f => ({ ...f, aiContentModel: id }))}
                      className={`relative px-4 py-2 rounded-xl font-bold text-sm border transition-all ${
                        formData.aiContentModel === id
                          ? "bg-[#0F2A44] text-white border-[#0F2A44] shadow-lg"
                          : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {label}
                      {badge && (
                        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-[#2FA4A9] text-white px-1 py-0.5 rounded-full leading-none">{badge}</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">Model used for blog writing, email drafting, and AI outreach.</p>
              </div>
              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">AI Image Model</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "FAL_FLUX_KONTEXT_PRO", label: "FLUX Kontext Pro", badge: "NEW" },
                    { id: "FAL_FLUX_PRO_ULTRA", label: "FLUX Pro Ultra", badge: "NEW" },
                    { id: "FAL_FLUX_REALISM", label: "FLUX Realism", badge: null },
                    { id: "FAL_FLUX_PRO", label: "FLUX Pro", badge: null },
                    { id: "FAL_FLUX_DEV", label: "FLUX Dev", badge: null },
                    { id: "FAL_FLUX_SCHNELL", label: "FLUX Schnell", badge: null },
                  ].map(({ id, label, badge }) => (
                    <button
                      key={id}
                      onClick={() => setFormData(f => ({ ...f, aiImageModel: id }))}
                      className={`relative px-4 py-2 rounded-xl font-bold text-sm border transition-all ${
                        formData.aiImageModel === id
                          ? "bg-[#0F2A44] text-white border-[#0F2A44] shadow-lg"
                          : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {label}
                      {badge && (
                        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-[#2FA4A9] text-white px-1 py-0.5 rounded-full leading-none">{badge}</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">FAL.ai image generation model for AI-generated blog visuals.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#e5e7eb] shadow-sm">
            <h2 className="text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2FA4A9]" /> Blog Widget Controls
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Random Blog Widget Count</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.blogWidgetRandomCount}
                  onChange={(e) => setFormData(f => ({ ...f, blogWidgetRandomCount: e.target.value }))}
                  className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-xl font-bold text-[#1A1F2B] bg-transparent"
                />
                <p className="text-xs text-gray-400">Number of random articles shown in blog sidebar widgets.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Top Blog Widget Count</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.blogWidgetTopCount}
                  onChange={(e) => setFormData(f => ({ ...f, blogWidgetTopCount: e.target.value }))}
                  className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-xl font-bold text-[#1A1F2B] bg-transparent"
                />
                <p className="text-xs text-gray-400">Number of top-read articles shown in blog sidebar widgets.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#e5e7eb] shadow-sm">
            <h2 className="text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#2FA4A9]" /> Quick Links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Prisma Studio", href: "http://localhost:5555", icon: "🗄️" },
                { label: "Stripe Dashboard", href: "https://dashboard.stripe.com", icon: "💳" },
                { label: "Vercel Dashboard", href: "https://vercel.com", icon: "▲" },
                { label: "Resend Dashboard", href: "https://resend.com", icon: "📧" },
                { label: "Neon Database", href: "https://console.neon.tech", icon: "🐘" },
                { label: "GitHub Repo", href: "https://github.com/farjadp/verixa", icon: "🐙" },
              ].map(link => (
                <Link
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-[#F0F9FA] rounded-2xl border border-gray-100 hover:border-[#2FA4A9] transition-all group"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <span className="font-bold text-sm text-gray-600 group-hover:text-[#2FA4A9]">{link.label}</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-gray-300 group-hover:text-[#2FA4A9]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

        </div>
      </div>

      {/* MOBILE SAVE BUTTON */}
      <div className="lg:hidden">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-[#2FA4A9] hover:bg-[#a88252] text-white px-8 py-4 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          {isSaving ? <span className="animate-spin text-white">◒</span> : <Save className="w-5 h-5" />}
          {isSaving ? "Synchronizing..." : "Save Master Config"}
        </button>
      </div>
    </div>
  );
}