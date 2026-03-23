"use client";

import { useState } from "react";
import { FileText, X, MapPin, GraduationCap, Target, Heart, Languages, Calendar } from "lucide-react";

export default function ClientDossierModal({ clientProfile }: { clientProfile: any }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!clientProfile) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#C29967] hover:text-[#b0895c] bg-[#C29967]/10 px-2 py-1 rounded"
      >
        <FileText className="w-3.5 h-3.5" /> View Shared Profile
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 text-left">
            
            <div className="px-6 py-4 flex items-center justify-between border-b border-[#f5ecd8] bg-[#FDFCFB]">
              <h3 className="font-serif font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C29967]" /> Client Dossier
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors">
                 <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
               <p className="text-sm text-gray-500 mb-2">
                 The client has securely shared their immigration assessment with you to help prepare for the consultation.
               </p>

               <div className="grid grid-cols-2 gap-4">
                  {clientProfile.nationality && (
                    <div className="bg-[#FDFCFB] border border-[#f5ecd8] rounded-xl p-4 flex gap-3 pb-8">
                       <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                       <div>
                         <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Nationality</p>
                         <p className="font-bold text-[#1A1A1A] text-sm">{clientProfile.nationality}</p>
                       </div>
                    </div>
                  )}
                  {clientProfile.currentCountry && (
                    <div className="bg-[#FDFCFB] border border-[#f5ecd8] rounded-xl p-4 flex gap-3 pb-8">
                       <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                       <div>
                         <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Current Residence</p>
                         <p className="font-bold text-[#1A1A1A] text-sm">{clientProfile.currentCountry}</p>
                       </div>
                    </div>
                  )}
               </div>

               <div className="space-y-3">
                 {clientProfile.immigrationGoals && (
                   <div className="flex items-center gap-4 py-3 border-b border-gray-100">
                     <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                       <Target className="w-4 h-4" />
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Primary Goal</p>
                       <p className="font-bold text-[#1A1A1A] text-sm">{clientProfile.immigrationGoals}</p>
                     </div>
                   </div>
                 )}

                 {clientProfile.educationLevel && (
                   <div className="flex items-center gap-4 py-3 border-b border-gray-100">
                     <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                       <GraduationCap className="w-4 h-4" />
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Highest Education</p>
                       <p className="font-bold text-[#1A1A1A] text-sm">{clientProfile.educationLevel}</p>
                     </div>
                   </div>
                 )}

                 {clientProfile.languages && (
                   <div className="flex items-center gap-4 py-3 border-b border-gray-100">
                     <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                       <Languages className="w-4 h-4" />
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Spoken Languages</p>
                       <p className="font-bold text-[#1A1A1A] text-sm">{clientProfile.languages}</p>
                     </div>
                   </div>
                 )}

                 {(clientProfile.maritalStatus || clientProfile.age) && (
                   <div className="flex items-center gap-4 py-3">
                     <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                       <Heart className="w-4 h-4" />
                     </div>
                     <div className="flex gap-8">
                       {clientProfile.maritalStatus && (
                         <div>
                           <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Marital Status</p>
                           <p className="font-bold text-[#1A1A1A] text-sm">{clientProfile.maritalStatus}</p>
                         </div>
                       )}
                       {clientProfile.age && (
                         <div>
                           <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Age</p>
                           <p className="font-bold text-[#1A1A1A] text-sm">{clientProfile.age} yrs</p>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
               </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
