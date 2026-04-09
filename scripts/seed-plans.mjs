// ============================================================================
// scripts/seed-plans.mjs
// Run: node --env-file=.env.local scripts/seed-plans.mjs
// Seeds: Plans, Features, PlanFeature matrix with REAL Verixa data
// ============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── PLANS ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    slug: "free",
    name: "Free",
    description: "Basic presence. Organic discovery.",
    priceCents: 0,
    yearlyPriceCents: 0,
    commission: 21,
    isActive: true,
    isRecommended: false,
    sortOrder: 0,
  },
  {
    slug: "starter",
    name: "Starter",
    description: "For independent professionals.",
    priceCents: 2100,         // $21/month
    yearlyPriceCents: 21600,  // $216/year → $18/mo (13% OFF)
    commission: 8,
    isActive: true,
    isRecommended: false,
    sortOrder: 1,
  },
  {
    slug: "growth",
    name: "Growth",
    description: "Maximum ROI and dedicated exposure.",
    priceCents: 5500,         // $55/month
    yearlyPriceCents: 51600,  // $516/year → $43/mo (21% OFF)
    commission: 3,
    isActive: true,
    isRecommended: true,
    sortOrder: 2,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "For established firms and agencies.",
    priceCents: 19900,        // $199/month
    yearlyPriceCents: 25200,  // $252/year → $21/mo (89% OFF launch price)
    commission: 0,
    isActive: true,
    isRecommended: false,
    sortOrder: 3,
  },
];

// ─── FEATURES ─────────────────────────────────────────────────────────────────
// category: visibility | trust | booking | financial | analytics | premium
const FEATURES = [
  // ── VISIBILITY & SEO ──
  {
    key: "search_ranking",
    name: "Algorithmic Search Ranking",
    description: "Priority placement in search results based on subscription tier",
    category: "visibility",
    type: "limit",
    sortOrder: 10,
  },
  {
    key: "google_indexing",
    name: "Google Search Indexing",
    description: "Profile is indexed and discoverable on Google",
    category: "visibility",
    type: "boolean",
    sortOrder: 20,
  },
  {
    key: "competitor_ads_removed",
    name: "Competitor Ad Removal",
    description: "No competitor ads shown on your profile page",
    category: "visibility",
    type: "boolean",
    sortOrder: 30,
  },
  {
    key: "featured_badge",
    name: "Featured Consultant Badge",
    description: "Prominent 'Featured' badge on profile and search listings",
    category: "visibility",
    type: "boolean",
    sortOrder: 40,
  },
  {
    key: "category_dominance",
    name: "Category Dominance (e.g. Study Visas)",
    description: "Number of immigration categories where profile ranks at the top",
    category: "visibility",
    type: "limit",
    sortOrder: 50,
  },
  {
    key: "geographic_targeting",
    name: "Geographic Targeting",
    description: "Geographic reach of profile visibility",
    category: "visibility",
    type: "limit",
    sortOrder: 60,
  },
  {
    key: "max_specializations",
    name: "Max Immigration Specializations",
    description: "Number of immigration pathways a consultant can select",
    category: "visibility",
    type: "limit",
    sortOrder: 70,
  },

  // ── TRUST & IDENTITY ──
  {
    key: "cicc_verification_badge",
    name: "CICC/Law Society Verification Badge",
    description: "Verified license badge displayed on profile",
    category: "trust",
    type: "boolean",
    sortOrder: 10,
  },
  {
    key: "review_collection",
    name: "Structured Review Collection",
    description: "Clients can leave verified reviews after consultations",
    category: "trust",
    type: "boolean",
    sortOrder: 20,
  },
  {
    key: "review_response",
    name: "Review Response Management",
    description: "Ability to publicly respond to client reviews",
    category: "trust",
    type: "boolean",
    sortOrder: 30,
  },
  {
    key: "custom_branding",
    name: "Custom Profile Cover & Branding",
    description: "Customize profile header, photo, and brand colors",
    category: "trust",
    type: "limit",
    sortOrder: 40,
  },
  {
    key: "custom_domain",
    name: "Custom Domain Routing",
    description: "Map your own domain (e.g. yourname.com) to your Verixa profile",
    category: "trust",
    type: "boolean",
    sortOrder: 50,
  },
  {
    key: "trust_score_multiplier",
    name: "Trust Score Multiplier",
    description: "Algorithmic weight applied to review and engagement signals",
    category: "trust",
    type: "limit",
    sortOrder: 60,
  },

  // ── BOOKING & CLIENT ACQUISITION ──
  {
    key: "direct_booking",
    name: "Direct Calendar Booking",
    description: "Clients book consultations directly from your profile",
    category: "booking",
    type: "boolean",
    sortOrder: 10,
  },
  {
    key: "calendar_sync",
    name: "Calendar Sync (Outlook/Google)",
    description: "Automatic two-way sync with Google Calendar and Outlook",
    category: "booking",
    type: "limit",
    sortOrder: 20,
  },
  {
    key: "consultation_types",
    name: "Consultation Types (e.g. 15min, 1h)",
    description: "Number of different consultation session types you can offer",
    category: "booking",
    type: "limit",
    sortOrder: 30,
  },
  {
    key: "email_reminders",
    name: "Automated Email Reminders",
    description: "Automatic appointment reminder emails to clients",
    category: "booking",
    type: "boolean",
    sortOrder: 40,
  },
  {
    key: "sms_reminders",
    name: "Automated SMS Reminders (Anti No-Show)",
    description: "SMS reminders to reduce client no-shows",
    category: "booking",
    type: "boolean",
    sortOrder: 50,
  },
  {
    key: "prebooking_questionnaire",
    name: "Pre-Booking Custom Questionnaire",
    description: "Collect client information before the consultation",
    category: "booking",
    type: "limit",
    sortOrder: 60,
  },

  // ── FINANCIALS & ESCROW ──
  {
    key: "escrow_protection",
    name: "Escrow Financial Protection",
    description: "All payments held in escrow until consultation is completed",
    category: "financial",
    type: "boolean",
    sortOrder: 10,
  },
  {
    key: "dynamic_service_pricing",
    name: "Targeted Service Pricing (Dynamic)",
    description: "Set different prices per consultation type and service",
    category: "financial",
    type: "boolean",
    sortOrder: 20,
  },
  {
    key: "payout_speed",
    name: "Payout Dispatch Speed",
    description: "How fast earnings are transferred to your bank account",
    category: "financial",
    type: "limit",
    sortOrder: 30,
  },

  // ── ANALYTICS & CRM ──
  {
    key: "profile_views_dashboard",
    name: "Profile Views Dashboard",
    description: "See who viewed your profile and when",
    category: "analytics",
    type: "limit",
    sortOrder: 10,
  },
  {
    key: "lead_tracking",
    name: "High-Intent Lead Tracking",
    description: "Identify visitors who are actively searching for a consultant",
    category: "analytics",
    type: "boolean",
    sortOrder: 20,
  },
  {
    key: "conversion_analytics",
    name: "Conversion Rate Analytics",
    description: "Track conversion from profile views to bookings",
    category: "analytics",
    type: "boolean",
    sortOrder: 30,
  },
  {
    key: "crm_export",
    name: "Client CRM Export",
    description: "Export client data for use in external CRM tools",
    category: "analytics",
    type: "limit",
    sortOrder: 40,
  },
  {
    key: "market_demand_insights",
    name: "Market Demand Insights",
    description: "See trending immigration categories and client demand signals",
    category: "analytics",
    type: "boolean",
    sortOrder: 50,
  },

  // ── SUPPORT & SETUP ──
  {
    key: "platform_support",
    name: "Platform Support",
    description: "Support channel and response time",
    category: "premium",
    type: "limit",
    sortOrder: 10,
  },
  {
    key: "profile_audit",
    name: "Profile Optimization Audit",
    description: "Expert review and recommendations to maximize your profile performance",
    category: "premium",
    type: "limit",
    sortOrder: 20,
  },
  {
    key: "account_manager",
    name: "Dedicated Account Manager",
    description: "Personal account manager for onboarding and ongoing success",
    category: "premium",
    type: "boolean",
    sortOrder: 30,
  },
];

