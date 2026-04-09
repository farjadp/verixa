"use client";

import Link from "next/link";
import { Shield, Linkedin, Twitter, Send, ArrowUpRight, CheckCircle2, Target } from "lucide-react";

import { usePlatformSettings } from "@/components/providers/PlatformProvider";

const FOOTER_LINKS = {
  registry: [
    { label: "Find RCICs", href: "/search" },
    { label: "Browse by City", href: "/search?city=Toronto" },
    { label: "Browse by Specialty", href: "/search?q=Express+Entry" },
    { label: "Newly Verified", href: "/search?sort=newest" },
  ],
  intelligence: [
    { label: "Immigration Journal", href: "/blog" },
    { label: "Immigration Guides", href: "/blog/category/immigration-guides" },
    { label: "Help Center / FAQ", href: "/faq" },
    { label: "CRS Calculator", href: "/tools/crs-calculator", badge: "Soon" },
  ],
  professionals: [
    { label: "Claim Your Profile", href: "/claim" },
    { label: "Platform Features", href: "/pricing#features" },
    { label: "Plans & Pricing", href: "/pricing" },
    { label: "Partner Dashboard", href: "/dashboard" },
  ],
  company: [
    { label: "About Verixa", href: "/about" },
    { label: "Our Mission", href: "/about#mission" },
    { label: "Contact Us", href: "/contact" },
    { label: "Careers", href: "/careers" },
  ],
  legal: [
    { label: "Data Privacy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Consultant Agreement", href: "/consultant-agreement" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
};

export default function Footer() {
  const settings = usePlatformSettings();
  const logoImage = "/api/assets/logo?type=footer";
  const siteName = settings?.siteName || "Verixa";
  
  return (
    <footer className="bg-[#F8FAFC] pb-8 pt-12 border-t border-gray-200 selection:bg-[#2FA4A9] selection:text-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        {/* ── CTA BANNER ── */}
        <div className="bg-[#0F2A44] rounded-[2.5rem] p-10 lg:p-14 mb-20 flex flex-col lg:flex-row items-center justify-between shadow-2xl shadow-[#0F2A44]/20 relative overflow-hidden group">
          <div className="absolute right-0 top-0 bottom-0 w-[60%] bg-gradient-to-l from-[#2FA4A9]/20 to-transparent pointer-events-none mix-blend-screen" />

          <div className="relative z-10 max-w-2xl text-left w-full">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest mb-8 text-[#2FA4A9] border border-white/5">
              <CheckCircle2 className="w-4 h-4" /> For Immigration Professionals
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 font-serif leading-tight">
              Stop fighting algorithms.<br />Start booking clients.
            </h2>
            <p className="text-lg text-gray-300 font-medium max-w-xl leading-relaxed mb-10">
              {siteName} is Canada's definitive marketplace for trusted RCICs. Claim your profile, verify your license, and instantly access thousands of high-intent search queries.
            </p>
            <Link
              href="/claim"
              className="bg-[#2FA4A9] text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-white hover:text-[#0F2A44] transition-all shadow-xl flex items-center gap-3 w-full sm:w-max justify-center group/btn"
            >
              Claim Your Profile
              <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          <div className="hidden lg:flex relative z-10 shrink-0 w-[280px] h-[280px] rounded-full border border-white/10 items-center justify-center bg-gradient-to-br from-[#2FA4A9]/20 to-transparent shadow-2xl backdrop-blur-3xl group-hover:-translate-y-2 transition-transform duration-500">
            <div className="absolute inset-0 rounded-full border border-[#2FA4A9]/40 animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border border-dashed border-[#2FA4A9]/40 animate-[spin_15s_linear_infinite_reverse]" />
            <Target className="w-24 h-24 text-[#2FA4A9] opacity-90" />
          </div>
        </div>

        {/* ── MAIN FOOTER GRID ── */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 mb-16">

          {/* Brand Card */}
          <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex flex-col justify-between group transition-shadow duration-500 hover:shadow-xl hover:shadow-gray-200/50 min-h-[320px] relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 text-gray-50 opacity-60 group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
              <Shield className="w-64 h-64" strokeWidth={0.5} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <img src={logoImage} alt={siteName} className="h-10 w-auto object-contain" />
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">
                The premier verified directory for Canadian immigration professionals. Connecting applicants with licensed RCICs through a secure, transparent platform.
              </p>
            </div>
            <div className="flex gap-3 relative z-10 mt-8 pt-6 border-t border-gray-100">
              <SocialIcon icon={<Linkedin className="w-4 h-4" />} href="https://linkedin.com" />
              <SocialIcon icon={<Twitter className="w-4 h-4" />} href="https://twitter.com" />
              <SocialIcon icon={<Send className="w-4 h-4" />} href="https://telegram.org" />
            </div>
          </div>

          {/* Link Columns */}
          <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-5 gap-8">
            <FooterColumn title="Registry" links={FOOTER_LINKS.registry} />
            <FooterColumn title="Intelligence" links={FOOTER_LINKS.intelligence} />
            <FooterColumn title="For Professionals" links={FOOTER_LINKS.professionals} />
            <FooterColumn title="Company" links={FOOTER_LINKS.company} />

            {/* Legal – Dark Panel */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                Legal
              </h4>
              <ul className="space-y-3">
                {FOOTER_LINKS.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-semibold text-gray-400 hover:text-[#0F2A44] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm text-[10px] font-black uppercase tracking-widest text-[#0F2A44]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FA4A9] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FA4A9]" />
              </span>
              CICC Sync: <span className="text-[#2FA4A9] ml-1">Live</span>
            </div>
            <div className="hidden md:block h-4 w-px bg-gray-300" />
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
              © {new Date().getFullYear()} Verixa Technologies Inc. All rights reserved.
            </p>
          </div>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            Not affiliated with IRCC or the Government of Canada.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; badge?: string }[];
}) {
  return (
    <div>
      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2FA4A9] mb-6 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2FA4A9]" />
        {title}
      </h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href} className="flex items-center gap-2">
            <Link
              href={link.href}
              className="text-sm font-semibold text-gray-500 hover:text-[#0F2A44] transition-colors"
            >
              {link.label}
            </Link>
            {link.badge && (
              <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">
                {link.badge}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({ icon, href }: { icon: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#0F2A44] hover:bg-[#F8FAFC] hover:border-[#0F2A44] transition-all hover:scale-110"
    >
      {icon}
    </a>
  );
}