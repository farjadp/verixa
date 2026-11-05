// ============================================================================
// Hardware Source: src/app/search/page.tsx
// Route: /search
// Version: 2.0.0 — 2026-11-05 (Pathfinder design language)
// Why: Primary discovery route where users filter and find consultants; core intent-capture surface.
// Domain: Public Acquisition
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Public trust surface; prioritize resilient rendering and graceful fallback behavior on data-source failure.
// Critical Path: Highest intent entry for lead generation and consultant profile traffic.
// Primary Dependencies: Search query params, consultant lookup layer, pagination/sort, filter normalization.
// Failure Strategy: Return empty-state UX with preserved filters instead of hard-failing requests.
// ============================================================================
import {
  Search as SearchIcon,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrackPageView from "@/components/TrackPageView";
import ConsultantCard, { type LicenceStanding } from "@/components/home/ConsultantCard";
import { prisma } from "@/lib/prisma";
import { parseList, type HomeConsultant } from "@/lib/home-data";
import { ALL_SPECIALIZATION_ITEMS, ALL_LANGUAGES } from "@/lib/immigration-paths";

const PAGE_SIZE = 24;

/** Every filter the page understands, as read from the URL. */
interface Filters {
  q: string;
  status: string;
  province: string;
  city: string;
  claimed: string;
  rating: string;
  spec: string;
  lang: string;
}

const FILTER_KEYS: (keyof Filters)[] = ["q", "status", "province", "city", "claimed", "rating", "spec", "lang"];

/** Builds a /search URL from the current filters with some keys replaced or removed. */
function searchHref(filters: Filters, overrides: Partial<Filters> & { page?: number } = {}): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = key in overrides ? overrides[key] : filters[key];
    if (value) params.set(key, value);
  }
  if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

/** The CICC register stores standing as "Yes"/"No"; a few rows use words. */
function standingOf(status: string): LicenceStanding {
  const s = status.trim().toLowerCase();
  if (s === "yes" || s.includes("active")) return s.includes("inactive") ? "inactive" : "active";
  if (s === "no" || s.includes("inactive") || s.includes("suspend") || s.includes("revoked")) return "inactive";
  return "unknown";
}

function statusLabel(status: string): string {
  if (status === "Yes") return "Active licence";
  if (status === "No") return "Inactive licence";
  return status;
}

