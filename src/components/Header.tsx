"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
      <nav className="px-6 lg:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto font-sans">
        
        {/* LOGO */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 z-10 transition-transform hover:scale-105">
            <img src="/Brand/Vertixa.png" alt="Verixa Logo" className="h-8 w-auto object-contain rounded-sm" />
            <span className="text-xl font-bold tracking-tighter uppercase font-serif text-[#0F2A44]">Verixa</span>
          </Link>
        </div>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-[14px] font-bold text-[#1A1F2B]">
          
          {/* 1. Find Consultants */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 hover:text-[#2FA4A9] transition-colors py-6 -my-6">
              Find Consultants <ChevronDown className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-[calc(100%+24px)] -left-4 hidden group-hover:block transition-all z-50">
              <div className="bg-white shadow-xl rounded-2xl border border-gray-100 p-8 w-[650px] grid grid-cols-3 gap-8">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#2FA4A9] mb-4 border-b border-gray-100 pb-2">By City</h4>
                  <ul className="space-y-3">
                    <li><Link href="/search?city=Toronto" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">Toronto</Link></li>
                    <li><Link href="/search?city=Vancouver" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">Vancouver</Link></li>
                    <li><Link href="/search?city=Montreal" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">Montreal</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#2FA4A9] mb-4 border-b border-gray-100 pb-2">By Language</h4>
                  <ul className="space-y-3">
                    <li><Link href="/search?language=English" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">English</Link></li>
                    <li><Link href="/search?language=Persian" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">Persian</Link></li>
                    <li><Link href="/search?language=Arabic" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">Arabic</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#2FA4A9] mb-4 border-b border-gray-100 pb-2">By Service</h4>
                  <ul className="space-y-3">
                    <li><Link href="/search?q=Express+Entry" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">Express Entry</Link></li>
                    <li><Link href="/search?q=Study+Permit" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">Study Permit</Link></li>
                    <li><Link href="/search?q=PR" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">PR</Link></li>
                    <li><Link href="/search?q=Work+Visa" className="text-gray-600 hover:text-[#0F2A44] font-medium transition flex items-center gap-2">Work Visa</Link></li>
                  </ul>
                </div>
                <div className="col-span-3 mt-2 pt-6 border-t border-gray-100">
                  <Link href="/search" className="text-[#0F2A44] font-bold flex items-center justify-between group/link bg-gray-50 hover:bg-gray-100 p-4 rounded-xl transition-colors">
                    Search All Immigration Consultants
                    <span className="group-hover/link:translate-x-1 transition-transform bg-white w-8 h-8 flex items-center justify-center rounded-full shadow-sm text-[#2FA4A9]">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 2. How It Works */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 hover:text-[#2FA4A9] transition-colors py-6 -my-6">
              How It Works <ChevronDown className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-[calc(100%+24px)] left-1/2 -translate-x-1/2 hidden group-hover:block transition-all z-50">
              <div className="bg-white shadow-xl rounded-2xl border border-gray-100 p-3 w-[240px] flex flex-col gap-1">
                <Link href="/#how" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">For Clients</Link>
                <Link href="/#consultants" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">For Consultants</Link>
                <Link href="/#booking" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Booking Process</Link>
                <Link href="/pricing" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Pricing & Fees</Link>
              </div>
            </div>
          </div>

          {/* 3. Resources */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 hover:text-[#2FA4A9] transition-colors py-6 -my-6">
              Resources <ChevronDown className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-[calc(100%+24px)] left-1/2 -translate-x-1/2 hidden group-hover:block transition-all z-50">
              <div className="bg-white shadow-xl rounded-2xl border border-gray-100 p-3 w-[240px] flex flex-col gap-1">
                <Link href="/blog" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Blog Main</Link>
                <Link href="/blog/category/GUIDES" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Immigration Guides</Link>
                <Link href="/blog/category/NEWS" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">News & Updates</Link>
                <Link href="/#faq" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">FAQs</Link>
              </div>
            </div>
          </div>

          {/* 4. Compare (Dropdown) */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 hover:text-[#2FA4A9] transition-colors py-6 -my-6">
              Compare <ChevronDown className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-[calc(100%+24px)] left-1/2 -translate-x-1/2 hidden group-hover:block transition-all z-50">
              <div className="bg-white shadow-xl rounded-2xl border border-gray-100 p-3 w-[240px] flex flex-col gap-1">
                <Link href="/search" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Compare Consultants</Link>
                <Link href="/dashboard/client/saved" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Saved Profiles</Link>
              </div>
            </div>
          </div>

          {/* 5. For Consultants */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 hover:text-[#2FA4A9] transition-colors py-6 -my-6">
              For Consultants <ChevronDown className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-[calc(100%+24px)] left-1/2 -translate-x-1/2 hidden group-hover:block transition-all z-50">
              <div className="bg-white shadow-xl rounded-2xl border border-gray-100 p-3 w-[260px] flex flex-col gap-1">
                <Link href="/search" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Claim Your Profile</Link>
                <Link href="/pricing" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Pricing Plans</Link>
                <Link href="/login" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Consultant Dashboard</Link>
                <Link href="/#growth" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Growth Tools</Link>
              </div>
            </div>
          </div>

          {/* 6. About */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 hover:text-[#2FA4A9] transition-colors py-6 -my-6">
              About <ChevronDown className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-[calc(100%+24px)] right-0 hidden group-hover:block transition-all z-50">
              <div className="bg-white shadow-xl rounded-2xl border border-gray-100 p-3 w-[220px] flex flex-col gap-1">
                <Link href="/#about" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">About Verixa</Link>
                <Link href="/#verify" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Trust & Verification</Link>
                <Link href="/contact" className="px-4 py-2.5 hover:bg-gray-50 rounded-lg text-gray-700 hover:text-[#0F2A44] font-medium transition">Contact</Link>
              </div>
            </div>
          </div>
          
        </div>

        {/* AUTH / CTA (RIGHT SIDE) */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-[#2FA4A9] transition-colors px-2">Login</Link>
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          <Link href="/register" className="text-sm font-bold text-gray-500 hover:text-[#2FA4A9] transition-colors px-2 pr-4">Sign Up</Link>
          <Link href="/search" className="bg-[#2FA4A9] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md shadow-[#2FA4A9]/20 hover:bg-[#258d92] transition-colors flex items-center gap-2 border border-transparent hover:border-[#2FA4A9]">
            🔥 Book a Consultation
          </Link>
        </div>

        {/* MOBILE TOGGLE */}
        <button className="lg:hidden text-[#0F2A44] p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

      </nav>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-[100%] left-0 w-full bg-white border-b border-gray-100 shadow-2xl flex flex-col h-[calc(100vh-73px)] overflow-y-auto z-40">
          <div className="p-6 flex flex-col gap-6">
            <Link href="/search" className="font-bold text-lg text-[#0F2A44] border-b border-gray-100 pb-4" onClick={() => setMobileMenuOpen(false)}>Find Consultants</Link>
            <Link href="/#how" className="font-bold text-lg text-[#0F2A44] border-b border-gray-100 pb-4" onClick={() => setMobileMenuOpen(false)}>How It Works</Link>
            <Link href="/blog" className="font-bold text-lg text-[#0F2A44] border-b border-gray-100 pb-4" onClick={() => setMobileMenuOpen(false)}>Resources</Link>
            <Link href="/search" className="font-bold text-lg text-[#0F2A44] border-b border-gray-100 pb-4" onClick={() => setMobileMenuOpen(false)}>Compare</Link>
            <Link href="/pricing" className="font-bold text-lg text-[#0F2A44] border-b border-gray-100 pb-4" onClick={() => setMobileMenuOpen(false)}>For Consultants</Link>
            <Link href="/#about" className="font-bold text-lg text-[#0F2A44] border-b border-gray-100 pb-4" onClick={() => setMobileMenuOpen(false)}>About</Link>
            
            <div className="flex flex-col gap-3 mt-4">
              <Link href="/login" className="text-center py-4 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link href="/register" className="text-center py-4 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
              <Link href="/search" className="text-center py-4 rounded-xl bg-[#2FA4A9] text-white font-bold shadow-md shadow-[#2FA4A9]/20" onClick={() => setMobileMenuOpen(false)}>🔥 Book a Consultation</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