// ─── PLAN-FEATURE MATRIX ──────────────────────────────────────────────────────
// Format: { featureKey: { free, starter, growth, pro } }
// For boolean: true/false
// For limit: string value (or null = disabled)
const MATRIX = {
  // Visibility
  search_ranking:          { free: "Basic",      starter: "Boosted",      growth: "High Priority", pro: "Maximum"              },
  google_indexing:         { free: false,         starter: true,           growth: true,             pro: true                  },
  competitor_ads_removed:  { free: false,         starter: false,          growth: true,             pro: true                  },
  featured_badge:          { free: false,         starter: false,          growth: true,             pro: true                  },
  category_dominance:      { free: "None",        starter: "1 Category",   growth: "3 Categories",   pro: "Unlimited"           },
  geographic_targeting:    { free: "City",        starter: "Province",     growth: "National",        pro: "Global"              },
  max_specializations:     { free: "3",           starter: "5",            growth: "10",              pro: "unlimited"           },

  // Trust
  cicc_verification_badge: { free: true,          starter: true,           growth: true,             pro: true                  },
  review_collection:       { free: true,          starter: true,           growth: true,             pro: true                  },
  review_response:         { free: false,         starter: true,           growth: true,             pro: true                  },
  custom_branding:         { free: null,          starter: "Basic",        growth: "Advanced",        pro: "Full Agency"         },
  custom_domain:           { free: false,         starter: false,          growth: false,             pro: true                  },
  trust_score_multiplier:  { free: "1.0x",        starter: "1.2x",         growth: "1.5x",            pro: "2.0x"                },

  // Booking
  direct_booking:          { free: true,          starter: true,           growth: true,             pro: true                  },
  calendar_sync:           { free: "Basic",       starter: "Automatic",    growth: "Automatic",       pro: "Automatic"           },
  consultation_types:      { free: "1 Type",      starter: "3 Types",      growth: "Unlimited",       pro: "Unlimited"           },
  email_reminders:         { free: true,          starter: true,           growth: true,             pro: true                  },
  sms_reminders:           { free: false,         starter: false,          growth: true,             pro: true                  },
  prebooking_questionnaire:{ free: null,          starter: "Standard",     growth: "Custom",          pro: "Advanced Routing"    },

  // Financial
  escrow_protection:       { free: true,          starter: true,           growth: true,             pro: true                  },
  dynamic_service_pricing: { free: false,         starter: true,           growth: true,             pro: true                  },
  payout_speed:            { free: "5 Days",      starter: "5 Days",       growth: "Priority (2 Days)", pro: "Instant"           },

  // Analytics
  profile_views_dashboard: { free: null,          starter: "Basic",        growth: "Advanced",        pro: "Enterprise"          },
  lead_tracking:           { free: false,         starter: false,          growth: true,             pro: true                  },
  conversion_analytics:    { free: false,         starter: false,          growth: true,             pro: true                  },
  crm_export:              { free: null,          starter: null,           growth: "CSV Export",      pro: "API / Webhook"       },
  market_demand_insights:  { free: false,         starter: false,          growth: true,             pro: true                  },

  // Support
  platform_support:        { free: "Ticket (72h)", starter: "Email (24h)", growth: "Live Chat",      pro: "24/7 Priority"       },
  profile_audit:           { free: null,          starter: null,           growth: "One-Time",        pro: "Quarterly"           },
  account_manager:         { free: false,         starter: false,          growth: false,             pro: true                  },
};

