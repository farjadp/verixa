"use client";

import { useState } from "react";
import { Settings, Save, Layout, CreditCard, Users, Shield, Cpu, ExternalLink } from "lucide-react";
import { updatePlatformSettings } from "@/actions/settings.actions";
import { useRouter } from "next/navigation";

export default function PlatformSettingsClient({
  initialSettings
}: {
  initialSettings: Record<string, string>
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    blogWidgetRandomCount: initialSettings.blogWidgetRandomCount || "5",
    blogWidgetTopCount: initialSettings.blogWidgetTopCount || "5"
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = Object.entries(formData).map(([k, v]) => ({ key: k, value: v }));
      await updatePlatformSettings(payload);
      router.refresh();
      alert("Settings Updated Successfully");
    } catch (e) {
      console.error(e);
      alert("Failed to update settings");
    } finally {
      setIsSaving(false);
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
        
        {/* NAV TABS (Future Expandable) */}
        <div className="lg:col-span-1 space-y-2">
           <button className="w-full flex items-center gap-3 p-4 bg-white border border-[#2FA4A9] text-[#2FA4A9] rounded-2xl font-bold shadow-sm">
             <Layout className="w-5 h-5" /> Front-Page UX
           </button>
           <button className="w-full flex items-center gap-3 p-4 hover:bg-white border border-transparent text-gray-500 rounded-2xl font-medium transition-colors cursor-not-allowed opacity-50">
             <CreditCard className="w-5 h-5" /> Stripe Revenue
           </button>
           <button className="w-full flex items-center gap-3 p-4 hover:bg-white border border-transparent text-gray-500 rounded-2xl font-medium transition-colors cursor-not-allowed opacity-50">
             <Users className="w-5 h-5" /> Provider Logic
           </button>
           <button className="w-full flex items-center gap-3 p-4 hover:bg-white border border-transparent text-gray-500 rounded-2xl font-medium transition-colors cursor-not-allowed opacity-50">
             <Shield className="w-5 h-5" /> Legal Contexts
           </button>
           <button className="w-full flex items-center gap-3 p-4 hover:bg-white border border-transparent text-gray-500 rounded-2xl font-medium transition-colors cursor-not-allowed opacity-50">
             <Cpu className="w-5 h-5" /> Analytics Nodes
           </button>
        </div>

        {/* SETTINGS PANELS */}
        <div className="lg:col-span-3 space-y-8">
          
          <div className="bg-white p-8 rounded-3xl border border-[#e5e7eb] shadow-sm">
            <h2 className="text-xl font-bold text-[#1A1F2B] mb-6 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-[#2FA4A9]" /> SEO Article Hub Limits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Top Consultants Count</label>
                <input 
                  type="number"
                  min="0"
                  max="50"
                  value={formData.blogWidgetTopCount}
                  onChange={(e) => setFormData(f => ({...f, blogWidgetTopCount: e.target.value}))}
                  className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-[#1A1F2B] font-medium transition-colors bg-transparent"
                  placeholder="e.g. 5"
                />
                <p className="text-xs text-gray-400 mt-2">Maximum elements fetched dynamically into the Top Rated constraint.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Random Discovery Count</label>
                <input 
                  type="number"
                  min="0"
                  max="50"
                  value={formData.blogWidgetRandomCount}
                  onChange={(e) => setFormData(f => ({...f, blogWidgetRandomCount: e.target.value}))}
                  className="w-full border-b-2 border-gray-200 focus:border-[#2FA4A9] focus:outline-none py-3 text-[#1A1F2B] font-medium transition-colors bg-transparent"
                  placeholder="e.g. 5"
                />
                <p className="text-xs text-gray-400 mt-2">Maximum elements shuffled organically into the Discovery limit container.</p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
