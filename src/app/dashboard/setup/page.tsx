// ============================================================================
// Hardware Source: page.tsx
// Version: 1.0.0 — 2026-03-22
// Why: Consultant Setup / Onboarding Flow. Provides a clear progress checklist to fully utilize the Revenue Engine.
// Env / Identity: React Server Component
// ============================================================================

import { CheckCircle2, Circle, ChevronRight, User, BookOpen, Languages, MapPin, CalendarDays, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

export default function DashboardSetupPage() {
  // In a real application, these states would be fetched from the database based on the authenticated user.
  const completionPercentage = 35;
  const isVerified = true;
  const isClaimed = true;
  
  const checklist = [
    { id: 'bio', title: 'Add a Professional Bio', description: 'Help clients understand your experience and approach.', icon: BookOpen, status: 'pending', link: '/dashboard/profile' },
    { id: 'services', title: 'Define Areas of Practice', description: 'Add 3+ services (e.g., Express Entry, Study Permits).', icon: MapPin, status: 'pending', link: '/dashboard/profile#services' },
    { id: 'languages', title: 'Add Spoken Languages', description: 'Attract international clients by showing the languages you speak.', icon: Languages, status: 'pending', link: '/dashboard/profile#languages' },
    { id: 'photo', title: 'Upload Professional Photo', description: 'Profiles with photos get 7x more clicks.', icon: User, status: 'pending', link: '/dashboard/profile#photo' },
    { id: 'website', title: 'Add Website URL', description: 'Drive traffic directly to your practice.', icon: LinkIcon, status: 'pending', link: '/dashboard/profile#website' },
    { id: 'booking', title: 'Enable Booking System', description: 'Allow clients to request paid consultations directly.', icon: CalendarDays, status: 'pending', link: '/dashboard/booking' },
  ];

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      
      {/* HEADER SECTION */}
        <div className="mb-10">
          <p className="text-sm font-bold text-[#C29967] uppercase tracking-widest mb-2">Onboarding Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-3 tracking-tight">Complete your profile setup</h1>
          <p className="text-gray-500 font-medium">To maximize your visibility and start receiving client leads, complete the steps below.</p>
        </div>

        {/* PROGRESS CARD */}
        <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm mb-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold mb-1">Your profile is {completionPercentage}% complete</h2>
              <p className="text-sm text-gray-500">You're almost ready to go live on the Verixa directory.</p>
            </div>
            <span className="text-3xl font-black text-[#C29967]">{completionPercentage}%</span>
          </div>
          
          {/* Progress Bar Container */}
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#C29967] to-[#b08856] rounded-full transition-all duration-1000 ease-in-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* CHECKLIST */}
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
          <h3 className="px-8 py-6 text-lg font-bold border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            Setup Checklist
            <span className="text-sm font-medium text-gray-400">2 of 8 completed</span>
          </h3>

          <div className="divide-y divide-gray-100">
            {/* Completed Static Steps */}
            <div className="px-8 py-5 flex items-start gap-4 opacity-60 bg-gray-50">
               <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
               <div className="flex-1">
                 <h4 className="font-bold line-through text-gray-600">Claim Profile</h4>
                 <p className="text-sm text-gray-500">You successfully claimed this CICC registry profile.</p>
               </div>
            </div>

            <div className="px-8 py-5 flex items-start gap-4 opacity-60 bg-gray-50">
               <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
               <div className="flex-1">
                 <h4 className="font-bold line-through text-gray-600">Verify Identity</h4>
                 <p className="text-sm text-gray-500">Your practice email was successfully verified.</p>
               </div>
            </div>
            
            {/* Actionable Steps */}
            {checklist.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.id} 
                  href={item.link}
                  className="px-8 py-6 flex items-start gap-4 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                >
                  <Circle className="w-6 h-6 text-gray-200 shrink-0 group-hover:text-[#C29967] transition-colors" />
                  <div className="flex-1">
                    <h4 className="font-bold text-[#1A1A1A] group-hover:text-[#C29967] transition-colors">{item.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  </div>
                  <div className="pl-4 h-full flex items-center">
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#C29967] transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* SKIP TO DASHBOARD CTA */}
        <div className="mt-8 text-center pb-12">
          <Link href="/dashboard" className="text-sm font-bold text-gray-400 hover:text-[#C29967] transition-colors border-b border-transparent hover:border-[#C29967]/30 pb-1">
            Skip onboarding and go to my dashboard
          </Link>
        </div>

      </main>
  );
}
