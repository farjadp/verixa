// ============================================================================
// Hardware Source: page.tsx
// Version: 1.0.0 — 2026-03-22
// Why: Consultant Platform Guide. Educational material to help them maximize their revenue.
// Env / Identity: React Server Component
// ============================================================================

import { BookOpen, PlayCircle, Star, TrendingUp } from "lucide-react";

export default function PlatformGuidePage() {
  const guides = [
    {
      title: "How to rank #1 on Verixa Directory",
      category: "Growth Strategy",
      icon: TrendingUp,
      duration: "5 min read",
    },
    {
      title: "Optimizing your Professional Bio for Conversion",
      category: "Profile Setup",
      icon: BookOpen,
      duration: "3 min video",
    },
    {
      title: "Responding to Reviews properly",
      category: "Reputation",
      icon: Star,
      duration: "4 min read",
    },
    {
      title: "Setting up your Booking Calendars",
      category: "Platform Basics",
      icon: PlayCircle,
      duration: "2 min video",
    }
  ];

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-[#1A1F2B]">Platform Guide & Education</h1>
        <p className="text-gray-500 text-sm mt-1">Everything you need to know to turn your Verixa profile into a client-generating machine.</p>
      </div>

      {/* FEATURED VIDEO */}
      <div className="bg-[#0F2A44] rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-black/10 text-white flex flex-col md:flex-row gap-8 items-center justify-between border border-[#e5e7eb]/10">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
             <Star className="w-3.5 h-3.5 text-[#2FA4A9]" /> Masterclass
          </div>
          <h2 className="text-3xl font-serif font-bold text-[#2FA4A9]">The 7-Figure Immigration Practice</h2>
          <p className="text-gray-400 text-sm max-w-md">Learn the exact strategies top 1% consultants use to generate a consistent stream of high-paying clients on autopilot.</p>
          <button className="bg-white text-[#1A1F2B] px-6 py-3 rounded-xl font-bold border-none hover:bg-gray-100 transition-colors flex items-center gap-2 mt-2">
            <PlayCircle className="w-5 h-5" /> Play Masterclass
          </button>
        </div>
        <div className="w-full md:w-80 h-48 bg-black border border-white/10 rounded-2xl flex items-center justify-center relative group cursor-pointer overflow-hidden">
           <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Video cover" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity" />
           <div className="w-16 h-16 rounded-full bg-[#2FA4A9] text-white flex items-center justify-center z-10 scale-100 group-hover:scale-110 transition-transform shadow-lg shadow-black/50">
             <PlayCircle className="w-8 h-8 ml-1" />
           </div>
        </div>
      </div>

      {/* ARTICLES GRID */}
      <div>
        <h3 className="text-lg font-bold text-[#1A1F2B] mb-6">Most Popular Guides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {guides.map((guide, idx) => {
            const Icon = guide.icon;
            return (
              <div key={idx} className="bg-white rounded-3xl border border-[#e5e7eb] p-6 shadow-sm hover:border-[#2FA4A9]/40 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full">
                 <div className="w-12 h-12 rounded-xl bg-[#F5F7FA] text-[#2FA4A9] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                   <Icon className="w-6 h-6" />
                 </div>
                 <h4 className="font-bold text-[#1A1F2B] mb-3 leading-snug group-hover:text-[#2FA4A9] transition-colors">{guide.title}</h4>
                 <div className="mt-auto flex items-center justify-between text-xs font-bold pt-4 border-t border-[#e5e7eb]">
                   <span className="text-gray-400">{guide.category}</span>
                   <span className="text-[#1A1F2B] bg-gray-50 px-2.5 py-1 rounded-md">{guide.duration}</span>
                 </div>
              </div>
            );
          })}
        </div>
      </div>

    </main>
  );
}
