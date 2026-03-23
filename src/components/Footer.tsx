import Link from "next/link";
import { Linkedin, Twitter, Send, ArrowUpRight, ShieldCheck } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 pt-24 pb-12 px-6 lg:px-12 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <div className="grid grid-cols-12 gap-y-16 lg:gap-x-12 pb-20">
          
          {/* SECTION 1: THE ANCHOR (Brand & Mission) */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="space-y-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0F2A44] rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tighter uppercase text-[#0F2A44]">Verixa</span>
              </Link>
              <p className="text-base text-gray-500 leading-relaxed max-w-sm font-medium">
                The most trusted bridge between <span className="text-[#0F2A44] font-bold">future immigrants</span> and verified Canadian legal expertise. 
              </p>
            </div>
            
            {/* Newsletter or Small Badge */}
            <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 inline-block">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Independent Platform</p>
              <p className="text-[10px] text-gray-400 leading-tight max-w-[240px]">
                Not affiliated with CICC or the Government of Canada.
              </p>
            </div>
          </div>

          {/* SECTION 2: LINKS GRID */}
          <div className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12">
              
              <FooterGroup title="Discover">
                <FooterLink href="/search" label="Search Registry" />
                <FooterLink href="/search?city=Toronto" label="Toronto Experts" />
                <FooterLink href="/search?language=English" label="Multi-lingual" />
                <FooterLink href="/search?q=Express" label="Express Entry" />
              </FooterGroup>

              <FooterGroup title="Resources">
                <FooterLink href="/blog" label="The Blog" />
                <FooterLink href="/blog/category/GUIDES" label="Step-by-Step" />
                <FooterLink href="/blog/category/NEWS" label="Policy Updates" />
                <FooterLink href="/faq" label="Common Questions" />
              </FooterGroup>

              <FooterGroup title="For RCICs">
                <FooterLink href="/search" label="Verify Profile" highlight />
                <FooterLink href="/pricing" label="Membership" />
                <FooterLink href="/login" label="Partner Desk" />
                <FooterLink href="/consultant-agreement" label="Consultant Agreement" />
                <FooterLink href="/contact" label="Support" />
              </FooterGroup>

              <FooterGroup title="Legal">
                <FooterLink href="/terms" label="Terms" />
                <FooterLink href="/privacy" label="Privacy" />
                <FooterLink href="/consultant-agreement" label="Consultant Agreement" />
                <FooterLink href="/disclaimer" label="Disclaimer" />
                <FooterLink href="/contact" label="Contact" />
              </FooterGroup>

            </div>
          </div>
        </div>

        {/* BOTTOM BAR: Minimalist & Clean */}
        <div className="pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
          
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-[#0F2A44]/40">© {currentYear} VERIXA.</span>
            <div className="hidden md:block h-4 w-px bg-gray-200"></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Built for the next generation of Canadians</p>
          </div>

          {/* SOCIALS - Discrete and Modern */}
          <div className="flex items-center gap-3">
            <SocialBox href="https://linkedin.com" icon={<Linkedin className="w-4 h-4" />} />
            <SocialBox href="https://twitter.com" icon={<Twitter className="w-4 h-4" />} />
            <SocialBox href="https://telegram.org" icon={<Send className="w-4 h-4" />} />
          </div>
          
        </div>
      </div>
    </footer>
  );
}

// --- Helper Components for Clean Code ---

function FooterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0F2A44] border-l-2 border-[#2FA4A9] pl-3">
        {title}
      </h4>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

function FooterLink({ href, label, highlight = false }: { href: string; label: string; highlight?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`text-sm font-bold transition-all flex items-center gap-1 group w-fit
        ${highlight ? 'text-[#2FA4A9] hover:text-[#0F2A44]' : 'text-gray-400 hover:text-[#0F2A44]'}`}
    >
      {label}
      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all" />
    </Link>
  );
}

function SocialBox({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noreferrer" 
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:bg-[#0F2A44] hover:text-white hover:border-[#0F2A44] transition-all duration-300"
    >
      {icon}
    </a>
  );
}