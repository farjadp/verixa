"use client";

import { useState } from "react";
import { saveBookingConfiguration } from "@/actions/settings.actions";
import { Clock, DollarSign, Plus, Save, Settings2, Trash2, Video, Phone, Users, Loader2 } from "lucide-react";

export default function BookingSettingsForm({ initialProfile }: { initialProfile: any }) {
  const [types, setTypes] = useState<any[]>(initialProfile.consultationTypes || []);
  const [availability, setAvailability] = useState<any[]>(initialProfile.weeklyAvailability || []);
  const [isSaving, setIsSaving] = useState(false);

  const daysLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Initialize missing days
  const fullAvailability = daysLabels.map((day, idx) => {
    const existing = availability.find(a => a.dayOfWeek === idx);
    return existing || { dayOfWeek: idx, isActive: false, startTime: "09:00", endTime: "17:00" };
  });

  const handleAvailabilityChange = (idx: number, field: string, value: any) => {
    const newAvail = [...fullAvailability];
    newAvail[idx] = { ...newAvail[idx], [field]: value };
    setAvailability(newAvail);
  };

  const handleAddSession = () => {
    setTypes([
      ...types,
      {
        id: `new_${Date.now()}`,
        title: "New Session Title",
        description: "Brief description of the session.",
        durationMinutes: 30,
        priceCents: 10000,
        communicationType: "VIDEO",
        isActive: true,
        isEditing: true
      }
    ]);
  };

  const handleUpdateType = (id: string, field: string, value: any) => {
    setTypes(types.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleDeleteType = (id: string) => {
    // Soft delete by hiding it, or for MVP just remove if it's new
    if (id.startsWith("new_")) {
      setTypes(types.filter(t => t.id !== id));
    } else {
      handleUpdateType(id, "isActive", false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveBookingConfiguration({
        availability: fullAvailability,
        consultationTypes: types.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          durationMinutes: Number(t.durationMinutes),
          priceCents: Number(t.priceCents),
          communicationType: t.communicationType,
          isActive: t.isActive
        }))
      });
      alert("Settings saved successfully!");
    } catch (e) {
      alert("Failed to save settings.");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* SECTION: SESSION TYPES */}
      <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6 shadow-sm relative">
         <div className="flex items-center justify-between mb-6">
           <h2 className="text-lg font-bold text-[#1A1F2B]">Session Types</h2>
           <button onClick={handleAddSession} className="text-sm font-bold text-[#2FA4A9] flex items-center gap-1.5 hover:underline">
             <Plus className="w-4 h-4" /> Add Session
           </button>
         </div>
         
         <div className="space-y-4">
           {types.filter(t => t.isActive || t.isEditing).length === 0 && (
             <p className="text-gray-400 text-sm">No session types configured.</p>
           )}

           {types.map((type) => {
              if (!type.isActive && !type.id.startsWith("new_")) return null; // hide explicitly deleted
              return (
              <div key={type.id} className="border border-[#e5e7eb] rounded-2xl p-5 hover:border-[#2FA4A9]/30 transition-all bg-[#ffffff]">
                 
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex-1 mr-4">
                     <input 
                       value={type.title}
                       onChange={e => handleUpdateType(type.id, "title", e.target.value)}
                       className="font-bold text-[#1A1F2B] text-lg bg-transparent border-none outline-none w-full focus:ring-1 focus:ring-[#2FA4A9] rounded px-1 -mx-1"
                     />
                     <input
                       value={type.description}
                       onChange={e => handleUpdateType(type.id, "description", e.target.value)}
                       className="text-sm text-gray-500 mt-1 bg-transparent border-none outline-none w-full focus:ring-1 focus:ring-[#2FA4A9] rounded px-1 -mx-1"
                     />
                   </div>
                   <div className="flex items-center gap-3">
                     <button onClick={() => handleDeleteType(type.id)} className="p-2 text-red-400 hover:text-white hover:bg-red-500 border border-red-100 rounded-lg shadow-sm transition-colors">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pt-4 border-t border-[#e5e7eb]">
                   <div className="flex items-center gap-2">
                     <Clock className="w-4 h-4 text-gray-400" /> 
                     <select value={type.durationMinutes} onChange={e => handleUpdateType(type.id, "durationMinutes", e.target.value)} className="text-sm font-bold text-gray-600 bg-transparent outline-none">
                       <option value={15}>15 Minutes</option>
                       <option value={30}>30 Minutes</option>
                       <option value={45}>45 Minutes</option>
                       <option value={60}>60 Minutes</option>
                       <option value={90}>90 Minutes</option>
                     </select>
                   </div>
                   <div className="flex items-center gap-2">
                     <DollarSign className="w-4 h-4 text-gray-400" /> 
                     <div className="flex items-center">
                       <input type="number" 
                         value={type.priceCents / 100} 
                         onChange={e => handleUpdateType(type.id, "priceCents", Math.round(Number(e.target.value) * 100))}
                         className="w-16 text-sm font-bold text-gray-600 bg-transparent outline-none border-b border-gray-200 focus:border-[#2FA4A9]"
                       /> 
                       <span className="text-sm font-bold text-gray-600 ml-1">CAD</span>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <select value={type.communicationType} onChange={e => handleUpdateType(type.id, "communicationType", e.target.value)} className="text-sm font-bold text-gray-600 bg-transparent outline-none truncate">
                       <option value="VIDEO">Video Call</option>
                       <option value="PHONE">Phone Call</option>
                       <option value="IN_PERSON">In Person</option>
                     </select>
                   </div>
                 </div>
              </div>
           )})}
         </div>
      </div>

      {/* SECTION: GENERAL AVAILABILITY */}
      <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6 shadow-sm">
         <h2 className="text-lg font-bold text-[#1A1F2B] mb-5">Recurring Availability</h2>
         
         <div className="space-y-4">
           {daysLabels.map((day, idx) => {
              const currentAvail = fullAvailability[idx];
              return (
              <div key={day} className="flex items-center justify-between border-b border-[#e5e7eb] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-4 w-32">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={currentAvail.isActive} onChange={(e) => handleAvailabilityChange(idx, "isActive", e.target.checked)} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F2A44]"></div>
                  </label>
                  <span className={`text-sm font-bold ${currentAvail.isActive ? 'text-[#1A1F2B]' : 'text-gray-400'}`}>{day}</span>
                </div>
                <div className={`flex items-center gap-3 ${!currentAvail.isActive ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="time" value={currentAvail.startTime} onChange={e => handleAvailabilityChange(idx, "startTime", e.target.value)} className="bg-[#ffffff] border border-[#e5e7eb] px-3 py-2 rounded-lg text-sm text-[#1A1F2B] outline-none focus:border-[#2FA4A9]" />
                  <span className="text-gray-400 text-sm">-</span>
                  <input type="time" value={currentAvail.endTime} onChange={e => handleAvailabilityChange(idx, "endTime", e.target.value)} className="bg-[#ffffff] border border-[#e5e7eb] px-3 py-2 rounded-lg text-sm text-[#1A1F2B] outline-none focus:border-[#2FA4A9]" />
                </div>
              </div>
           )})}
         </div>
      </div>

      {/* SAVE CTA */}
      <div className="flex justify-end sticky bottom-6 z-20">
        <button onClick={handleSave} disabled={isSaving} type="button" className="bg-[#0F2A44] text-white px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-black/10 hover:bg-black transition-all flex items-center gap-2 disabled:opacity-70">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Saving..." : "Save Schedule Output"}
        </button>
      </div>

    </div>
  );
}
