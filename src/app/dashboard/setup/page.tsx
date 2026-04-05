// ============================================================================
// Hardware Source: page.tsx
// Version: 2.0.0 — 2026-04-04
// Why: Consultant Setup / Onboarding Flow. Provides progress checklist, educational content, and roadmap.
// Env / Identity: React Server Component
// ============================================================================

import {
  CheckCircle2, Circle, ChevronRight, User, BookOpen, Languages, MapPin, 
  CalendarDays, Link as LinkIcon, Sparkles, Rocket, Zap, ShieldCheck, 
  BarChart, CalendarHeart, Award
} from "lucide-react";
import Link from "next/link";

export default function DashboardSetupPage() {
  // Static state for onboarding demonstration
  const completionPercentage = 35;
  const isVerified = true;
  const isClaimed = true;
  
  const checklist = [
    { 
      id: 'bio', 
      title: 'Add a Professional Bio', 
      description: 'A strong bio builds immediate trust and authority.', 
      why: 'Clients are 3x more likely to book a consultant who clearly explains their background and values.',
      icon: BookOpen, 
      link: '/dashboard/profile' 
    },
    { 
      id: 'services', 
      title: 'Define Areas of Practice', 
      description: 'List the specific immigration pathways you handle.', 
      why: 'Verixa’s AI matches clients to you strictly based on these specializations (e.g. Express Entry, Start-Up Visa).',
      icon: MapPin, 
      link: '/dashboard/profile#services' 
    },
    { 
      id: 'languages', 
      title: 'Add Spoken Languages', 
      description: 'Specify the languages you are fluent in.', 
      why: 'Multilingual profiles get 50% more international leads from regions looking for native speakers.',
      icon: Languages, 
      link: '/dashboard/profile#languages' 
    },
    { 
      id: 'photo', 
      title: 'Upload Professional Photo', 
      description: 'Upload a high-quality headshot.', 
      why: 'Profiles with professional photos receive 7x more clicks because they humanize your brand.',
      icon: User, 
      link: '/dashboard/profile#photo' 
    },
    { 
      id: 'website', 
      title: 'Add Website URL', 
      description: 'Link your primary practice website.', 
      why: 'Drives high-intent traffic directly to your practice to boost your own SEO and direct inquiries.',
      icon: LinkIcon, 
      link: '/dashboard/profile#website' 
    },
  ];

  const currentFeatures = [
    { title: "CICC Auto-Verification", desc: "Automated identity matching with registry.", icon: ShieldCheck },
    { title: "Social Media Engine", desc: "AI-driven publishing to Facebook & LinkedIn.", icon: Sparkles },
    { title: "Public Directory Profile", desc: "A premium, SEO-optimized landing page for you.", icon: Rocket },
    { title: "AI Outreach Assistant", desc: "Write high-conversion emails in multiple languages.", icon: Zap },
  ];

  const roadmapItems = [
    { text: "Direct Consultation Booking system for clients" },
    { text: "Calendar sync (Google/Outlook) for automatic scheduling" },
    { text: "Advanced profile visitor analytics and tracking" },
    { text: "Identity Verification badge for client reviews to prevent spam" },
    { text: "Smart Assessment Tool for users to find the best pathways & consultants" },
    { text: "Diverse promotional and advertising packages" },
    { text: "B2B functionality for RCIC cross-collaboration" },
    { text: "Official Fintech licensure integration" },
    { text: "Mass Validation release for 1,000+ consultants" },
    { text: "Lifetime premium access granted to the first 100 early-adopter consultants" },
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-12 pb-24">
      
      {/* ── HEADER & PROGRESS ────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#2FA4A9]/10 text-[#2FA4A9] rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Welcome to Verixa
          </div>
          <h1 className="text-3xl md:text-5xl font-bold font-serif text-[#1A1F2B] mb-3">Maximize Your Practice</h1>
          <p className="text-gray-500 text-lg max-w-2xl">Complete your profile to activate the Verixa Revenue Engine. Follow the educational guides below to see exactly how each step grows your client base.</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#1A1F2B] mb-1">Onboarding Progress</h2>
              <p className="text-sm text-gray-500">{completionPercentage}% complete. Get to 100% to go live.</p>
            </div>
            <span className="text-3xl font-black text-[#2FA4A9]">{completionPercentage}%</span>
          </div>
          
          <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#2FA4A9] to-[#125e62] rounded-full transition-all duration-1000 ease-in-out relative"
              style={{ width: `${completionPercentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* ── SETUP CHECKLIST WITH EDUCATION ─────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold font-serif text-[#1A1F2B] mb-6 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-[#2FA4A9]" /> Your Setup Checklist
        </h2>
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          
          {/* Completed Steps */}
          <div className="p-6 sm:p-8 bg-emerald-50/50 flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-2xl shrink-0">
               <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-emerald-900 flex items-center gap-2">
                Identity & Registry Verified <CheckCircle2 className="w-4 h-4" />
              </h4>
              <p className="text-sm text-emerald-700/80 mt-1">Your RCIC license and professional identity have been securely verified against the public registry.</p>
            </div>
          </div>

          {/* Actionable Steps */}
          {checklist.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.link} className="block p-6 sm:p-8 hover:bg-[#F8FAFC] transition-colors group">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="flex items-center justify-center w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl shrink-0 group-hover:bg-[#2FA4A9]/10 group-hover:border-[#2FA4A9]/20 transition-colors">
                    <Icon className="w-6 h-6 text-gray-400 group-hover:text-[#2FA4A9]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-[#1A1F2B] group-hover:text-[#2FA4A9] transition-colors flex items-center gap-2">
                      {item.title} <ChevronRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-gray-600 mt-1">{item.description}</p>
                    <div className="mt-4 bg-[#F5F7FA] border border-[#e5e7eb] rounded-xl p-4 text-sm flex gap-3">
                      <div className="text-[#2FA4A9] mt-0.5"><InfoIcon /></div>
                      <p className="text-gray-600 leading-relaxed"><strong className="text-gray-900">Why it matters:</strong> {item.why}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── CURRENT VERSION HIGHLIGHTS ─────────────────────────────────── */}
        <section className="bg-[#1A1F2B] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2FA4A9] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
            Version 1.0 (Live)
          </div>
          <h2 className="text-2xl font-bold font-serif mb-6">Currently Active Features</h2>
          
          <div className="space-y-6">
            {currentFeatures.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 bg-white/5 rounded-xl border border-white/10 shrink-0">
                  <feat.icon className="w-5 h-5 text-[#2FA4A9]" />
                </div>
                <div>
                  <h4 className="font-bold text-white pb-0.5">{feat.title}</h4>
                  <p className="text-sm text-gray-400">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ROADMAP & NEXT UPDATE ──────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-[#F5F7FA] to-white rounded-3xl border border-gray-200 p-8 shadow-sm relative overflow-hidden">
          <div className="absolute -top-10 -right-10 text-[#2FA4A9]/5">
            <Rocket className="w-48 h-48 rotate-12" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2FA4A9]/10 text-[#2FA4A9] border border-[#2FA4A9]/20 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
            <CalendarHeart className="w-3.5 h-3.5" /> Upcoming Release
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#1A1F2B] mb-2">Version 1.1 Update</h2>
          <p className="text-sm font-semibold text-[#2FA4A9] mb-6 inline-flex items-center gap-2 bg-[#2FA4A9]/5 px-3 py-1.5 rounded-lg">
            Scheduled for April 13th (7 Days Left)
          </p>
          
          <ul className="space-y-3 relative z-10">
            {roadmapItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:border-[#2FA4A9] transition-colors">
                <div className="mt-0.5 shrink-0 bg-emerald-100 p-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium leading-snug">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

    </main>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );
}