// ─── SEED FUNCTION ────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting Verixa Plans seed...\n");

  // 1. Upsert Plans
  console.log("📋 Seeding plans...");
  const planMap = {}; // slug → plan id
  for (const planData of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { slug: planData.slug },
      update: {
        name: planData.name,
        description: planData.description,
        priceCents: planData.priceCents,
        yearlyPriceCents: planData.yearlyPriceCents,
        commission: planData.commission,
        isActive: planData.isActive,
        isRecommended: planData.isRecommended,
        sortOrder: planData.sortOrder,
      },
      create: planData,
    });
    planMap[planData.slug] = plan.id;
    console.log(`  ✓ Plan: ${plan.name} — $${(plan.priceCents / 100).toFixed(0)}/mo, ${plan.commission}% commission`);
  }

  // 2. Upsert Features
  console.log("\n🔧 Seeding features...");
  const featureMap = {}; // key → feature id
  for (const featureData of FEATURES) {
    const feature = await prisma.feature.upsert({
      where: { key: featureData.key },
      update: {
        name: featureData.name,
        description: featureData.description,
        category: featureData.category,
        type: featureData.type,
        sortOrder: featureData.sortOrder,
      },
      create: featureData,
    });
    featureMap[featureData.key] = feature.id;
    console.log(`  ✓ Feature: [${feature.category}] ${feature.name}`);
  }

  // 3. Seed PlanFeature matrix
  console.log("\n🔗 Seeding plan-feature matrix...");
  let matrixCount = 0;

  for (const [featureKey, planValues] of Object.entries(MATRIX)) {
    const featureId = featureMap[featureKey];
    if (!featureId) {
      console.warn(`  ⚠️  Feature key not found: ${featureKey}`);
      continue;
    }

    for (const [planSlug, rawValue] of Object.entries(planValues)) {
      const planId = planMap[planSlug];
      if (!planId) {
        console.warn(`  ⚠️  Plan slug not found: ${planSlug}`);
        continue;
      }

      // Determine enabled and value
      let enabled = false;
      let value = null;

      if (typeof rawValue === "boolean") {
        enabled = rawValue;
        value = null;
      } else if (rawValue === null) {
        enabled = false;
        value = null;
      } else {
        // String value (limit type)
        enabled = true;
        value = rawValue;
      }

      await prisma.planFeature.upsert({
        where: { planId_featureId: { planId, featureId } },
        update: { enabled, value },
        create: { planId, featureId, enabled, value },
      });

      matrixCount++;
    }
  }

  console.log(`  ✓ ${matrixCount} plan-feature entries seeded`);

  // 4. Summary
  const finalPlans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { planFeatures: true } } } });
  const finalFeatures = await prisma.feature.count();

  console.log("\n✅ Seed complete!\n");
  console.log("=".repeat(50));
  console.log(`Plans: ${finalPlans.length}`);
  finalPlans.forEach(p => {
    console.log(`  • ${p.name} (${p.slug}): $${(p.priceCents/100).toFixed(0)}/mo, ${p._count.planFeatures} features`);
  });
  console.log(`Features: ${finalFeatures}`);
  console.log("=".repeat(50));
}

seed()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
