"use client";

import Link from "next/link";
import { Shield, Linkedin, Twitter, Send, ArrowUpRight, CheckCircle2, Target } from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#F8FAFC] pb-8 pt-12 border-t border-gray-200 selection:bg-[#2FA4A9] selection:text-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        
        {/* Massive Action Banner */}
        <div className="bg-[#0F2A44] rounded-[2.5rem] p-10 lg:p-14 mb-20 flex flex-col lg:flex-row items-center justify-between shadow-2xl shadow-[#0F2A44]/20 relative overflow-hidden group">
          {/* Decorative Glow */}
          <div className="absolute right-0 top-0 bottom-0 w-[60%] bg-gradient-to-l from-[#2FA4A9]/20 to-transparent pointer-events-none mix-blend-screen transition-transform duration-700 ease-out group-hover:scale-105"></div>
          
          <div className="relative z-10 max-w-2xl text-left w-full">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest mb-8 text-[#2FA4A9] border border-white/5 shadow-sm">
              <CheckCircle2 className="w-4 h-4" /> For Immigration Professionals
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 font-serif leading-tight">
              Stop fighting algorithms.<br /> Start booking clients.
            </h2>
            
            <p className="text-lg text-gray-300 font-medium max-w-xl leading-relaxed mb-10">
              Verixa is Canada's definitive marketplace for trusted RCICs. Claim your profile, verify your license, and instantly access thousands of high-intent search queries.
            </p>

            <Link href="/pricing" className="bg-[#2FA4A9] text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-white hover:text-[#0F2A44] transition-all shadow-xl flex items-center gap-3 w-full sm:w-max justify-center group/btn">
              Claim Your Profile
              <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
            </Link>
          </div>

          {/* Action Graphic (Right Side) */}
          <div className="hidden lg:flex relative z-10 shrink-0 w-[280px] h-[280px] rounded-full border border-white/10 items-center justify-center bg-gradient-to-br from-[#2FA4A9]/20 to-transparent shadow-2xl backdrop-blur-3xl group-hover:-translate-y-2 transition-transform duration-500">
            <div className="absolute inset-0 rounded-full border border-[#2FA4A9]/40 animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute inset-4 rounded-full border border-dashed border-[#2FA4A9]/40 animate-[spin_15s_linear_infinite_reverse]"></div>
            <Target className="w-24 h-24 text-[#2FA4A9] opacity-90 group-hover:scale-110 transition-transform duration-500" />
          </div>
        </div>

        {/* Master Grid Formatted cleanly to prevent huge gaps */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 mb-16">
          
          {/* LEFT: Brand Card (Col-Span-4) */}
          <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex-1 relative overflow-hidden flex flex-col justify-between group transition-shadow duration-500 hover:shadow-xl hover:shadow-gray-200/50 min-h-[360px]">
            {/* Background Faint Shield */}
            <div className="absolute -right-12 -bottom-12 text-gray-50 opacity-60 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-1000 ease-out pointer-events-none">
              <Shield className="w-72 h-72" strokeWidth={0.5} />
            </div>
            
            <div className="relative z-10 w-full hover:cursor-default">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-[#0F2A44] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0F2A44]/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-black text-[#0F2A44] tracking-tight">VERIXA</span>
              </div>
              
              <h3 className="text-2xl font-medium text-[#0F2A44] leading-snug mb-4 max-w-[280px]">
                Redefining trust in the <span className="text-[#2FA4A9] italic font-serif">immigration landscape.</span>
              </h3>
              
              <p className="text-sm font-medium text-gray-500 leading-relaxed mb-10 max-w-[300px]">
                The premier digital infrastructure connecting aspiring Canadians globally with verified, licensed immigration consultants through a secure, transparent marketplace.
              </p>
            </div>

            <div className="flex gap-3 relative z-10 mt-auto pt-6 border-t border-gray-100">
               <SocialIcon icon={<Linkedin className="w-4 h-4" />} href="https://linkedin.com" />
               <SocialIcon icon={<Twitter className="w-4 h-4" />} href="https://twitter.com" />
               <SocialIcon icon={<Send className="w-4 h-4" />} href="https://telegram.org" />
            </div>
          </div>

          {/* RIGHT: Navigation Grid (Col-Span-8) */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
             
             {/* REGISTRY */}
             <div>
               <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2FA4A9] mb-8 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#2FA4A9]"></span>
                 Registry
               </h4>
               <ul className="space-y-4">
                 <li><FooterLink href="/search" label="Find RCICs" /></li>
                 <li><FooterLink href="/pricing" label="Membership" badge="NEW" /></li>
                 <li><FooterLink href="/login" label="Partner Portal" /></li>
                 <li><FooterLink href="/refund-policy" label="Booking Rules" /></li>
               </ul>
             </div>

             {/* KNOWLEDGE */}
             <div>
               <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2FA4A9] mb-8 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#2FA4A9]"></span>
                 Knowledge
               </h4>
               <ul className="space-y-4">
                 <li><FooterLink href="/blog" label="The Journal" /></li>
                 <li><FooterLink href="/search?city=Toronto" label="Regional Guides" /></li>
                 <li><FooterLink href="/faq" label="Help Center" /></li>
                 <li><FooterLink href="/contact" label="Get in Touch" /></li>
               </ul>
             </div>

             {/* SECURITY (Dark Panel to capture attention) */}
             <div className="col-span-2 md:col-span-1 bg-[#0F2A44] rounded-[2rem] p-8 relative overflow-hidden group shadow-lg">
               {/* Decorative Background */}
               <div className="absolute right-0 bottom-0 w-32 h-32 bg-[#2FA4A9] rounded-tl-[6rem] opacity-20 transition-transform duration-500 group-hover:scale-110 pointer-events-none"></div>

               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2FA4A9] mb-4 flex items-center gap-2">
                 <Shield className="w-3 h-3" /> Security & Trust
               </h4>
               <p className="text-[13px] text-gray-300 mb-6 max-w-[200px] leading-relaxed">
                 Review our comprehensive protocols designed to eliminate legal friction.
               </p>
               
               <ul className="space-y-4 relative z-10 w-full">
                 <li><FooterLink href="/privacy" label="Data Privacy" dark /></li>
                 <li><FooterLink href="/terms" label="Platform Terms" dark /></li>
                 <li><FooterLink href="/consultant-agreement" label="Consultant Protocol" dark /></li>
                 <li><FooterLink href="/refund-policy" label="Financial Escrow" dark /></li>
               </ul>
             </div>

          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm text-[10px] font-black uppercase tracking-widest text-[#0F2A44]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FA4A9] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FA4A9]"></span>
              </span>
              System Status: <span className="text-[#2FA4A9]">CICC Synced</span>
            </div>
            <div className="hidden md:block h-4 w-px bg-gray-300"></div>
            <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
              © {new Date().getFullYear()} Verixa Technologies Inc.
            </div>
          </div>
          
          <button 
            onClick={scrollToTop} 
            className="text-[10px] font-black text-[#0F2A44] uppercase tracking-widest flex items-center gap-2 hover:text-[#2FA4A9] transition-colors group bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm"
          >
            Back to top <ArrowUpRight className="w-3 h-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon, href }: { icon: React.ReactNode, href: string }) {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noreferrer"
      className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#0F2A44] hover:bg-[#F8FAFC] hover:border-[#0F2A44] transition-all cursor-pointer shadow-sm hover:scale-110"
    >
      {icon}
    </a>
  )
}

function FooterLink({ href, label, dark = false, badge }: { href: string; label: string, dark?: boolean, badge?: string }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <Link 
        href={href} 
        className={`text-sm font-bold transition-colors inline-flex items-center gap-1.5 group/link whitespace-nowrap ${
          dark 
            ? 'text-gray-300 hover:text-white' 
            : 'text-gray-600 hover:text-[#0F2A44]'
        }`}
      >
        <ArrowUpRight className={`w-3 h-3 opacity-0 -translate-x-2 translate-y-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 group-hover/link:translate-y-0 transition-all ${dark ? 'text-[#2FA4A9]' : 'text-[#2FA4A9]'}`} />
        {label}
      </Link>
      {badge && (
        <span className="text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-600 px-1.5 py-0.5 rounded-sm">
          {badge}
        </span>
      )}
    </div>
  )
}