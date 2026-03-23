import Link from "next/link";
import { Linkedin, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 pt-20 pb-10 px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-10 xl:gap-8 border-b border-gray-100 pb-16">
        
        {/* BRAND COLUMN */}
        <div className="col-span-2 md:col-span-4 xl:col-span-2 flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-2">
             <img src="/Brand/Vertixa.png" alt="Verixa Logo" className="h-8 w-auto object-contain rounded-sm" />
             <span className="text-2xl font-black tracking-tighter uppercase font-serif text-[#0F2A44]">Verixa</span>
          </Link>
          <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
            Verixa is an independent directory and technology platform and is not affiliated with the College of Immigration and Citizenship Consultants (CICC) or the Government of Canada.
          </p>
        </div>

        {/* 1. Discover */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#0F2A44]">Discover</h4>
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-500">
            <Link href="/search" className="hover:text-[#2FA4A9] transition-colors">Search Consultants</Link>
            <Link href="/search?city=Toronto" className="hover:text-[#2FA4A9] transition-colors">By City</Link>
            <Link href="/search?language=English" className="hover:text-[#2FA4A9] transition-colors">By Language</Link>
            <Link href="/search?q=Express" className="hover:text-[#2FA4A9] transition-colors">By Service</Link>
          </div>
        </div>

        {/* 2. For Clients */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#0F2A44]">For Clients</h4>
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-500">
            <Link href="/#how" className="hover:text-[#2FA4A9] transition-colors">How It Works</Link>
            <Link href="/search" className="hover:text-[#2FA4A9] transition-colors">Compare Consultants</Link>
            <Link href="/#booking" className="hover:text-[#2FA4A9] transition-colors">Booking Guide</Link>
            <Link href="/#faq" className="hover:text-[#2FA4A9] transition-colors">FAQs</Link>
          </div>
        </div>

        {/* 3. For Consultants */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#0F2A44]">For Consultants</h4>
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-500">
            <Link href="/search" className="hover:text-[#2FA4A9] transition-colors">Claim Profile</Link>
            <Link href="/pricing" className="hover:text-[#2FA4A9] transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-[#2FA4A9] transition-colors">Dashboard Login</Link>
            <Link href="/contact" className="hover:text-[#2FA4A9] transition-colors">Help Center</Link>
          </div>
        </div>

        {/* 4. Resources */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#0F2A44]">Resources</h4>
          <div className="flex flex-col gap-3 text-sm font-medium text-gray-500">
            <Link href="/blog" className="hover:text-[#2FA4A9] transition-colors">Blog</Link>
            <Link href="/blog/category/GUIDES" className="hover:text-[#2FA4A9] transition-colors">Immigration Guides</Link>
            <Link href="/blog/category/NEWS" className="hover:text-[#2FA4A9] transition-colors">News</Link>
            <Link href="/blog" className="hover:text-[#2FA4A9] transition-colors">Updates</Link>
          </div>
        </div>

        {/* 5. Company & Legal */}
        <div className="col-span-2 md:col-span-4 xl:col-span-1 flex flex-col gap-8 xl:gap-4">
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#0F2A44]">Company</h4>
            <div className="flex flex-col gap-3 text-sm font-medium text-gray-500">
              <Link href="/#about" className="hover:text-[#2FA4A9] transition-colors">About</Link>
              <Link href="/contact" className="hover:text-[#2FA4A9] transition-colors">Contact</Link>
              <span className="text-gray-400">Careers (soon)</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 xl:mt-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#0F2A44]">Legal</h4>
            <div className="flex flex-col gap-3 text-sm font-medium text-gray-500">
              <Link href="/terms" className="hover:text-[#2FA4A9] transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-[#2FA4A9] transition-colors">Privacy Policy</Link>
              <Link href="/disclaimer" className="hover:text-[#2FA4A9] transition-colors">Disclaimer</Link>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM BAR */}
      <div className="max-w-7xl mx-auto pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-sm text-gray-400 font-medium">
          © {new Date().getFullYear()} Verixa
          <span className="hidden md:inline mx-2 text-gray-300">|</span>
          <span className="block md:inline mt-1 md:mt-0">Find verified immigration consultants in Canada</span>
        </div>
        
        {/* Social Links */}
        <div className="flex items-center gap-4 text-gray-400">
           <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-[#2FA4A9] transition-colors"><Linkedin className="w-5 h-5" /></a>
           <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-[#2FA4A9] transition-colors"><Twitter className="w-5 h-5" /></a>
           <a href="https://telegram.org" target="_blank" rel="noreferrer" className="hover:text-[#2FA4A9] transition-colors">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.96-.63-.34-.98.22-1.56.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.21 3.46-.49.34-.94.5-1.35.49-.44-.01-1.29-.25-1.92-.45-.77-.25-1.38-.38-1.33-.8.03-.22.34-.44.93-.68 3.65-1.59 6.09-2.64 7.33-3.15 3.48-1.45 4.2-1.7 4.67-1.71.1 0 .33.02.48.14.12.1.16.23.18.33.01.07.03.22.02.39z"/></svg>
           </a>
        </div>
      </div>
    </footer>
  );
}
