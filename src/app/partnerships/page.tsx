import React from "react";
import Link from "next/link";
import {
  Handshake,
  Target,
  MapPin,
  Briefcase,
  Presentation,
  Search,
  ShieldCheck,
  Users,
  CheckCircle2,
  Mail,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Globe,
  Rocket
} from "lucide-react";

export const metadata = {
  title: "Strategic Partnerships | AshaVid",
  description: "Support your clients beyond immigration. AshaVid helps immigration professionals provide business and entrepreneurial support to clients across Canada.",
};

export default function PartnershipsPage() {
  return (
    <div className="min-h-screen bg-[#060D14] text-white selection:bg-[#2FA4A9] selection:text-white font-sans overflow-x-hidden">

      {/* ─── NAVBAR (Simple for Landing Page) ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#060D14]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2FA4A9] to-blue-600 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">AshaVid</span>
          </div>
          <a
            href="mailto:partnerships@ashavid.com"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            partnerships@ashavid.com
          </a>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-40 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#2FA4A9]/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#2FA4A9] text-sm font-semibold tracking-wide mb-8">
            <SparklesIcon className="w-4 h-4" />
            Strategic Partnership Opportunities
          </div>

          <h1 className="text-5xl lg:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
            Support Your Clients <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2FA4A9] to-blue-500">
              Beyond Immigration.
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            AshaVid helps immigration consultants and law firms provide business and entrepreneurial support to clients pursuing employment-based and entrepreneur pathways across Canada.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:partnerships@ashavid.com"
              className="group flex items-center gap-2 bg-[#2FA4A9] hover:bg-[#258b90] text-white px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 shadow-[0_0_40px_rgba(47,164,169,0.3)]"
            >
              Schedule a Partnership Call
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#opportunities"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl font-bold transition-all"
            >
              View Opportunities
            </a>
          </div>
        </div>
      </section>

      {/* ─── OUR ROLE ─── */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12">Our Role is Simple:</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#0A1622] p-8 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-[#2FA4A9]/30 transition-colors">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Briefcase className="w-24 h-24 text-white" />
              </div>
              <div className="relative z-10 text-left">
                <h3 className="text-2xl font-black text-gray-400 mb-4">You Focus On</h3>
                <p className="text-3xl font-medium text-white">Immigration Representation.</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2FA4A9]/10 to-[#0A1622] p-8 rounded-3xl border border-[#2FA4A9]/20 relative overflow-hidden group hover:border-[#2FA4A9]/50 transition-colors">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Rocket className="w-24 h-24 text-[#2FA4A9]" />
              </div>
              <div className="relative z-10 text-left">
                <h3 className="text-2xl font-black text-[#2FA4A9] mb-4">We Support</h3>
                <p className="text-3xl font-medium text-white">The Business & Entrepreneurial Journey.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY PARTNER ─── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6">Why Partner With AshaVid?</h2>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Many immigration pathways require more than immigration expertise. Clients often need business validation, market research, and entrepreneurial readiness—services that fall outside the traditional scope of immigration representation. <strong className="text-white">AshaVid helps fill that gap.</strong>
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Business validation", "Market research",
                  "Entrepreneurial readiness", "Business planning",
                  "Pitch deck preparation", "Ecosystem introductions",
                  "Entrepreneurship training", "Canadian business guidance"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#2FA4A9] shrink-0" />
                    <span className="text-gray-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Element */}
            <div className="relative h-[500px] rounded-3xl bg-[#0A1622] border border-white/5 overflow-hidden flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#2FA4A9]/10 to-transparent" />
              <div className="grid grid-cols-2 gap-4 w-full h-full relative z-10">
                <div className="bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col justify-end transform hover:-translate-y-2 transition-transform duration-500">
                  <Target className="w-8 h-8 text-[#2FA4A9] mb-4" />
                  <h4 className="font-bold">Market Validation</h4>
                </div>
                <div className="bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col justify-end transform hover:-translate-y-2 transition-transform duration-500 translate-y-8">
                  <TrendingUp className="w-8 h-8 text-blue-400 mb-4" />
                  <h4 className="font-bold">Business Planning</h4>
                </div>
                <div className="bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col justify-end transform hover:-translate-y-2 transition-transform duration-500 -translate-y-4">
                  <Users className="w-8 h-8 text-purple-400 mb-4" />
                  <h4 className="font-bold">Ecosystem Access</h4>
                </div>
                <div className="bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col justify-end transform hover:-translate-y-2 transition-transform duration-500 translate-y-4">
                  <Presentation className="w-8 h-8 text-emerald-400 mb-4" />
                  <h4 className="font-bold">Pitch Prep</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── OPPORTUNITIES ─── */}
      <section id="opportunities" className="py-24 px-6 bg-[#0A1622] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Partnership Opportunities</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We offer structured support pipelines tailored to specific provincial and federal immigration pathways.
            </p>
          </div>

          <div className="space-y-12">
            {/* OPP #1 */}
            <div className="bg-[#060D14] rounded-3xl p-8 lg:p-12 border border-white/5 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-blue-900/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 text-blue-400 font-bold tracking-wide text-sm uppercase mb-4">
                <span>Opportunity #1</span>
              </div>
              <h3 className="text-3xl font-black mb-6">ECE New Brunswick Pathway Support</h3>
              <p className="text-gray-400 mb-8 max-w-3xl leading-relaxed">
                For candidates pursuing employment-based opportunities in New Brunswick, our team provides support services designed to improve readiness and preparation.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: "Employment Readiness", icon: <Briefcase /> },
                  { title: "Business Communication", icon: <MessageIcon /> },
                  { title: "Workplace Orientation", icon: <MapPin /> },
                  { title: "Settlement Support", icon: <Handshake /> },
                  { title: "Career Planning", icon: <Target /> },
                  { title: "Coaching & Mentoring", icon: <Users /> }
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-blue-400 shrink-0 [&>svg]:w-5 [&>svg]:h-5">{s.icon}</div>
                    <span className="font-medium text-sm">{s.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OPP #2 */}
            <div className="bg-[#060D14] rounded-3xl p-8 lg:p-12 border border-white/5 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-[#2FA4A9]/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 text-[#2FA4A9] font-bold tracking-wide text-sm uppercase mb-4">
                <span>Opportunity #2</span>
              </div>
              <h3 className="text-3xl font-black mb-6">Entrepreneur Immigration Programs</h3>
              <p className="text-gray-400 mb-8 max-w-3xl leading-relaxed">
                We support entrepreneurs exploring provincial entrepreneur streams and business-focused immigration pathways across Canada.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <ServiceBlock
                  icon={<Search />}
                  title="Business Concept Validation"
                  desc="Evaluate whether a business idea aligns with Canadian market realities."
                />
                <ServiceBlock
                  icon={<Globe />}
                  title="Market Research"
                  desc="Industry analysis, customer research, and market opportunity assessment."
                />
                <ServiceBlock
                  icon={<Target />}
                  title="Business Plan Development"
                  desc="Professional business plans designed for entrepreneur programs and investment discussions."
                />
                <ServiceBlock
                  icon={<Presentation />}
                  title="Pitch Deck Preparation"
                  desc="Clear and professional investor-style presentations."
                />
                <ServiceBlock
                  icon={<TrendingUp />}
                  title="Entrepreneur Readiness"
                  desc="Evaluate strengths, weaknesses, risks, and opportunities before application."
                />
                <ServiceBlock
                  icon={<Users />}
                  title="Ecosystem Connections"
                  desc="Introductions to accelerators, incubators, mentors, and business support organizations."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHO WE WORK WITH & WHY ─── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">

          {/* Who */}
          <div>
            <h2 className="text-3xl font-black mb-8">Who We Work With</h2>
            <div className="space-y-6">
              {[
                { title: "Immigration Consultants (RCICs)", desc: "Support your entrepreneur and business immigration clients." },
                { title: "Immigration Lawyers", desc: "Strengthen the business component of complex files." },
                { title: "International Entrepreneurs", desc: "Receive practical business guidance for entering the Canadian market." },
                { title: "Startup Founders", desc: "Validate opportunities and prepare for growth in Canada." }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                  <h4 className="text-lg font-bold text-white mb-2">{item.title}</h4>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Why */}
          <div>
            <h2 className="text-3xl font-black mb-8">Why Consultants Choose Us</h2>
            <div className="space-y-4">
              {[
                "Canadian-based team",
                "Entrepreneur-focused expertise",
                "Business planning and validation support",
                "Startup ecosystem knowledge",
                "Professional referral partnerships",
                "Clear separation from immigration representation"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-[#0A1622] border border-white/5 p-4 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-[#2FA4A9]/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[#2FA4A9]" />
                  </div>
                  <span className="font-medium text-gray-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPLIANCE BANNER ─── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 p-8 md:p-12 rounded-r-3xl relative overflow-hidden">
          <ShieldCheck className="absolute -right-10 -bottom-10 w-64 h-64 text-amber-500/10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-amber-500 mb-6 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6" /> Compliance First
            </h2>
            <div className="space-y-4 text-gray-300 text-lg">
              <p>
                <strong className="text-white">AshaVid is not an immigration consulting firm.</strong>
              </p>
              <p>
                We do not provide immigration advice, legal advice, or immigration representation. Licensed immigration professionals remain responsible for all immigration-related services.
              </p>
              <p>
                Our role is strictly limited to business support, entrepreneurial development, market validation, and ecosystem engagement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA FOOTER ─── */}
      <section className="py-24 px-6 border-t border-white/5 bg-[#0A1622] text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-[#2FA4A9]/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6">Let&apos;s Explore a Partnership</h2>
          <p className="text-xl text-gray-400 mb-10">
            Whether you are supporting entrepreneur applicants, startup founders, or business-focused newcomers, we would be happy to discuss how we can support your clients.
          </p>

          <a
            href="mailto:partnerships@ashavid.com"
            className="inline-flex items-center gap-3 bg-white text-[#060D14] px-10 py-5 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-xl mb-12"
          >
            <Mail className="w-5 h-5" />
            Book a Partnership Meeting
          </a>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm font-medium text-gray-500">
            <a href="mailto:farjad@ashavid.com" className="flex items-center gap-2 hover:text-[#2FA4A9] transition-colors">
              <Mail className="w-4 h-4" /> farjad@ashavid.com
            </a>
            <a href="https://www.ashavid.ca" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#2FA4A9] transition-colors">
              <Globe className="w-4 h-4" /> www.ashavid.ca
            </a>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM BRANDING ─── */}
      <footer className="py-6 text-center text-xs font-semibold text-gray-600 border-t border-white/5">
        <a href="https://www.getverixa.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#2FA4A9] transition-colors flex items-center justify-center gap-1">
          www.getverixa.com <span className="opacity-50 font-normal">(powered by ashavid)</span>
        </a>
      </footer>

    </div>
  );
}

// ─── HELPER COMPONENTS ───

function ServiceBlock({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#2FA4A9]">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}

function MessageIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
