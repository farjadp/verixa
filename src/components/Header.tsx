"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronDown, Menu, X, Shield, ArrowRight,
  UserCircle2, Globe, Zap, BookOpen, Calculator,
  HelpCircle, Briefcase, Star, CreditCard, Users
} from "lucide-react";

import { usePlatformSettings } from "@/components/providers/PlatformProvider";

// ─── NAV DATA ────────────────────────────────────────────────────────────────

const FIND_CONSULTANTS = {
  specialties: [
    { label: "Express Entry", href: "/search?q=Express+Entry", desc: "CRS score optimization & draws" },
    { label: "Study Permits", href: "/search?q=Study+Permit", desc: "Student visas & post-grad work" },
    { label: "Startup & Business", href: "/search?q=Business+Visa", desc: "SUV, investor & entrepreneur" },
    { label: "Family Sponsorship", href: "/search?q=Family+Sponsorship", desc: "Spousal, PR & citizen reunification" },
    { label: "Refusals & Appeals", href: "/search?q=Refusal+Appeal", desc: "IAD, Federal Court representation" },
    { label: "Provincial Nominee", href: "/search?q=Provincial+Nominee", desc: "PNP streams across all provinces" },
  ],
  regions: [
    { label: "Toronto", href: "/search?city=Toronto" },
    { label: "Vancouver", href: "/search?city=Vancouver" },
    { label: "Montreal", href: "/search?city=Montreal" },
    { label: "Calgary", href: "/search?city=Calgary" },
    { label: "Ottawa", href: "/search?city=Ottawa" },
    { label: "Alberta", href: "/search?province=Alberta" },
    { label: "British Columbia", href: "/search?province=British+Columbia" },
    { label: "Ontario", href: "/search?province=Ontario" },
  ],
};

const INTELLIGENCE = [
  { label: "Immigration Journal", href: "/blog", icon: <BookOpen className="w-4 h-4" />, desc: "News, policy updates & insights" },
  { label: "Immigration Guides", href: "/blog/category/immigration-guides", icon: <Globe className="w-4 h-4" />, desc: "In-depth how-to resources" },
  { label: "CRS Score Calculator", href: "/tools/crs-calculator", icon: <Calculator className="w-4 h-4" />, desc: "Estimate your Express Entry score", badge: "Soon" },
  { label: "Help Center / FAQ", href: "/faq", icon: <HelpCircle className="w-4 h-4" />, desc: "Common questions answered" },
];

