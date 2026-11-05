// ============================================================================
// Hardware Source: src/app/pricing/page.tsx
// Route: /pricing
// Version: 1.0.0 — 2026-04-08
// Why: Commercial pricing route for plan positioning, feature packaging, and conversion to paid subscriptions.
// Domain: Commercial & Pricing
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep route behavior deterministic and aligned with metadata, SEO, and access expectations.
// Critical Path: Commercial conversion page; pricing/feature mismatches can cause trust and revenue issues.
// Primary Dependencies: Plan data, billing mode settings, feature highlights, CTA routing into checkout/dashboard.
// ============================================================================
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShieldCheck, Search, CalendarCheck, Check, Minus, ChevronDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import PricingTiers, { type PricingPlan } from "./PricingTiers";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Pricing | Membership for Verified Consultants",
  description: "Join Canada's premier immigration marketplace. Get discovered, build trust, and convert high-intent clients.",
};

export default async function PricingPage() {
  let plans: PricingPlan[] = [];
  let billingMode: "monthly" | "yearly" | "both" = "both";
  try {
    const [planRows, billingModeSetting] = await Promise.all([
      prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.platformSetting.findUnique({ where: { key: "billingMode" } }),
    ]);
    plans = planRows;
    const mode = billingModeSetting?.value;
    if (mode === "monthly" || mode === "yearly" || mode === "both") billingMode = mode;
  } catch (err) {
    console.error("Pricing: plan lookup failed", err);
  }

  // Comparison-table columns follow the plans in the database (fallback: the four standard tiers).
  const columns = plans.length > 0 ? plans : null;
  const bySlug = (slug: string) => plans.find((p) => p.slug === slug);
  const free = bySlug("free");
  const starter = bySlug("starter");
  const money = (cents: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);

  return (
    <main className="min-h-screen bg-white font-sans text-ink">
      <Header />

      {/* ───────────── HERO ───────────── */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-32 lg:px-8 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-mist px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy">
            <ShieldCheck className="h-4 w-4 text-teal" aria-hidden="true" />
            For licensed RCICs
          </span>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-navy sm:text-5xl md:text-6xl">
            Be seen. Build trust. <span className="text-teal">Book clients.</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl">
            People come to Verixa to find a licensed consultant for their pathway. Claim your listing from the CICC
            register, verify your identity once, and take bookings paid through escrow.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/search"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-teal px-7 text-lg font-bold text-white transition-colors hover:bg-navy"
            >
              Find and claim your listing
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <a
              href="#comparison"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-gray-200 bg-white px-7 text-lg font-bold text-navy transition-colors hover:border-navy"
            >
              Compare plans
            </a>
          </div>
        </div>
        <div className="relative hidden lg:col-span-5 lg:block">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-mist shadow-2xl shadow-navy/15">
            <Image
              src="/images/home/route-pr.jpg"
              alt="Vancouver skyline reflected in the harbour"
              fill
              priority
              sizes="40vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 to-transparent p-6 pt-20 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-lightteal">Licensed only</p>
              <p className="mt-1 text-xl font-bold leading-snug">
                Verixa lists one kind of consultant: the ones on the CICC register.
              </p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ───────────── WHAT YOU GET ───────────── */}
      <section id="features" className="border-y border-gray-200 bg-white pb-16 lg:pb-20">
        <div className="mx-auto max-w-7xl px-6 pt-16 lg:px-8 lg:pt-20">
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: <Search className="h-6 w-6" aria-hidden="true" />,
                title: "Found on your pathway",
                body: "Applicants search by pathway, province and language. Your profile lists your areas of practice so the right people find you.",
              },
              {
                icon: <ShieldCheck className="h-6 w-6" aria-hidden="true" />,
                title: "Trust that's checked",
                body: "Your licence comes from the CICC register and your identity is verified before you can take bookings.",
              },
              {
                icon: <CalendarCheck className="h-6 w-6" aria-hidden="true" />,
                title: "Bookings paid through escrow",
                body: "Clients book from your calendar and pay up front. Verixa holds the payment and releases it after the consultation.",
              },
            ].map((item, i) => (
              <li key={item.title} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-navy">{item.icon}</span>
                  <span className="text-xs font-bold text-teal">0{i + 1}</span>
                </div>
                <h2 className="text-lg font-bold text-navy">{item.title}</h2>
                <p className="text-sm leading-relaxed text-gray-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── PLANS ───────────── */}
      {plans.length > 0 ? (
        <PricingTiers plans={plans} billingMode={billingMode} />
      ) : (
        <section className="bg-mist py-16">
          <p className="mx-auto max-w-xl px-6 text-center text-gray-600">
            Plans are loading slowly right now. Please refresh in a moment.
          </p>
        </section>
      )}

      {/* ───────────── ONE BOOKING ───────────── */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="rounded-3xl bg-gradient-to-br from-navy to-teal p-8 text-white md:p-12">
          <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
            One extra consultation a month can cover a paid plan.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            The platform fee drops with each tier, so the more you book, the sooner a paid plan pays for itself. Compare
            the fee you pay today with the fee on the next plan up.
          </p>
        </div>
      </section>

      {/* ───────────── COMPARISON ───────────── */}
      <section id="comparison" className="border-y border-gray-200 bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Compare</span>
            <h2 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">What each plan includes</h2>
          </div>

          <div className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0">
            <table className="w-full min-w-[720px] border-collapse text-start">
              <thead>
                <tr>
                  <th scope="col" className="w-1/3 border-b-2 border-gray-200 p-4 text-start text-sm font-bold text-gray-500">
                    <span className="sr-only">Feature</span>
                  </th>
                  {(columns ?? FALLBACK_COLUMNS).map((p) => (
                    <th
                      key={p.slug}
                      scope="col"
                      className={`border-b-2 p-4 text-center text-sm font-bold ${
                        "isRecommended" in p && p.isRecommended ? "border-teal text-teal" : "border-gray-200 text-navy"
                      }`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                <TableGroup title="Visibility & SEO" />
                <TableRow label="Search placement" vals={["Basic", "Boosted", "High priority", "Maximum"]} />
                <TableRow label="Google search indexing" vals={[false, true, true, true]} />
                <TableRow label="Competitor ad removal" vals={[false, false, true, true]} />
                <TableRow label="Featured consultant badge" vals={[false, false, true, true]} />
                <TableRow label="Category placement (e.g. study permits)" vals={["None", "1 category", "3 categories", "Unlimited"]} />
                <TableRow label="Geographic targeting" vals={["City", "Province", "National", "Global"]} />

                <TableGroup title="Trust & identity" />
                <TableRow label="CICC licence verification badge" vals={[true, true, true, true]} />
                <TableRow label="Structured review collection" vals={[true, true, true, true]} />
                <TableRow label="Review responses" vals={[false, true, true, true]} />
                <TableRow label="Profile cover & branding" vals={[false, "Basic", "Advanced", "Full agency"]} />
                <TableRow label="Custom domain (e.g. yourname.com)" vals={[false, false, false, true]} />

                <TableGroup title="Booking & clients" />
                <TableRow label="Direct calendar booking" vals={[true, true, true, true]} />
                <TableRow label="Calendar sync (Outlook / Google)" vals={["Basic", "Automatic", "Automatic", "Automatic"]} />
                <TableRow label="Consultation types (e.g. 15 min, 1 h)" vals={["1 type", "3 types", "Unlimited", "Unlimited"]} />
                <TableRow label="Automated email reminders" vals={[true, true, true, true]} />
                <TableRow label="Automated SMS reminders" vals={[false, false, true, true]} />
                <TableRow label="Pre-booking questionnaire" vals={[false, "Standard", "Custom", "Advanced routing"]} />

                <TableGroup title="Fees & escrow" />
                <TableRow
                  label="Monthly subscription"
                  vals={columns ? columns.map((p) => money(p.priceCents)) : ["$0", "$21", "$55", "$199"]}
                />
                <TableRow
                  label="Platform fee per booking"
                  highlight
                  vals={columns ? columns.map((p) => `${p.commission}%`) : ["21%", "8%", "3%", "0%"]}
                />
                <TableRow label="Escrow payment protection" vals={[true, true, true, true]} />
                <TableRow label="Custom service pricing" vals={[false, true, true, true]} />
                <TableRow label="Payout speed" vals={["5 days", "5 days", "2 days", "Instant"]} />

                <TableGroup title="Analytics & CRM" />
                <TableRow label="Profile views dashboard" vals={[false, "Basic", "Advanced", "Enterprise"]} />
                <TableRow label="Lead tracking" vals={[false, false, true, true]} />
                <TableRow label="Conversion analytics" vals={[false, false, true, true]} />
                <TableRow label="Client CRM export" vals={[false, false, "CSV export", "API / webhook"]} />
                <TableRow label="Market demand insights" vals={[false, false, true, true]} />

                <TableGroup title="Support" />
                <TableRow label="Platform support" vals={["Ticket (72 h)", "Email (24 h)", "Live chat", "Priority"]} />
                <TableRow label="Profile optimization review" vals={[false, false, "One-time", "Quarterly"]} />
                <TableRow label="Dedicated account manager" vals={[false, false, false, true]} />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section className="bg-mist py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold tracking-tight text-navy md:text-4xl">Common questions</h2>
          <div className="flex flex-col gap-3">
            {[
              {
                q: "Does Verixa replace my own website?",
                a: "No. Your Verixa profile is where applicants searching for a licensed consultant find you and book. Link to it from your site, and to your site from it.",
              },
              {
                q: "What happens if I don't upgrade?",
                a: `You stay on Free for as long as you like. You can verify your licence and accept bookings${
                  free ? `; each booking carries a ${free.commission}% platform fee` : ""
                }.`,
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. You can move back to Free from your consultant dashboard.",
              },
              {
                q: "How does the platform fee work?",
                a: `The fee for your plan${
                  starter ? ` (for example ${starter.commission}% on ${starter.name})` : ""
                } is deducted from the consultation payment before the escrow amount is paid out to your bank account.`,
              },
            ].map((item) => (
              <details key={item.q} className="group rounded-2xl border border-gray-200 bg-white [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-5 py-4 font-bold text-navy">
                  {item.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-teal transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-700">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── FINAL CTA ───────────── */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-navy p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
              You earned the licence. Make it visible.
            </h2>
            <p className="text-white/80">Free to claim. Upgrade only if the bookings justify it.</p>
          </div>
          <Link
            href="/register"
            className="inline-flex min-h-14 shrink-0 items-center justify-center rounded-2xl bg-white px-7 text-lg font-bold text-navy transition-colors hover:bg-teal hover:text-white"
          >
            Create a free account
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// --- HELPER COMPONENTS ---

const FALLBACK_COLUMNS = [
  { slug: "free", name: "Free" },
  { slug: "starter", name: "Starter" },
  { slug: "growth", name: "Growth" },
  { slug: "pro", name: "Pro" },
];

function TableGroup({ title }: { title: string }) {
  return (
    <tr className="bg-mist">
      <th scope="colgroup" colSpan={5} className="border-t border-gray-200 p-3 text-start text-xs font-bold uppercase tracking-wider text-navy">
        {title}
      </th>
    </tr>
  );
}

function TableRow({ label, vals, highlight = false }: { label: string; vals: React.ReactNode[]; highlight?: boolean }) {
  return (
    <tr className={`border-b border-gray-100 ${highlight ? "bg-teal/5" : ""}`}>
      <th scope="row" className={`p-4 text-start font-medium ${highlight ? "font-bold text-navy" : "text-gray-700"}`}>
        {label}
      </th>
      {vals.map((v, i) => (
        <td key={i} className={`p-4 text-center ${highlight ? "font-bold text-navy" : ""}`}>
          {typeof v === "boolean" ? (
            v ? (
              <Check className="mx-auto h-4 w-4 text-teal" aria-label="Included" />
            ) : (
              <Minus className="mx-auto h-4 w-4 text-gray-300" aria-label="Not included" />
            )
          ) : (
            v
          )}
        </td>
      ))}
    </tr>
  );
}