type ProfileRow = {
  licenseNumber: string;
  fullName: string;
  status: string | null;
  company: string | null;
  city: string | null;
  province: string | null;
  avatarImage: string | null;
  languages: string | null;
  userId: string | null;
  reviews?: { rating: number }[];
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const read = (key: string) => (typeof resolvedParams[key] === "string" ? (resolvedParams[key] as string) : "");
  const filters: Filters = {
    q: read("q"),
    status: read("status"),
    province: read("province"),
    city: read("city"),
    claimed: read("claimed"),
    rating: read("rating"),
    spec: read("spec"),
    lang: read("lang"),
  };
  const { q } = filters;

  let page = parseInt(read("page") || "1", 10);
  if (isNaN(page) || page < 1) page = 1;
  const skip = (page - 1) * PAGE_SIZE;

  // ─── Build Postgres WHERE ──────────────────────────────────────────────────
  const where: Prisma.ConsultantProfileWhereInput = {};

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { licenseNumber: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filters.status) where.status = { contains: filters.status, mode: "insensitive" };
  if (filters.province) where.province = { contains: filters.province, mode: "insensitive" };
  if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };
  // "Verified on Verixa" — claimed profiles have a linked userId
  if (filters.claimed === "true") where.userId = { not: null };
  if (filters.spec) where.specializations = { contains: `"${filters.spec}"` };
  if (filters.lang) where.languages = { contains: filters.lang, mode: "insensitive" };

  // Rating filter is applied in-memory after fetch
  let minRating: number | null = null;
  if (filters.rating) {
    const parsed = parseFloat(filters.rating);
    if (!isNaN(parsed)) minRating = parsed;
  }
  // Profiles without reviews can never pass a rating filter; skip them in SQL.
  if (minRating !== null) where.reviews = { some: {} };

  // ─── Fetch profiles + facets (degrade to empty on DB failure) ─────────────
  const fetchAll = minRating !== null; // need all to filter by rating
  let profiles: ProfileRow[] = [];
  let total = 0;
  let provinces: string[] = [];
  let statuses: string[] = [];
  let loadFailed = false;

  try {
    const [profilesRaw, totalCount, provinceRows, statusRows] = await Promise.all([
      prisma.consultantProfile.findMany({
        where,
        select: {
          licenseNumber: true,
          fullName: true,
          status: true,
          company: true,
          city: true,
          province: true,
          avatarImage: true,
          languages: true,
          userId: true,
          reviews: minRating !== null ? { select: { rating: true } } : false,
        },
        orderBy: [
          { userId: { sort: "desc", nulls: "last" } }, // claimed profiles surface first
          { fullName: "asc" },
        ],
        take: fetchAll ? undefined : PAGE_SIZE,
        skip: fetchAll ? undefined : skip,
      }),
      prisma.consultantProfile.count({ where }),
      prisma.consultantProfile.findMany({
        select: { province: true },
        distinct: ["province"],
        where: { province: { not: undefined, gt: "" } },
        orderBy: { province: "asc" },
      }),
      prisma.consultantProfile.findMany({
        select: { status: true },
        distinct: ["status"],
        where: { status: { not: undefined, gt: "" } },
        orderBy: { status: "asc" },
      }),
    ]);

    profiles = profilesRaw as ProfileRow[];
    total = totalCount;
    provinces = provinceRows.map((r) => r.province).filter((p): p is string => Boolean(p));
    statuses = statusRows.map((r) => r.status).filter((s): s is string => Boolean(s));

    if (minRating !== null) {
      const threshold = minRating;
      const rated = profiles.filter((p) => {
        if (!p.reviews || p.reviews.length === 0) return false;
        const avg = p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;
        return avg >= threshold;
      });
      total = rated.length;
      profiles = rated.slice(skip, skip + PAGE_SIZE);
    }
  } catch (err) {
    console.error("Search: consultant lookup failed", err);
    loadFailed = true;
  }

  const results = profiles.map((p) => ({
    consultant: {
      licenseNumber: p.licenseNumber,
      // A few register rows start with stray punctuation (". Amandeep Kaur").
      fullName: p.fullName.replace(/^[^\p{L}]+/u, "") || p.fullName,
      company: p.company,
      city: p.city,
      province: p.province,
      avatarImage: p.avatarImage,
      languages: parseList(p.languages).slice(0, 3),
      claimed: p.userId !== null,
    } satisfies HomeConsultant,
    standing: standingOf(p.status || ""),
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ─── Active filter chips ──────────────────────────────────────────────────
  const specLabel = ALL_SPECIALIZATION_ITEMS.find((i) => i.key === filters.spec)?.label ?? filters.spec;
  const chips: { label: string; href: string }[] = [
    filters.q && { label: `“${filters.q}”`, href: searchHref(filters, { q: "" }) },
    filters.claimed === "true" && { label: "Verified on Verixa", href: searchHref(filters, { claimed: "" }) },
    filters.status && { label: statusLabel(filters.status), href: searchHref(filters, { status: "" }) },
    filters.province && { label: filters.province, href: searchHref(filters, { province: "" }) },
    filters.city && { label: filters.city, href: searchHref(filters, { city: "" }) },
    filters.spec && { label: specLabel, href: searchHref(filters, { spec: "" }) },
    filters.lang && { label: filters.lang, href: searchHref(filters, { lang: "" }) },
    filters.rating && { label: `${filters.rating}★ and up`, href: searchHref(filters, { rating: "" }) },
  ].filter((c): c is { label: string; href: string } => Boolean(c));

  const filterPanel = (
    <FilterPanel filters={filters} provinces={provinces} statuses={statuses} hasActive={chips.length > 0} />
  );

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-ink">
      <TrackPageView
        eventName="search_performed"
        metadata={{ q, statusFilter: filters.status, provinceFilter: filters.province, page }}
      />
      <Header />

      {/* ───────────── SEARCH HERO ───────────── */}
      <section className="border-b border-gray-200 bg-mist pt-28 lg:pt-36">
        <div className="mx-auto max-w-7xl px-6 pb-10 lg:px-8 lg:pb-12">
          <div className="flex max-w-3xl flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              Every result is on the CICC public register
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-navy md:text-5xl">
              Find a licensed RCIC
            </h1>
            <p className="text-lg leading-relaxed text-gray-600">
              Search by name, licence number or firm. Narrow by province, language and area of practice, then check
              each consultant&apos;s licence standing before you book.
            </p>

            <form action="/search" method="GET" role="search" className="mt-2">
              {FILTER_KEYS.filter((k) => k !== "q" && filters[k]).map((k) => (
                <input key={k} type="hidden" name={k} value={filters[k]} />
              ))}
              <label htmlFor="search-q" className="sr-only">
                Name, licence number or company
              </label>
              <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/10 sm:flex-row">
                <div className="flex min-h-12 flex-1 items-center gap-3 px-3">
                  <SearchIcon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                  <input
                    id="search-q"
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Name, licence number (R123456) or company"
                    className="w-full bg-transparent text-base text-ink outline-none placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-6 text-base font-bold text-white transition-colors hover:bg-navy"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10 lg:flex-row lg:gap-12 lg:px-8 lg:py-12">
        {/* Mobile filters: collapsed by default */}
        <details className="group rounded-2xl border border-gray-200 bg-white lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 font-bold text-navy [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters{chips.length > 0 ? ` (${chips.length})` : ""}
            </span>
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden="true" />
          </summary>
          <div className="border-t border-gray-200 p-5">{filterPanel}</div>
        </details>

        {/* Desktop filters */}
        <aside className="hidden w-72 shrink-0 lg:block" aria-label="Filters">
          <div className="sticky top-28">{filterPanel}</div>
        </aside>

        {/* ───────────── RESULTS ───────────── */}
        <section className="min-w-0 flex-1" aria-labelledby="results-heading">
          <div className="mb-5 flex flex-col gap-3">
            <h2 id="results-heading" className="text-base font-bold text-navy">
              {loadFailed ? (
                "Search is temporarily unavailable"
              ) : total > 0 ? (
                <>
                  <span className="text-ink">{total.toLocaleString("en-CA")}</span>{" "}
                  <span className="font-medium text-gray-600">
                    {total === 1 ? "consultant" : "consultants"} · showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)}
                  </span>
                </>
              ) : (
                "No consultants match"
              )}
            </h2>
            {chips.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Active filters">
                {chips.map((chip) => (
                  <li key={chip.label}>
                    <Link
                      href={chip.href}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-sm font-semibold text-navy transition-colors hover:border-navy"
                      aria-label={`Remove filter ${chip.label}`}
                    >
                      {chip.label}
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/search" className="inline-flex min-h-9 items-center px-2 text-sm font-bold text-teal hover:text-navy">
                    Clear all
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-mist px-6 py-16 text-center">
              <SearchX className="h-10 w-10 text-gray-400" aria-hidden="true" />
              <div className="flex max-w-md flex-col gap-2">
                <p className="text-lg font-bold text-navy">
                  {loadFailed ? "We couldn't reach the register just now." : "No licensed consultants match these filters."}
                </p>
                <p className="text-sm text-gray-600">
                  {loadFailed
                    ? "Please try again in a moment. Your filters are kept in the address bar."
                    : "Try removing a filter, or search by a consultant's last name or licence number."}
                </p>
              </div>
              <Link
                href="/search"
                className="inline-flex min-h-11 items-center rounded-xl border border-navy bg-white px-5 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                Browse all consultants
              </Link>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {results.map(({ consultant, standing }) => (
                  <li key={consultant.licenseNumber} className="h-full">
                    <ConsultantCard consultant={consultant} variant="row" standing={standing} />
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
                  <PageLink href={page > 1 ? searchHref(filters, { page: page - 1 }) : null} label="Previous page">
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </PageLink>
                  <p className="px-3 text-sm font-semibold text-gray-600">
                    Page <span className="font-bold text-navy">{page}</span> of {totalPages.toLocaleString("en-CA")}
                  </p>
                  <PageLink href={page < totalPages ? searchHref(filters, { page: page + 1 }) : null} label="Next page">
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </PageLink>
                </nav>
              )}
            </>
          )}

          <p className="mt-10 flex items-start gap-2 rounded-2xl bg-mist p-4 text-sm text-gray-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
            Licence data comes from the College of Immigration and Citizenship Consultants public register. Always
            confirm a consultant&apos;s standing on the CICC register before you sign a retainer.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function PageLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const base = "flex h-11 w-11 items-center justify-center rounded-xl border transition-colors";
  if (!href) {
    return (
      <span className={`${base} cursor-not-allowed border-gray-200 text-gray-300`} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={`${base} border-gray-200 bg-white text-navy hover:border-navy`}>
      {children}
    </Link>
  );
}

const selectClass =
  "min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-ink focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10";

function FilterPanel({
  filters,
  provinces,
  statuses,
  hasActive,
}: {
  filters: Filters;
  provinces: string[];
  statuses: string[];
  hasActive: boolean;
}) {
  const verifiedOn = filters.claimed === "true";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-teal">Filters</h2>
        {hasActive && (
          <Link href="/search" className="text-xs font-bold text-navy hover:text-teal">
            Clear all
          </Link>
        )}
      </div>

      {/* Verified on Verixa */}
      <Link
        href={searchHref(filters, { claimed: verifiedOn ? "" : "true" })}
        role="switch"
        aria-checked={verifiedOn}
        className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 transition-colors ${
          verifiedOn ? "border-teal bg-teal/10 text-navy" : "border-gray-200 bg-white text-gray-600 hover:border-navy"
        }`}
      >
        <span className="inline-flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className={`h-4 w-4 ${verifiedOn ? "text-teal" : "text-gray-400"}`} aria-hidden="true" />
          Verified on Verixa only
        </span>
        <span
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${verifiedOn ? "bg-teal" : "bg-gray-200"}`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${verifiedOn ? "left-5" : "left-1"}`}
          />
        </span>
      </Link>

      {/* Selects (submit together) */}
      <form action="/search" method="GET" className="flex flex-col gap-5">
        {(["q", "status", "province", "city", "claimed"] as const)
          .filter((k) => filters[k])
          .map((k) => (
            <input key={k} type="hidden" name={k} value={filters[k]} />
          ))}

        <FilterField label="Area of practice" htmlFor="f-spec">
          <select id="f-spec" name="spec" className={selectClass} defaultValue={filters.spec}>
            <option value="">Any area</option>
            {ALL_SPECIALIZATION_ITEMS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Spoken language" htmlFor="f-lang">
          <select id="f-lang" name="lang" className={selectClass} defaultValue={filters.lang}>
            <option value="">Any language</option>
            {ALL_LANGUAGES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Minimum rating" htmlFor="f-rating">
          <select id="f-rating" name="rating" className={selectClass} defaultValue={filters.rating}>
            <option value="">Any rating</option>
            <option value="4">4.0 stars and up</option>
            <option value="4.5">4.5 stars and up</option>
            <option value="5">5.0 stars</option>
          </select>
        </FilterField>

        <button
          type="submit"
          className="min-h-11 rounded-xl bg-navy text-sm font-bold text-white transition-colors hover:bg-teal"
        >
          Apply filters
        </button>
      </form>

      {/* Licence standing */}
      {statuses.length > 0 && (
        <FilterGroup title="Licence standing">
          <div className="flex flex-wrap gap-2">
            {["", ...statuses].map((s) => (
              <FilterPill key={s || "all"} href={searchHref(filters, { status: s })} active={filters.status === s}>
                {s ? statusLabel(s) : "Any standing"}
              </FilterPill>
            ))}
          </div>
        </FilterGroup>
      )}

      {/* Province */}
      {provinces.length > 0 && (
        <FilterGroup title="Province">
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
            {["", ...provinces].map((p) => (
              <Link
                key={p || "all"}
                href={searchHref(filters, { province: p })}
                aria-current={filters.province === p ? "true" : undefined}
                className={`flex min-h-10 items-center rounded-lg px-3 text-sm transition-colors ${
                  filters.province === p ? "bg-mist font-bold text-navy" : "text-gray-600 hover:bg-mist hover:text-navy"
                }`}
              >
                {p || "All provinces"}
              </Link>
            ))}
          </div>
        </FilterGroup>
      )}
    </div>
  );
}

function FilterField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-bold text-navy">
        {label}
      </label>
      {children}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-navy">{title}</h3>
      {children}
    </div>
  );
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-semibold transition-colors ${
        active ? "border-navy bg-navy text-white" : "border-gray-200 bg-white text-gray-600 hover:border-navy hover:text-navy"
      }`}
    >
      {children}
    </Link>
  );
}