const FOR_PROFESSIONALS = [
  { label: "Claim Your Profile", href: "/claim", icon: <Star className="w-4 h-4" />, desc: "Verify your RCIC listing for free" },
  { label: "Platform Features", href: "/pricing#features", icon: <Zap className="w-4 h-4" />, desc: "Tools built for modern RCICs" },
  { label: "Plans & Pricing", href: "/pricing", icon: <CreditCard className="w-4 h-4" />, desc: "Free, Starter, Growth & Pro" },
  { label: "Partner Portal", href: "/dashboard", icon: <Briefcase className="w-4 h-4" />, desc: "Your consultant dashboard" },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const settings = usePlatformSettings();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggle = (key: string) =>
    setOpenDropdown((prev) => (prev === key ? null : key));

  const logoImage = "/api/assets/logo?type=header";
  const siteName = settings?.siteName || "Verixa";

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "py-3 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm"
          : "py-5 bg-white border-b border-transparent"
      }`}
    >
      <nav
        ref={navRef}
        className="px-6 lg:px-12 flex justify-between items-center max-w-[1440px] mx-auto font-sans"
      >
        {/* ── LOGO ── */}
        <Link href="/" className="flex items-center gap-2 group shrink-0 z-10">
          <img src={logoImage} alt={siteName} className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
        </Link>

        {/* ── DESKTOP NAV ── */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-0">

          {/* 1. Find Consultants */}
          <div className="relative">
            <DropdownTrigger
              label="Find Consultants"
              isOpen={openDropdown === "find"}
              onClick={() => toggle("find")}
            />
            {openDropdown === "find" && (
              <MegaMenuPanel onClose={() => setOpenDropdown(null)} width="w-[680px]" align="left">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-10">
                  {/* Specialties */}
                  <div>
                    <PanelHeading label="By Specialty" />
                    <ul className="space-y-1 mt-4">
                      {FIND_CONSULTANTS.specialties.map((s) => (
                        <MegaMenuLink key={s.href} {...s} onClose={() => setOpenDropdown(null)} />
                      ))}
                    </ul>
                  </div>

                  <div className="w-px bg-gray-100 mx-2" />

                  {/* Regions + CTA */}
                  <div className="flex flex-col gap-6">
                    <div>
                      <PanelHeading label="By Region" />
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
                        {FIND_CONSULTANTS.regions.map((r) => (
                          <Link
                            key={r.href}
                            href={r.href}
                            onClick={() => setOpenDropdown(null)}
                            className="text-sm font-semibold text-gray-500 hover:text-[#0F2A44] transition-colors"
                          >
                            {r.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto bg-[#F5F7FA] rounded-2xl p-5 border border-gray-100">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
                        Verified Network
                      </p>
                      <p className="text-sm font-semibold text-[#0F2A44] mb-4 leading-snug">
                        Experts in 20+ languages, across every province.
                      </p>
                      <Link
                        href="/search"
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-center justify-center gap-2 bg-[#0F2A44] text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-[#2FA4A9] transition-all group/btn"
                      >
                        Browse All Consultants
                        <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </MegaMenuPanel>
            )}
          </div>

          {/* 2. Intelligence */}
          <div className="relative">
            <DropdownTrigger
              label="Intelligence"
              isOpen={openDropdown === "intel"}
              onClick={() => toggle("intel")}
            />
            {openDropdown === "intel" && (
              <MegaMenuPanel onClose={() => setOpenDropdown(null)} width="w-[400px]" align="center">
                <PanelHeading label="Resources & Tools" />
                <ul className="space-y-1 mt-4">
                  {INTELLIGENCE.map((item) => (
                    <MegaMenuLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      desc={item.desc}
                      icon={item.icon}
                      badge={item.badge}
                      onClose={() => setOpenDropdown(null)}
                    />
                  ))}
                </ul>
              </MegaMenuPanel>
            )}
          </div>

          {/* 3. For Professionals */}
          <div className="relative">
            <DropdownTrigger
              label="For Professionals"
              isOpen={openDropdown === "pro"}
              onClick={() => toggle("pro")}
            />
            {openDropdown === "pro" && (
              <MegaMenuPanel onClose={() => setOpenDropdown(null)} width="w-[400px]" align="right">
                <PanelHeading label="RCIC Partner Program" />
                <ul className="space-y-1 mt-4">
                  {FOR_PROFESSIONALS.map((item) => (
                    <MegaMenuLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      desc={item.desc}
                      icon={item.icon}
                      onClose={() => setOpenDropdown(null)}
                    />
                  ))}
                </ul>
              </MegaMenuPanel>
            )}
          </div>
        </div>

        {/* ── AUTH / CTA ── */}
        <div className="hidden lg:flex items-center gap-5">
          <Link
            href="/login"
            className="flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-[#0F2A44] transition-colors"
          >
            <UserCircle2 className="w-5 h-5" />
            Sign In
          </Link>
          <Link
            href="/search"
            className="bg-[#0F2A44] text-white px-7 py-3 rounded-full text-[13px] font-bold tracking-wide uppercase hover:bg-[#2FA4A9] shadow-xl shadow-[#0F2A44]/10 transition-all active:scale-95"
          >
            Find a Consultant
          </Link>
        </div>

        {/* ── MOBILE TOGGLE ── */}
        <button
          className="lg:hidden p-2 text-[#0F2A44] z-10"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-[64px] bg-white z-40 overflow-y-auto">
          <div className="px-6 py-8 flex flex-col gap-2">
            {/* Find Consultants */}
            <MobileAccordion
              label="Find Consultants"
              isOpen={mobileSection === "find"}
              onClick={() =>
                setMobileSection(mobileSection === "find" ? null : "find")
              }
            >
              <p className="text-[11px] font-black uppercase tracking-widest text-[#2FA4A9] mb-3">
                By Specialty
              </p>
              {FIND_CONSULTANTS.specialties.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-semibold text-gray-600 border-b border-gray-50"
                >
                  {s.label}
                </Link>
              ))}
              <p className="text-[11px] font-black uppercase tracking-widest text-[#2FA4A9] mb-3 mt-5">
                By Region
              </p>
              {FIND_CONSULTANTS.regions.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-semibold text-gray-600 border-b border-gray-50"
                >
                  {r.label}
                </Link>
              ))}
            </MobileAccordion>

            {/* Intelligence */}
            <MobileAccordion
              label="Intelligence"
              isOpen={mobileSection === "intel"}
              onClick={() =>
                setMobileSection(mobileSection === "intel" ? null : "intel")
              }
            >
              {INTELLIGENCE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-semibold text-gray-600 border-b border-gray-50"
                >
                  {item.label}
                  {item.badge && (
                    <span className="ml-2 text-[9px] font-black uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </MobileAccordion>

            {/* For Professionals */}
            <MobileAccordion
              label="For Professionals"
              isOpen={mobileSection === "pro"}
              onClick={() =>
                setMobileSection(mobileSection === "pro" ? null : "pro")
              }
            >
              {FOR_PROFESSIONALS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-semibold text-gray-600 border-b border-gray-50"
                >
                  {item.label}
                </Link>
              ))}
            </MobileAccordion>

            {/* Auth */}
            <div className="mt-8 space-y-3">
              <Link
                href="/search"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-4 font-bold bg-[#0F2A44] text-white rounded-2xl"
              >
                Find a Consultant
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-4 font-bold text-gray-600 border border-gray-200 rounded-2xl"
              >
                <UserCircle2 className="w-5 h-5" /> Sign In
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function DropdownTrigger({
  label,
  isOpen,
  onClick,
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1 px-4 py-2 text-[13px] font-bold tracking-wide transition-colors rounded-xl ${
        isOpen
          ? "text-[#0F2A44] bg-gray-50"
          : "text-gray-500 hover:text-[#0F2A44] hover:bg-gray-50"
      }`}
    >
      {label}
      <ChevronDown
        className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function MegaMenuPanel({
  children,
  onClose,
  width = "w-[680px]",
  align = "left",
}: {
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
  align?: "left" | "center" | "right";
}) {
  const alignClass =
    align === "right"
      ? "right-0"
      : align === "center"
      ? "left-1/2 -translate-x-1/2"
      : "left-0";

  return (
    <div className={`absolute top-[calc(100%+12px)] ${alignClass} ${width} z-50`}>
      {/* Arrow pointer */}
      <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45 shadow-[-2px_-2px_3px_rgba(0,0,0,0.03)]" />
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.12)] p-8">
        {children}
      </div>
    </div>
  );
}

function PanelHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-[#2FA4A9]" />
      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
        {label}
      </span>
    </div>
  );
}

function MegaMenuLink({
  href,
  label,
  desc,
  icon,
  badge,
  onClose,
}: {
  href: string;
  label: string;
  desc?: string;
  icon?: React.ReactNode;
  badge?: string;
  onClose: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClose}
        className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F5F7FA] transition-colors group/link"
      >
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover/link:bg-[#2FA4A9]/10 group-hover/link:text-[#2FA4A9] transition-colors shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#0F2A44] group-hover/link:text-[#2FA4A9] transition-colors">
              {label}
            </span>
            {badge && (
              <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">
                {badge}
              </span>
            )}
          </div>
          {desc && (
            <p className="text-xs text-gray-400 font-medium leading-snug mt-0.5">
              {desc}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

function MobileAccordion({
  label,
  isOpen,
  onClick,
  children,
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center py-4 text-base font-bold text-[#0F2A44]"
      >
        {label}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 pl-2 space-y-1">{children}</div>
      )}
    </div>
  );
}