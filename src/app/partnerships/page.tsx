import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import React from "react";
import Image from "next/image";
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
  ChevronRight,
  TrendingUp,
  Globe,
  Rocket,
  MessageSquare,
} from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Strategic Partnerships with AshaVid",
  description:
    "Support your clients beyond immigration. AshaVid helps immigration professionals provide business and entrepreneurial support to clients across Canada.",
  path: "/partnerships",
});

const ROLE_ITEMS = [
  "Business validation", "Market research",
  "Entrepreneurial readiness", "Business planning",
  "Pitch deck preparation", "Ecosystem introductions",
  "Entrepreneurship training", "Canadian business guidance",
];

const ECE_SERVICES = [
  { title: "Employment readiness", icon: <Briefcase /> },
  { title: "Business communication", icon: <MessageSquare /> },
  { title: "Workplace orientation", icon: <MapPin /> },
  { title: "Settlement support", icon: <Handshake /> },
  { title: "Career planning", icon: <Target /> },
  { title: "Coaching & mentoring", icon: <Users /> },
];

const PARTNER_TYPES = [
  { title: "Immigration consultants (RCICs)", desc: "Support your entrepreneur and business immigration clients." },
  { title: "Immigration lawyers", desc: "Strengthen the business component of complex files." },
  { title: "International entrepreneurs", desc: "Receive practical business guidance for entering the Canadian market." },
  { title: "Startup founders", desc: "Validate opportunities and prepare for growth in Canada." },
];

const REASONS = [
  "Canadian-based team",
  "Entrepreneur-focused expertise",
  "Business planning and validation support",
  "Startup ecosystem knowledge",
  "Professional referral partnerships",
  "Clear separation from immigration representation",
];

const primaryCta =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-teal px-7 text-lg font-bold text-white transition-colors hover:bg-navy";
const secondaryCta =
  "inline-flex min-h-14 items-center justify-center rounded-2xl border border-gray-200 bg-white px-7 text-lg font-bold text-navy transition-colors hover:border-navy";

