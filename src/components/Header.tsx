"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X, Search, Globe, Shield, Zap, ArrowRight, UserCircle2 } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // افکت برای تغییر استایل هدر هنگام اسکرول
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? "py-3 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm" : "py-5 bg-white border-b border-transparent"
    }`}>
      <nav className="px-6 lg:px-12 flex justify-between items-center max-w-[1440px] mx-auto font-sans">
        
        {/* --- LOGO --- */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-[#0F2A44] rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase text-[#0F2A44]">Verixa</span>
          </Link>
        </div>

        {/* --- DESKTOP NAVIGATION --- */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2">
          
          {/* 1. MEGA MENU: FIND CONSULTANTS */}
          <div className="relative group px-3 py-2">
            <button className="flex items-center gap-1 text-[13px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#0F2A44] transition-colors">
              Find Experts <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 hidden group-hover:block transition-all duration-300">
              <div className="bg-white shadow-[0_20px_70px_-10px_rgba(0,0,0,0.1)] rounded-[2rem] border border-gray-50 p-10 w-[800px] grid grid-cols-3 gap-10">
                <NavColumn title="By Region" icon={<Globe className="w-4 h-4 text-teal-500" />}>
                  <NavLink href="/search?city=Toronto" label="Toronto" />
                  <NavLink href="/search?city=Vancouver" label="Vancouver" />
                  <NavLink href="/search?city=Montreal" label="Montreal" />
                </NavColumn>
                
                <NavColumn title="Specialties" icon={<Zap className="w-4 h-4 text-amber-500" />}>
                  <NavLink href="/search?q=Express+Entry" label="Express Entry" />
                  <NavLink href="/search?q=Study+Permit" label="Study Permits" />
                  <NavLink href="/search?q=PR" label="Permanent Residency" />
                </NavColumn>

                <div className="bg-gray-50 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                  <p className="text-xs font-bold text-gray-400 leading-relaxed uppercase tracking-widest">Global Access</p>
                  <p className="text-sm font-medium text-gray-600">Browse verified profiles in 20+ languages across Canada.</p>
                  <Link href="/search" className="flex items-center justify-center gap-2 bg-[#0F2A44] text-white py-3 rounded-xl text-xs font-bold hover:bg-teal-700 transition-all">
                    All Consultants <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <HeaderSimpleLink href="/#how" label="Process" />
          <HeaderSimpleLink href="/blog" label="Resources" />
          <HeaderSimpleLink href="/pricing" label="Partners" />
          <HeaderSimpleLink href="/contact" label="Support" />
          
        </div>

        {/* --- AUTH & ACTION --- */}
        <div className="hidden lg:flex items-center gap-6">
          <Link href="/login" className="flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-[#0F2A44] transition-colors">
            <UserCircle2 className="w-5 h-5" /> Login
          </Link>
          <Link href="/search" className="bg-[#0F2A44] text-white px-8 py-3 rounded-full text-[13px] font-bold tracking-widest uppercase hover:bg-teal-700 shadow-xl shadow-[#0F2A44]/10 transition-all active:scale-95">
            Book Assessment
          </Link>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button className="lg:hidden p-2 text-[#0F2A44]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>

      </nav>

      {/* --- MOBILE OVERLAY --- */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[70px] bg-white z-40 p-8 flex flex-col gap-8 animate-in slide-in-from-right duration-300">
          <div className="space-y-6">
            <MobileNavLink href="/search" label="Find Consultants" />
            <MobileNavLink href="/#how" label="How it works" />
            <MobileNavLink href="/blog" label="Resources" />
            <MobileNavLink href="/pricing" label="For Consultants" />
          </div>
          <div className="mt-auto space-y-4">
            <Link href="/login" className="block w-full text-center py-4 font-bold text-gray-500 border border-gray-100 rounded-2xl">Login</Link>
            <Link href="/search" className="block w-full text-center py-4 font-bold bg-[#0F2A44] text-white rounded-2xl">Book Assessment</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// --- Helper Components ---

function HeaderSimpleLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#0F2A44] transition-all">
      {label}
    </Link>
  );
}

function NavColumn({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
        {icon}
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">{title}</h4>
      </div>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="text-sm font-bold text-gray-600 hover:text-[#0F2A44] hover:translate-x-1 transition-all flex items-center gap-2">
        {label}
      </Link>
    </li>
  );
}

function MobileNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block text-3xl font-bold tracking-tighter text-[#0F2A44] border-b border-gray-50 pb-4">
      {label}
    </Link>
  );
}