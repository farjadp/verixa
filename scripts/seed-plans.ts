/**
 * seed-plans.ts
 * Run with: npx tsx scripts/seed-plans.ts
 * Seeds the SaaS plan system with 4 tiers and all feature definitions.
 * Safe to re-run — uses upsert everywhere.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── PLAN DEFINITIONS ──────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Free",
    slug: "free",
    description: "Get started with basic visibility on Verixa.",
    priceCents: 0,
    commission: 21,
    isActive: true,
    isRecommended: false,
    sortOrder: 0,
  },
  {
    name: "Starter",
    slug: "starter",
    description: "For consultants getting their first clients.",
    priceCents: 2900, // $29/mo
    commission: 8,
    isActive: true,
    isRecommended: false,
    sortOrder: 1,
  },
  {
    name: "Growth",
    slug: "growth",
    description: "For active consultants scaling their practice.",
    priceCents: 7900, // $79/mo
    commission: 3,
    isActive: true,
    isRecommended: true,
    sortOrder: 2,
  },
  {
    name: "Pro",
    slug: "pro",
    description: "Unlimited access. Zero commission. Full power.",
    priceCents: 19900, // $199/mo
    commission: 0,
    isActive: true,
    isRecommended: false,
    sortOrder: 3,
  },
];

// ─── FEATURE DEFINITIONS ───────────────────────────────────────────────────
const FEATURES = [
  // Visibility
  { key: "search_listing",       name: "Search Listing",           category: "visibility", type: "boolean", description: "Appear in Verixa search results.",                 sortOrder: 0 },
  { key: "search_boost",         name: "Search Boost",             category: "visibility", type: "boolean", description: "Priority placement in search results.",            sortOrder: 1 },
  { key: "geo_targeting",        name: "Geo Targeting",            category: "visibility", type: "boolean", description: "Appear prominently in location-based searches.",   sortOrder: 2 },

  // Trust
  { key: "verified_badge",       name: "Verified Badge",           category: "trust",      type: "boolean", description: "Display the Verixa Verified badge on profile.",   sortOrder: 0 },
  { key: "review_response",      name: "Review Responses",         category: "trust",      type: "boolean", description: "Publicly respond to client reviews.",              sortOrder: 1 },
  { key: "profile_branding",     name: "Profile Branding",         category: "trust",      type: "boolean", description: "Custom tagline and logo upload.",                 sortOrder: 2 },
  { key: "custom_bio",           name: "Professional Bio",         category: "trust",      type: "limit",   description: "Write a rich-text professional background bio.",    sortOrder: 3 },


  // Booking
  { key: "booking_enabled",      name: "Booking System",           category: "booking",    type: "boolean", description: "Accept bookings directly through Verixa.",        sortOrder: 0 },
  { key: "consultation_types",   name: "Consultation Types",       category: "booking",    type: "limit",   description: "Max number of consultation service types.",       sortOrder: 1 },
  { key: "sms_reminder",         name: "SMS Reminders",            category: "booking",    type: "boolean", description: "Automated SMS reminders for sessions.",           sortOrder: 2 },
  { key: "calendar_sync",        name: "Calendar Sync",            category: "booking",    type: "boolean", description: "Sync availability with Google Calendar.",         sortOrder: 3 },

  // Analytics
  { key: "basic_analytics",      name: "Basic Analytics",          category: "analytics",  type: "boolean", description: "View profile views and booking counts.",          sortOrder: 0 },
  { key: "advanced_analytics",   name: "Advanced Analytics",       category: "analytics",  type: "boolean", description: "Full analytics: traffic sources, UTM, trends.",  sortOrder: 1 },
  { key: "competitor_insight",   name: "Competitor Insights",      category: "analytics",  type: "boolean", description: "Benchmark against peers in your specialization.", sortOrder: 2 },

  // Financial
  { key: "payout_speed",         name: "Payout Speed",             category: "financial",  type: "limit",   description: "How quickly earnings are released (days).",       sortOrder: 0 },
  { key: "revenue_dashboard",    name: "Revenue Dashboard",        category: "financial",  type: "boolean", description: "Real-time revenue and net earnings tracking.",    sortOrder: 1 },

  // Premium
  { key: "no_competitor_ads",    name: "No Competitor Ads",        category: "premium",    type: "boolean", description: "Competitors won't appear on your profile page.",  sortOrder: 0 },
  { key: "priority_support",     name: "Priority Support",         category: "premium",    type: "boolean", description: "Dedicated support channel with faster response.",  sortOrder: 1 },
  { key: "custom_availability",  name: "Custom Availability",      category: "premium",    type: "boolean", description: "Block dates, set seasonal schedules.",            sortOrder: 2 },
  { key: "unlimited_messengers", name: "Unlimited Messengers",     category: "premium",    type: "boolean", description: "Add multiple messaging apps to your profile.",     sortOrder: 3 },
];

// ─── PLAN × FEATURE MATRIX ─────────────────────────────────────────────────
// Format: featureKey → { free, starter, growth, pro }
// For booleans: true/false. For limits: "1", "3", "unlimited", etc.
const MATRIX: Record<string, { free: string | boolean; starter: string | boolean; growth: string | boolean; pro: string | boolean }> = {
  search_listing:      { free: true,     starter: true,        growth: true,        pro: true        },
  search_boost:        { free: false,    starter: false,       growth: true,        pro: true        },
  geo_targeting:       { free: false,    starter: false,       growth: true,        pro: true        },

  verified_badge:      { free: false,    starter: true,        growth: true,        pro: true        },
  review_response:     { free: false,    starter: true,        growth: true,        pro: true        },
  profile_branding:    { free: false,    starter: true,        growth: true,        pro: true        },
  custom_bio:          { free: '{"maxLength": 500}', starter: '{"maxLength": 2000}', growth: 'unlimited', pro: 'unlimited' },


  booking_enabled:     { free: true,     starter: true,        growth: true,        pro: true        },
  consultation_types:  { free: "1",      starter: "3",         growth: "unlimited", pro: "unlimited" },
  sms_reminder:        { free: false,    starter: false,       growth: true,        pro: true        },
  calendar_sync:       { free: false,    starter: false,       growth: true,        pro: true        },

  basic_analytics:     { free: true,     starter: true,        growth: true,        pro: true        },
  advanced_analytics:  { free: false,    starter: false,       growth: true,        pro: true        },
  competitor_insight:  { free: false,    starter: false,       growth: true,        pro: true        },

  payout_speed:        { free: "14",     starter: "7",         growth: "3",         pro: "1"         },
  revenue_dashboard:   { free: false,    starter: true,        growth: true,        pro: true        },

  no_competitor_ads:   { free: false,    starter: false,       growth: false,       pro: true        },
  priority_support:    { free: false,    starter: false,       growth: true,        pro: true        },
  custom_availability: { free: false,    starter: true,        growth: true,        pro: true        },
  unlimited_messengers:{ free: false,    starter: false,       growth: false,       pro: true        },
};

async function main() {
  console.log("🌱 Seeding SaaS Plans & Features...\n");

  // 1. Upsert all features
  const featureMap: Record<string, string> = {};
  for (const f of FEATURES) {
    const feature = await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description, category: f.category, type: f.type, sortOrder: f.sortOrder },
      create: f,
    });
    featureMap[f.key] = feature.id;
  }
  console.log(`✅ ${FEATURES.length} features seeded.`);

  // 2. Upsert all plans
  const planMap: Record<string, string> = {};
  for (const p of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      update: { name: p.name, priceCents: p.priceCents, commission: p.commission, isRecommended: p.isRecommended, sortOrder: p.sortOrder, description: p.description },
      create: p,
    });
    planMap[p.slug] = plan.id;
  }
  console.log(`✅ ${PLANS.length} plans seeded.`);

  // 3. Populate PlanFeature matrix
  let upserted = 0;
  for (const [featureKey, tiers] of Object.entries(MATRIX)) {
    const featureId = featureMap[featureKey];
    if (!featureId) continue;

    for (const [planSlug, rawValue] of Object.entries(tiers)) {
      const planId = planMap[planSlug];
      if (!planId) continue;

      const enabled = typeof rawValue === "boolean" ? rawValue : true;
      const value   = typeof rawValue === "string"  ? rawValue : null;

      await prisma.planFeature.upsert({
        where: { planId_featureId: { planId, featureId } },
        update: { enabled, value },
        create: { planId, featureId, enabled, value },
      });
      upserted++;
    }
  }
  console.log(`✅ ${upserted} plan-feature entries seeded.`);
  console.log("\n🎉 SaaS seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
