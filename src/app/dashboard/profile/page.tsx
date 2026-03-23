// ============================================================================
// Hardware Source: page.tsx
// Version: 1.0.0 — 2026-03-22
// Why: Consultant Profile Management Form. Allows editing marketing fields while locking CICC synced data.
// Env / Identity: React Server Component
// ============================================================================

import { Lock, UploadCloud, Save } from "lucide-react";

export default function ProfileManagementPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-[#1A1A1A]">Profile Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage exactly how clients see you on the Verixa directory.</p>
      </div>

      <form className="space-y-8 pb-16">
        
        {/* SECTION: BASIC INFO (LOCKED) */}
        <div className="bg-white rounded-3xl border border-[#f5ecd8] p-6 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 bg-[#F6F3F0] text-[#C29967] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-bl-xl flex items-center gap-1.5 border-b border-l border-[#f5ecd8]">
             <Lock className="w-3 h-3" /> Synced from Official Registry
           </div>
           
           <h2 className="text-lg font-bold text-[#1A1A1A] mb-5">Official Data</h2>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Full Name</label>
               <input type="text" value="Amir Hossein Samaei" readOnly className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-gray-600 font-medium cursor-not-allowed outline-none" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-gray-400">RCIC License</label>
               <input type="text" value="R706476" readOnly className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-gray-600 font-medium cursor-not-allowed outline-none" />
             </div>
           </div>
           <p className="text-xs text-gray-400 mt-4">Official data cannot be changed directly here to maintain platform integrity. If this is incorrect, contact Verixa Support.</p>
        </div>

        {/* SECTION: MARKETING INFO (EDITABLE) */}
        <div className="bg-white rounded-3xl border border-[#f5ecd8] p-6 shadow-sm">
           <h2 className="text-lg font-bold text-[#1A1A1A] mb-5">Public Profile Data</h2>
           
           <div className="space-y-6">
             {/* HEADSHOT */}
             <div>
               <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] block mb-3">Professional Headshot</label>
               <div className="flex items-center gap-6">
                 <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                    <UploadCloud className="w-8 h-8" />
                 </div>
                 <div>
                   <button type="button" className="bg-[#FDFCFB] border border-[#f5ecd8] text-[#1A1A1A] text-sm font-bold px-4 py-2 rounded-lg hover:border-[#C29967] transition-all">Upload Photo</button>
                   <p className="text-xs text-gray-400 mt-2">Recommended: 400x400px, Professional headshot. Profiles with photos get 7x more clicks.</p>
                 </div>
               </div>
             </div>

             {/* TAGLINE */}
             <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Headline / Tagline <span className="text-gray-400 font-normal lowercase tracking-normal ml-1">(Optional)</span></label>
               <input type="text" placeholder="e.g. Expert in Express Entry & Startup Visa" className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/10 outline-none transition-all" />
             </div>

             {/* BIO */}
             <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Professional Bio</label>
               <textarea rows={4} placeholder="Tell your clients about your experience, approach, and why they should choose you..." className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/10 outline-none transition-all resize-none"></textarea>
               <p className="text-xs text-gray-400">Keep it between 50 and 150 words for optimal conversion.</p>
             </div>
             
             {/* CONTACT */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Public Phone Number</label>
                 <input type="tel" placeholder="+1 (555) 000-0000" className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/10 outline-none transition-all" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Website URL</label>
                 <input type="url" placeholder="https://..." className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/10 outline-none transition-all" />
               </div>
             </div>

             {/* SOCIAL LINKS */}
             <div className="pt-6 mt-6 border-t border-[#f5ecd8]">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold text-[#1A1A1A]">Social Media Links</h3>
                 <button type="button" className="text-xs font-bold text-[#C29967] hover:bg-[#F6F3F0] px-3 py-1.5 rounded-lg transition-colors flex items-center border border-transparent hover:border-[#f5ecd8]">
                   + Add Profile
                 </button>
               </div>
               
               <div className="space-y-3">
                 {/* Item 1 */}
                 <div className="flex items-center gap-2 sm:gap-3">
                   <select className="bg-[#F6F3F0] border border-[#f5ecd8] text-[#1A1A1A] text-sm font-bold px-3 sm:px-4 py-3 rounded-xl focus:border-[#C29967] outline-none max-w-[120px] sm:max-w-none">
                     <option>LinkedIn</option>
                     <option>Instagram</option>
                     <option>YouTube</option>
                     <option>Medium</option>
                     <option>TikTok</option>
                     <option>Twitter / X</option>
                   </select>
                   <input type="url" placeholder="https://..." defaultValue="linkedin.com/in/amirhossein" className="flex-1 bg-[#FDFCFB] border border-[#f5ecd8] px-3 sm:px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967] outline-none transition-all" />
                   <button type="button" className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" aria-label="Remove">×</button>
                 </div>
                 
                 {/* Item 2 */}
                 <div className="flex items-center gap-2 sm:gap-3">
                   <select className="bg-[#F6F3F0] border border-[#f5ecd8] text-[#1A1A1A] text-sm font-bold px-3 sm:px-4 py-3 rounded-xl focus:border-[#C29967] outline-none max-w-[120px] sm:max-w-none">
                     <option>YouTube</option>
                     <option>Instagram</option>
                     <option>LinkedIn</option>
                     <option>Medium</option>
                     <option>TikTok</option>
                     <option>Twitter / X</option>
                   </select>
                   <input type="url" placeholder="https://..." className="flex-1 bg-[#FDFCFB] border border-[#f5ecd8] px-3 sm:px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967] outline-none transition-all" />
                   <button type="button" className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" aria-label="Remove">×</button>
                 </div>
               </div>
               <p className="text-xs text-gray-400 mt-3">Add links to any platforms where you publish content or engage with clients.</p>
             </div>
           </div>
        </div>

        {/* SECTION: SERVICES & LANGUAGES */}
        <div className="bg-white rounded-3xl border border-[#f5ecd8] p-6 shadow-sm">
           <h2 className="text-lg font-bold text-[#1A1A1A] mb-5">Practice Details</h2>
           
           <div className="space-y-6">
             <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Areas of Practice</label>
               <input type="text" placeholder="Type a service and press enter (e.g. Express Entry, Study Permits)" className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/10 outline-none transition-all" />
               <div className="flex flex-wrap gap-2 mt-3 p-3 bg-gray-50 rounded-xl min-h-12 border border-dashed border-gray-200">
                  {/* Sample tags */}
                  <span className="bg-white border border-gray-200 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2">Express Entry <button className="text-gray-400 hover:text-red-500">×</button></span>
                  <span className="bg-white border border-gray-200 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2">Family Sponsorship <button className="text-gray-400 hover:text-red-500">×</button></span>
               </div>
             </div>

             <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Spoken Languages</label>
               <input type="text" placeholder="Type a language and press enter" className="w-full bg-[#FDFCFB] border border-[#f5ecd8] px-4 py-3 rounded-xl text-[#1A1A1A] text-sm focus:border-[#C29967]/50 focus:ring-4 focus:ring-[#C29967]/10 outline-none transition-all" />
               <div className="flex flex-wrap gap-2 mt-3 p-3 bg-gray-50 rounded-xl min-h-12 border border-dashed border-gray-200">
                  <span className="bg-white border border-gray-200 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2">Persian <button className="text-gray-400 hover:text-red-500">×</button></span>
                  <span className="bg-white border border-gray-200 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2">English <button className="text-gray-400 hover:text-red-500">×</button></span>
               </div>
             </div>
           </div>
        </div>

        {/* SECTION: RICH MEDIA GALLERY */}
        <div className="bg-white rounded-3xl border border-[#f5ecd8] p-6 shadow-sm">
           <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">Media Gallery</h2>
           <p className="text-sm text-gray-500 mb-5">Upload photos of your office, or a short introductory video. Multimedia significantly increases trust.</p>
           
           <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-gray-300 transition-colors cursor-pointer group">
             <UploadCloud className="w-8 h-8 text-gray-400 mb-3 group-hover:text-[#C29967] transition-colors" />
             <p className="text-sm font-bold text-[#1A1A1A] mb-1">Click to upload or drag & drop</p>
             <p className="text-xs text-gray-400">JPG, PNG, or MP4 (Max 5 items, up to 50MB each)</p>
           </div>
        </div>

        {/* SAVE CTA */}
        <div className="flex justify-end sticky bottom-6 z-20">
          <button type="button" className="bg-[#1A1A1A] text-white px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-black/10 hover:bg-black transition-all flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Profile Changes
          </button>
        </div>

      </form>
    </main>
  );
}