export default function PartnershipsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-ink">
      {/* ─── NAVBAR (simple, landing page) ─── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-xl" aria-label="AshaVid">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:h-20 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white">
              <Handshake className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-bold tracking-tight text-navy">AshaVid</span>
          </div>
          <a
            href="mailto:partnerships@ashavid.com"
            className="hidden text-sm font-semibold text-gray-600 transition-colors hover:text-navy sm:inline"
          >
            partnerships@ashavid.com
          </a>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-32 lg:px-8 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-mist px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy">
              <span className="h-2 w-2 rounded-full bg-teal" aria-hidden="true" />
              Strategic partnership opportunities
            </span>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-navy sm:text-5xl md:text-6xl">
              Support your clients <span className="text-teal">beyond immigration.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl">
              AshaVid helps immigration consultants and law firms provide business and entrepreneurial support to clients
              pursuing employment-based and entrepreneur pathways across Canada.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="mailto:partnerships@ashavid.com" className={primaryCta}>
                Schedule a partnership call
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </a>
              <a href="#opportunities" className={secondaryCta}>
                View opportunities
              </a>
            </div>
          </div>
          <div className="relative lg:col-span-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-mist shadow-2xl shadow-navy/15 lg:aspect-[4/5]">
              <Image
                src="/images/home/route-work.jpg"
                alt="A founder presenting to a small team in an open-plan office"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── OUR ROLE ─── */}
      <section className="border-y border-gray-200 bg-mist py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold tracking-tight text-navy md:text-4xl">Our role is simple</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-navy">
                <Briefcase className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">You focus on</p>
              <p className="text-2xl font-bold text-navy">Immigration representation.</p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-navy to-teal p-8 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                <Rocket className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-lightteal">We support</p>
              <p className="text-2xl font-bold text-white">The business and entrepreneurial journey.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY PARTNER ─── */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Why partner with AshaVid</span>
            <h2 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">The business side of the file</h2>
            <p className="text-lg leading-relaxed text-gray-600">
              Many immigration pathways require more than immigration expertise. Clients often need business validation,
              market research, and entrepreneurial readiness—services that fall outside the traditional scope of
              immigration representation. <strong className="text-ink">AshaVid helps fill that gap.</strong>
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
            {ROLE_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
                <span className="font-semibold text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── OPPORTUNITIES ─── */}
      <section id="opportunities" className="border-y border-gray-200 bg-mist py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 flex max-w-3xl flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Partnership opportunities</span>
            <h2 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">Structured support by pathway</h2>
            <p className="text-lg text-gray-600">
              We offer structured support pipelines tailored to specific provincial and federal immigration pathways.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <article className="rounded-2xl border border-gray-200 bg-white p-6 md:p-10">
              <p className="text-xs font-bold uppercase tracking-wider text-teal">Opportunity 01</p>
              <h3 className="mt-2 text-2xl font-bold text-navy md:text-3xl">ECE New Brunswick pathway support</h3>
              <p className="mt-3 max-w-3xl leading-relaxed text-gray-600">
                For candidates pursuing employment-based opportunities in New Brunswick, our team provides support services
                designed to improve readiness and preparation.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ECE_SERVICES.map((s) => (
                  <li key={s.title} className="flex items-center gap-3 rounded-xl bg-mist p-4">
                    <span className="shrink-0 text-navy [&>svg]:h-5 [&>svg]:w-5" aria-hidden="true">{s.icon}</span>
                    <span className="text-sm font-semibold text-ink">{s.title}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-6 md:p-10">
              <p className="text-xs font-bold uppercase tracking-wider text-teal">Opportunity 02</p>
              <h3 className="mt-2 text-2xl font-bold text-navy md:text-3xl">Entrepreneur immigration programs</h3>
              <p className="mt-3 max-w-3xl leading-relaxed text-gray-600">
                We support entrepreneurs exploring provincial entrepreneur streams and business-focused immigration pathways
                across Canada.
              </p>
              <div className="mt-8 grid gap-8 md:grid-cols-2">
                <ServiceBlock icon={<Search />} title="Business concept validation" desc="Evaluate whether a business idea aligns with Canadian market realities." />
                <ServiceBlock icon={<Globe />} title="Market research" desc="Industry analysis, customer research, and market opportunity assessment." />
                <ServiceBlock icon={<Target />} title="Business plan development" desc="Professional business plans designed for entrepreneur programs and investment discussions." />
                <ServiceBlock icon={<Presentation />} title="Pitch deck preparation" desc="Clear and professional investor-style presentations." />
                <ServiceBlock icon={<TrendingUp />} title="Entrepreneur readiness" desc="Evaluate strengths, weaknesses, risks, and opportunities before application." />
                <ServiceBlock icon={<Users />} title="Ecosystem connections" desc="Introductions to accelerators, incubators, mentors, and business support organizations." />
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─── WHO & WHY ─── */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-navy">Who we work with</h2>
          <ul className="flex flex-col gap-3">
            {PARTNER_TYPES.map((item) => (
              <li key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="text-lg font-bold text-navy">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-navy">Why consultants choose us</h2>
          <ul className="flex flex-col gap-3">
            {REASONS.map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-xl bg-mist p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
                <span className="font-semibold text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── COMPLIANCE ─── */}
      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8">
        <div className="rounded-2xl border border-warning/40 bg-warning/5 p-6 md:p-10">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-navy">
            <ShieldCheck className="h-6 w-6 text-warning" aria-hidden="true" /> Compliance first
          </h2>
          <div className="mt-4 flex max-w-3xl flex-col gap-3 text-gray-700">
            <p>
              <strong className="text-ink">AshaVid is not an immigration consulting firm.</strong>
            </p>
            <p>
              We do not provide immigration advice, legal advice, or immigration representation. Licensed immigration
              professionals remain responsible for all immigration-related services.
            </p>
            <p>
              Our role is strictly limited to business support, entrepreneurial development, market validation, and
              ecosystem engagement.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-8 lg:pb-20">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-navy p-8 text-white md:p-12">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">Let&apos;s explore a partnership</h2>
          <p className="max-w-2xl text-lg text-white/80">
            Whether you are supporting entrepreneur applicants, startup founders, or business-focused newcomers, we would be
            happy to discuss how we can support your clients.
          </p>
          <a
            href="mailto:partnerships@ashavid.com"
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-white px-7 text-lg font-bold text-navy transition-colors hover:bg-teal hover:text-white"
          >
            <Mail className="h-5 w-5" aria-hidden="true" />
            Book a partnership meeting
          </a>
          <div className="flex flex-col gap-3 text-sm font-semibold text-white/70 sm:flex-row sm:gap-6">
            <a href="mailto:farjad@ashavid.com" className="inline-flex items-center gap-2 hover:text-white">
              <Mail className="h-4 w-4" aria-hidden="true" /> farjad@ashavid.com
            </a>
            <a href="https://www.ashavid.ca" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
              <Globe className="h-4 w-4" aria-hidden="true" /> www.ashavid.ca
            </a>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM BRANDING ─── */}
      <footer className="border-t border-gray-200 bg-mist py-6 text-center text-xs font-semibold text-gray-500">
        <a href="https://www.getverixa.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-navy">
          www.getverixa.com <span className="font-normal">(powered by AshaVid)</span>
        </a>
      </footer>
    </div>
  );
}

// ─── HELPER COMPONENTS ───

function ServiceBlock({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist text-navy [&>svg]:h-5 [&>svg]:w-5" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h4 className="font-bold text-navy">{title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{desc}</p>
      </div>
    </div>
  );
}
