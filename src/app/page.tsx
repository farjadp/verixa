// ============================================================================
// Hardware Source: src/app/page.tsx
// Route: /
// Version: 2.0.0 — 2026-11-05 (Pathfinder redesign)
// Why: Primary public landing route. Leads with the route finder, then the
//      licensed consultants and policy data for the chosen route.
// Domain: Public Acquisition
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Must render with safe fallbacks when the DB is unavailable; every
//        query lives in src/lib/home-data.ts and degrades to empty lists.
// ============================================================================
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Lock, FileCheck, ArrowRight } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/home/HeroSearch";
import Pathfinder from "@/components/home/Pathfinder";
import PolicyTracker from "@/components/home/PolicyTracker";
import { getHomeData } from "@/lib/home-data";

export const revalidate = 600;

const FALLBACK_COUNT = 15000;

export default async function Home() {
  const data = await getHomeData();
  const count = data.consultantCount ?? FALLBACK_COUNT;
  const formattedCount = new Intl.NumberFormat("en-CA").format(count);
  const countLabel = data.consultantCount === null ? `${formattedCount}+` : formattedCount;

  return (
    <main className="min-h-screen bg-white text-ink">
      <Header />

      {/* ───────────── HERO ───────────── */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-32 lg:px-8 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-mist px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              {countLabel} licensed RCICs · synced with the CICC register hourly
            </span>
            <h1 className="text-4xl font-bold leading-[1.04] tracking-tight text-navy sm:text-5xl md:text-6xl lg:text-7xl">
              Choose your route to Canada. <span className="text-teal">Then the person licensed to walk it with you.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl">
              Three questions give you the pathways that fit, the latest policy on each, and consultants from the CICC register who work only that route. Your payment is held in escrow until you meet.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="#route-finder"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-teal px-7 text-lg font-bold text-white transition-colors hover:bg-navy"
              >
                Find my route
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <span className="text-sm font-semibold text-gray-500">or search the register directly:</span>
            </div>
            <div className="max-w-2xl">
              <HeroSearch />
            </div>
            <p className="text-sm font-semibold text-gray-500">
              Trust isn&apos;t optional. We make it visible: licensed only · escrow on every booking · 20+ languages.
            </p>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-mist shadow-2xl shadow-navy/15">
              <Image
                src="/images/home/hero-toronto.jpg"
                alt="Toronto skyline seen from the islands"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 to-transparent p-6 pt-20 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-lightteal">Why Verixa</p>
                <p className="mt-1 text-xl font-bold leading-snug">
                  Unlicensed &ldquo;advisors&rdquo; cost people their applications every year. Verixa lists exactly one kind of consultant: the licensed ones.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── ROUTE FINDER + CONSULTANTS + DATA ───────────── */}
      <section className="border-y border-gray-200 bg-mist py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Route finder</span>
            <h2 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">Three questions. Then a real plan.</h2>
          </div>
          <Pathfinder consultantsByRoute={data.consultantsByRoute} articlesByRoute={data.articlesByRoute} />
        </div>
      </section>

      {/* ───────────── VERIFICATION + TRACKER ───────────── */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal">How a name gets on Verixa</span>
              <h2 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">Three checks. None of them optional.</h2>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: <FileCheck className="h-6 w-6" aria-hidden="true" />,
                  title: "On the CICC register",
                  body: "We import the public register, not a form someone fills in. A lapsed licence drops at the next hourly sync.",
                },
                {
                  icon: <ShieldCheck className="h-6 w-6" aria-hidden="true" />,
                  title: "Identity verified to claim",
                  body: "A consultant can only take bookings after proving they are the person on the licence.",
                },
                {
                  icon: <Lock className="h-6 w-6" aria-hidden="true" />,
                  title: "Paid through escrow",
                  body: "Your payment is held by Verixa and released only after the consultation takes place.",
                },
              ].map((item, i) => (
                <li key={item.title} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-navy">{item.icon}</span>
                    <span className="text-xs font-bold text-teal">0{i + 1}</span>
                  </div>
                  <h3 className="text-lg font-bold text-navy">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{item.body}</p>
                </li>
              ))}
            </ol>

            <dl className="grid grid-cols-2 gap-6 rounded-2xl bg-gradient-to-br from-navy to-teal p-8 text-white sm:grid-cols-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-lightteal">Licensed</dt>
                <dd className="mt-1 text-3xl font-bold">{countLabel}</dd>
                <dd className="text-sm text-white/80">RCICs on the register</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-lightteal">Sync</dt>
                <dd className="mt-1 text-3xl font-bold">60 min</dd>
                <dd className="text-sm text-white/80">between CICC checks</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-lightteal">Languages</dt>
                <dd className="mt-1 text-3xl font-bold">20+</dd>
                <dd className="text-sm text-white/80">spoken by consultants</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-lightteal">Escrow</dt>
                <dd className="mt-1 text-3xl font-bold">100%</dd>
                <dd className="text-sm text-white/80">of bookings held until you meet</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal">Immigration data</span>
              <h2 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">Policy moves weekly. Know before you file.</h2>
            </div>
            <PolicyTracker articles={data.latestArticles} />
          </div>
        </div>
      </section>

      {/* ───────────── FOR RCICs ───────────── */}
      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-navy text-white">
          <Image
            src="/images/home/route-work.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="relative flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="flex max-w-2xl flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-lightteal">For licensed RCICs</span>
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
                People are choosing your route right now. Claim your profile.
              </h2>
              <p className="text-base text-white/80">Verify your licence once and take escrow-protected bookings from people on your pathway.</p>
            </div>
            <Link
              href="/claim"
              className="inline-flex min-h-14 shrink-0 items-center justify-center rounded-2xl bg-white px-7 text-lg font-bold text-navy transition-colors hover:bg-teal hover:text-white"
            >
              Claim my profile
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
