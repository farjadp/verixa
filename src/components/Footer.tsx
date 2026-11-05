"use client";

import Link from "next/link";
import { Linkedin, Twitter, Send, ShieldCheck } from "lucide-react";

import { usePlatformSettings } from "@/components/providers/PlatformProvider";

type FooterLink = { label: string; href: string; badge?: string };

const FOOTER_LINKS: Record<"registry" | "intelligence" | "professionals" | "company" | "legal", FooterLink[]> = {
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

const SOCIAL = [
  { label: "LinkedIn", href: "https://linkedin.com", icon: <Linkedin className="h-4 w-4" aria-hidden="true" /> },
  { label: "X (Twitter)", href: "https://twitter.com", icon: <Twitter className="h-4 w-4" aria-hidden="true" /> },
  { label: "Telegram", href: "https://telegram.org", icon: <Send className="h-4 w-4" aria-hidden="true" /> },
];

export default function Footer() {
  const settings = usePlatformSettings();
  const logoImage = "/api/assets/logo?type=footer";
  const siteName = settings?.siteName || "Verixa";

  return (
    <footer className="border-t border-gray-200 bg-mist">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-14 lg:px-8 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand */}
          <div className="flex flex-col gap-5 lg:col-span-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoImage} alt={siteName} className="h-10 w-fit object-contain" />
            <p className="max-w-sm text-sm leading-relaxed text-gray-600">
              {siteName} lists licensed Canadian immigration consultants (RCICs) from the CICC public register, with
              immigration data and pathway guides to help you choose who to call.
            </p>
            <p className="text-sm font-bold text-navy">Trust isn&apos;t optional. We make it visible.</p>
            <div className="flex gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-navy hover:text-navy"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-5">
            <FooterColumn title="Registry" links={FOOTER_LINKS.registry} />
            <FooterColumn title="Intelligence" links={FOOTER_LINKS.intelligence} />
            <FooterColumn title="For Professionals" links={FOOTER_LINKS.professionals} />
            <FooterColumn title="Company" links={FOOTER_LINKS.company} />
            <FooterColumn title="Legal" links={FOOTER_LINKS.legal} />
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-gray-200 pt-6 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <p className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal" aria-hidden="true" />
            © {new Date().getFullYear()} Verixa Technologies Inc. All rights reserved.
          </p>
          <p>Not affiliated with IRCC, the CICC or the Government of Canada.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-teal">{title}</h2>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href} className="flex items-center">
            <Link href={link.href} className="text-sm font-medium text-gray-600 transition-colors hover:text-navy">
              {link.label}
            </Link>
            {link.badge && (
              <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                {link.badge}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
