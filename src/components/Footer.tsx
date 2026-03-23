"use client";

import Link from "next/link";
import { Shield, Linkedin, Twitter, Send, ArrowUpRight } from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#F9FAFB] pt-20 pb-8 border-t border-gray-200 selection:bg-[#2FA4A9] selection:text-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 mb-16">
          
          {/* LEFT: Brand Card (Exact Match to Reference) */}
          <div className="bg-white rounded-[2.5rem] p-10 lg:p-14 shadow-sm border border-gray-100 flex-1 relative overflow-hidden flex flex-col justify-between min-h-[320px]">
            {/* Background Faint Shield */}
            <div className="absolute -right-12 -top-12 text-gray-50 opacity-60">
              <Shield className="w-80 h-80" strokeWidth={0.5} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-12 h-12 bg-[#0F2A44] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0F2A44]/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-black text-[#0F2A44] tracking-tight">VERIXA</span>
              </div>
              
              <h3 className="text-2xl lg:text-3xl font-medium text-[#0F2A44] leading-snug mb-12 max-w-sm">
                Redefining trust in the <br />
                <span className="text-[#2FA4A9] italic font-serif">immigration landscape.</span>
              </h3>
            </div>

            <div className="flex gap-4 relative z-10">
               <SocialIcon icon={<Linkedin className="w-5 h-5" />} href="https://linkedin.com" />
               <SocialIcon icon={<Twitter className="w-5 h-5" />} href="https://twitter.com" />
               <SocialIcon icon={<Send className="w-5 h-5" />} href="https://telegram.org" />
            </div>
          </div>

          {/* RIGHT: Navigation Grid */}
          <div className="flex-[1.5] grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12 py-6">
             
             {/* REGISTRY */}
             <div>
               <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2FA4A9] mb-8">Registry</h4>
               <ul className="space-y-5">
                 <li><FooterLink href="/search" label="Find RCICs" /></li>
                 <li><FooterLink href="/pricing" label="Membership" /></li>
                 <li><FooterLink href="/login" label="Partner Portal" /></li>
                 <li><FooterLink href="/refund-policy" label="Booking Rules" /></li>
               </ul>
             </div>

             {/* KNOWLEDGE */}
             <div>
               <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2FA4A9] mb-8">Knowledge</h4>
               <ul className="space-y-5">
                 <li><FooterLink href="/blog" label="The Journal" /></li>
                 <li><FooterLink href="/search?city=Toronto" label="Location Guides" /></li>
                 <li><FooterLink href="/faq" label="Help Center" /></li>
                 <li><FooterLink href="/contact" label="Get in Touch" /></li>
               </ul>
             </div>

             {/* SECURITY (Financial & Legal Master Block) */}
             <div>
               <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2FA4A9] mb-8">Security</h4>
               <ul className="space-y-5">
                 <li><FooterLink href="/privacy" label="Data Privacy" /></li>
                 <li><FooterLink href="/terms" label="Platform Terms" /></li>
                 <li><FooterLink href="/consultant-agreement" label="Consultant Agreement" /></li>
                 <li><FooterLink href="/refund-policy" label="Refund & Cancellation" /></li>
               </ul>
             </div>

          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
            System Status: <span className="text-[#2FA4A9]">CICC Synced</span>
          </div>
          <div className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">
            © {new Date().getFullYear()} Verixa Technologies Inc.
          </div>
          <button 
            onClick={scrollToTop} 
            className="text-[11px] font-black text-[#0F2A44] uppercase tracking-widest flex items-center gap-2 hover:text-[#2FA4A9] transition-colors group"
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
      className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#0F2A44] hover:border-[#0F2A44] transition-all cursor-pointer bg-white shadow-sm"
    >
      {icon}
    </a>
  )
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-[15px] font-bold text-gray-500 hover:text-[#0F2A44] transition-colors inline-block tracking-tight">
      {label}
    </Link>
  )
}