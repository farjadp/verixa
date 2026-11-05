"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronDown, Menu, X, ArrowRight,
  UserCircle2, Globe, Zap, BookOpen, Calculator,
  HelpCircle, Briefcase, Star, CreditCard,
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

type NavItem = { label: string; href: string; icon: React.ReactNode; desc: string; badge?: string };

const INTELLIGENCE: NavItem[] = [
  { label: "Immigration Journal", href: "/blog", icon: <BookOpen className="h-4 w-4" />, desc: "News, policy updates & insights" },
  { label: "Immigration Guides", href: "/blog/category/immigration-guides", icon: <Globe className="h-4 w-4" />, desc: "In-depth how-to resources" },
  { label: "CRS Score Calculator", href: "/tools/crs-calculator", icon: <Calculator className="h-4 w-4" />, desc: "Estimate your Express Entry score", badge: "Soon" },
  { label: "Help Center / FAQ", href: "/faq", icon: <HelpCircle className="h-4 w-4" />, desc: "Common questions answered" },
];

const FOR_PROFESSIONALS: NavItem[] = [
  { label: "Claim Your Profile", href: "/claim", icon: <Star className="h-4 w-4" />, desc: "Verify your RCIC listing for free" },
  { label: "Platform Features", href: "/pricing#features", icon: <Zap className="h-4 w-4" />, desc: "Tools built for modern RCICs" },
  { label: "Plans & Pricing", href: "/pricing", icon: <CreditCard className="h-4 w-4" />, desc: "Free, Starter, Growth & Pro" },
  { label: "Partner Portal", href: "/dashboard", icon: <Briefcase className="h-4 w-4" />, desc: "Your consultant dashboard" },
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
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggle = (key: string) =>
    setOpenDropdown((prev) => (prev === key ? null : key));
  const close = () => setOpenDropdown(null);

  const logoImage = "/api/assets/logo?type=header";
  const siteName = settings?.siteName || "Verixa";

  return (
    <header
      className={`fixed top-0 z-50 w-full border-b transition-colors duration-300 ${
        scrolled || mobileOpen
          ? "border-gray-200 bg-white/95 shadow-sm backdrop-blur-xl"
          : "border-transparent bg-white"
      }`}
    >
      <nav
        ref={navRef}
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 font-sans lg:h-20 lg:px-8"
      >
        {/* ── LOGO ── */}
        <Link href="/" className="z-10 flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoImage} alt={siteName} className="h-9 w-auto object-contain" />
        </Link>

        {/* ── DESKTOP NAV ── */}
        <div className="hidden items-center gap-1 lg:flex">
          {/* 1. Find Consultants */}
          <div className="relative">
            <DropdownTrigger label="Find Consultants" id="find" isOpen={openDropdown === "find"} onClick={() => toggle("find")} />
            {openDropdown === "find" && (
              <MegaMenuPanel id="find" width="w-[680px]" align="left">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-8">
                  <div>
                    <PanelHeading label="By specialty" />
                    <ul className="mt-3 space-y-1">
                      {FIND_CONSULTANTS.specialties.map((s) => (
                        <MegaMenuLink key={s.href} {...s} onClose={close} />
                      ))}
                    </ul>
                  </div>

                  <div className="w-px bg-gray-200" />

                  <div className="flex flex-col gap-6">
                    <div>
                      <PanelHeading label="By region" />
                      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
                        {FIND_CONSULTANTS.regions.map((r) => (
                          <Link
                            key={r.href}
                            href={r.href}
                            onClick={close}
                            className="text-sm font-semibold text-gray-600 transition-colors hover:text-teal"
                          >
                            {r.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto rounded-2xl border border-gray-200 bg-mist p-5">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-teal">Licensed only</p>
                      <p className="mb-4 text-sm font-semibold leading-snug text-navy">
                        Every consultant listed is on the CICC public register.
                      </p>
                      <Link
                        href="/search"
                        onClick={close}
                        className="group/btn flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-4 text-sm font-bold text-white transition-colors hover:bg-teal"
                      >
                        Browse all consultants
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </MegaMenuPanel>
            )}
          </div>

          {/* 2. Intelligence */}
          <div className="relative">
            <DropdownTrigger label="Intelligence" id="intel" isOpen={openDropdown === "intel"} onClick={() => toggle("intel")} />
            {openDropdown === "intel" && (
              <MegaMenuPanel id="intel" width="w-[400px]" align="center">
                <PanelHeading label="Resources & tools" />
                <ul className="mt-3 space-y-1">
                  {INTELLIGENCE.map((item) => (
                    <MegaMenuLink key={item.href} {...item} onClose={close} />
                  ))}
                </ul>
              </MegaMenuPanel>
            )}
          </div>

          {/* 3. For Professionals */}
          <div className="relative">
            <DropdownTrigger label="For Professionals" id="pro" isOpen={openDropdown === "pro"} onClick={() => toggle("pro")} />
            {openDropdown === "pro" && (
              <MegaMenuPanel id="pro" width="w-[400px]" align="right">
                <PanelHeading label="RCIC partner program" />
                <ul className="mt-3 space-y-1">
                  {FOR_PROFESSIONALS.map((item) => (
                    <MegaMenuLink key={item.href} {...item} onClose={close} />
                  ))}
                </ul>
              </MegaMenuPanel>
            )}
          </div>
        </div>

        {/* ── AUTH / CTA ── */}
        <div className="hidden items-center gap-5 lg:flex">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm font-bold text-gray-600 transition-colors hover:text-navy"
          >
            <UserCircle2 className="h-5 w-5" aria-hidden="true" />
            Sign in
          </Link>
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-teal"
          >
            Find a consultant
          </Link>
        </div>

        {/* ── MOBILE TOGGLE ── */}
        <button
          type="button"
          className="z-10 -mr-2 p-2 text-navy lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-white lg:hidden">
          <div className="flex flex-col px-6 py-6">
            <MobileAccordion
              label="Find Consultants"
              isOpen={mobileSection === "find"}
              onClick={() => setMobileSection(mobileSection === "find" ? null : "find")}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-teal">By specialty</p>
              {FIND_CONSULTANTS.specialties.map((s) => (
                <MobileLink key={s.href} href={s.href} onClick={() => setMobileOpen(false)}>{s.label}</MobileLink>
              ))}
              <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-teal">By region</p>
              {FIND_CONSULTANTS.regions.map((r) => (
                <MobileLink key={r.href} href={r.href} onClick={() => setMobileOpen(false)}>{r.label}</MobileLink>
              ))}
            </MobileAccordion>

            <MobileAccordion
              label="Intelligence"
              isOpen={mobileSection === "intel"}
              onClick={() => setMobileSection(mobileSection === "intel" ? null : "intel")}
            >
              {INTELLIGENCE.map((item) => (
                <MobileLink key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                  {item.label}
                  {item.badge && <SoonBadge label={item.badge} />}
                </MobileLink>
              ))}
            </MobileAccordion>

            <MobileAccordion
              label="For Professionals"
              isOpen={mobileSection === "pro"}
              onClick={() => setMobileSection(mobileSection === "pro" ? null : "pro")}
            >
              {FOR_PROFESSIONALS.map((item) => (
                <MobileLink key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>{item.label}</MobileLink>
              ))}
            </MobileAccordion>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/search"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-navy font-bold text-white"
              >
                Find a consultant
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 font-bold text-navy"
              >
                <UserCircle2 className="h-5 w-5" aria-hidden="true" /> Sign in
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
  id,
  isOpen,
  onClick,
}: {
  label: string;
  id: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-controls={`menu-${id}`}
      className={`flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
        isOpen ? "bg-mist text-navy" : "text-gray-600 hover:bg-mist hover:text-navy"
      }`}
    >
      {label}
      <ChevronDown
        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        aria-hidden="true"
      />
    </button>
  );
}

function MegaMenuPanel({
  id,
  children,
  width = "w-[680px]",
  align = "left",
}: {
  id: string;
  children: React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}) {
  const alignClass =
    align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";

  return (
    <div id={`menu-${id}`} className={`absolute top-[calc(100%+12px)] ${alignClass} ${width} z-50`}>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl shadow-navy/10">{children}</div>
    </div>
  );
}

function PanelHeading({ label }: { label: string }) {
  return <p className="text-xs font-bold uppercase tracking-wider text-teal">{label}</p>;
}

function SoonBadge({ label }: { label: string }) {
  return (
    <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
      {label}
    </span>
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
        className="group/link flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-mist"
      >
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mist text-navy transition-colors group-hover/link:bg-teal/10 group-hover/link:text-teal">
            {icon}
          </span>
        )}
        <span className="min-w-0">
          <span className="flex items-center">
            <span className="text-sm font-bold text-navy transition-colors group-hover/link:text-teal">{label}</span>
            {badge && <SoonBadge label={badge} />}
          </span>
          {desc && <span className="mt-0.5 block text-xs leading-snug text-gray-500">{desc}</span>}
        </span>
      </Link>
    </li>
  );
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-11 items-center border-b border-gray-100 text-sm font-semibold text-gray-700"
    >
      {children}
    </Link>
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
    <div className="border-b border-gray-200">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between py-4 text-base font-bold text-navy"
      >
        {label}
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
}
