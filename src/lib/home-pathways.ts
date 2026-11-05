// ============================================================================
// Homepage route finder — the six top-level routes a visitor can pick, each
// mapped to (a) consultant specialization keys (src/lib/immigration-paths.ts)
// so the search page can filter, and (b) content-pipeline path keys
// (src/lib/content-pipeline/paths.ts) so the journal can filter.
// Pure data: safe to import from client components.
// ============================================================================

export type PathwayKey = "pr" | "study" | "work" | "family" | "pnp" | "quebec";

export interface Situation {
  key: string;
  label: string;
  /** One line shown in the summary once picked. */
  note: string;
  /** Program names shown in the summary. */
  programs: string[];
  /** Primary specialization key used for /search?spec= */
  spec: string | null;
}

export interface Pathway {
  key: PathwayKey;
  label: string;
  tileLabel: string;
  description: string;
  programs: string[];
  photo: string;
  photoAlt: string;
  /** Content-pipeline path keys stored in BlogPost.immigrationPaths */
  contentPaths: string[];
  /** Consultant specialization keys stored in ConsultantProfile.specializations */
  specializationKeys: string[];
  /** Free-text query for /search?q= when no specialization matches */
  searchQuery: string;
  situations: Situation[];
}

export const PATHWAYS: Pathway[] = [
  {
    key: "pr",
    label: "Permanent residence",
    tileLabel: "Permanent residence",
    description: "Skilled-worker routes to PR through the federal points system.",
    programs: ["Express Entry", "Canadian Experience Class", "Federal Skilled Worker"],
    photo: "/images/home/route-pr.jpg",
    photoAlt: "Vancouver skyline across the harbour",
    contentPaths: ["express_entry", "general"],
    specializationKeys: ["fswp", "cec", "fstp", "ee_healthcare", "ee_stem", "ee_trades", "ee_transport", "ee_agri", "ee_french"],
    searchQuery: "Express Entry",
    situations: [
      { key: "outside", label: "I'm outside Canada", note: "Federal Skilled Worker or a category-based draw.", programs: ["Express Entry", "FSWP", "Category-based draws"], spec: "fswp" },
      { key: "working", label: "I'm working in Canada", note: "Canadian Experience Class after one year of skilled work.", programs: ["Express Entry", "CEC"], spec: "cec" },
      { key: "graduate", label: "I studied in Canada", note: "Post-graduation work, then CEC.", programs: ["PGWP", "Express Entry", "CEC"], spec: "cec" },
    ],
  },
  {
    key: "study",
    label: "Study",
    tileLabel: "Study",
    description: "Study permits, provincial attestation letters and the post-graduation work path.",
    programs: ["Study permit", "PAL / TAL", "PGWP"],
    photo: "/images/home/route-study.jpg",
    photoAlt: "Students working together in a library",
    contentPaths: ["study"],
    specializationKeys: ["tr_pgwp"],
    searchQuery: "Study Permit",
    situations: [
      { key: "first", label: "Applying for my first permit", note: "Admission, attestation letter, financial proof.", programs: ["Study permit", "PAL / TAL"], spec: null },
      { key: "extend", label: "Extending or changing schools", note: "Keep status while the new permit is processed.", programs: ["Study permit extension"], spec: null },
      { key: "graduating", label: "Graduating soon", note: "Post-graduation work permit, then a PR route.", programs: ["PGWP", "Express Entry"], spec: "tr_pgwp" },
    ],
  },
  {
    key: "work",
    label: "Work",
    tileLabel: "Work",
    description: "Employer-backed and open work permits, and the route from a job to PR.",
    programs: ["LMIA work permit", "International Mobility Program", "PGWP"],
    photo: "/images/home/route-work.jpg",
    photoAlt: "A briefing in a modern office",
    contentPaths: ["work"],
    specializationKeys: ["tr_lmia", "tr_iec", "biz_ict", "tr_pgwp"],
    searchQuery: "Work Permit",
    situations: [
      { key: "offer", label: "I have a job offer", note: "Employer-backed permit, usually through an LMIA.", programs: ["LMIA", "TFWP"], spec: "tr_lmia" },
      { key: "open", label: "I may qualify for an open permit", note: "Spousal, PGWP, IEC and other LMIA-exempt streams.", programs: ["Open work permit", "IEC"], spec: "tr_iec" },
      { key: "transfer", label: "My company is moving me", note: "Intra-company transfer under the IMP.", programs: ["ICT"], spec: "biz_ict" },
    ],
  },
  {
    key: "family",
    label: "Join family",
    tileLabel: "Join family",
    description: "Sponsoring a spouse, partner, child, parent or grandparent.",
    programs: ["Spousal sponsorship", "Parents & Grandparents", "Dependent children"],
    photo: "/images/home/route-family.jpg",
    photoAlt: "A family together at the shore at sunset",
    contentPaths: ["family"],
    specializationKeys: ["fam_spouse", "fam_children", "fam_pgp", "fam_orphan", "fam_lonely"],
    searchQuery: "Family Sponsorship",
    situations: [
      { key: "spouse", label: "Spouse or partner", note: "Inland or outland spousal sponsorship.", programs: ["Spousal / common-law sponsorship"], spec: "fam_spouse" },
      { key: "parents", label: "Parents or grandparents", note: "PGP lottery, or a super visa in the meantime.", programs: ["PGP", "Super visa"], spec: "fam_pgp" },
      { key: "children", label: "Children", note: "Dependent child sponsorship.", programs: ["Dependent children"], spec: "fam_children" },
    ],
  },
  {
    key: "pnp",
    label: "Settle in a province",
    tileLabel: "Settle in a province",
    description: "Provincial nominee streams that target your occupation or region.",
    programs: ["OINP", "BC PNP", "AAIP", "SINP", "MPNP", "Atlantic programs"],
    photo: "/images/home/route-pnp.jpg",
    photoAlt: "Moraine Lake in the Canadian Rockies",
    contentPaths: ["pnp", "pilots"],
    specializationKeys: ["pnp_on", "pnp_bc", "pnp_ab", "pnp_sk", "pnp_mb", "pnp_ns", "pnp_nb", "pnp_pei", "pnp_nl", "pilot_aip", "pilot_rcip"],
    searchQuery: "Provincial Nominee",
    situations: [
      { key: "job", label: "I have a job in a province", note: "Employer-driven nominee streams.", programs: ["Provincial nominee (employer stream)"], spec: null },
      { key: "studied", label: "I studied in a province", note: "International graduate streams.", programs: ["Provincial nominee (graduate stream)"], spec: null },
      { key: "occupation", label: "My occupation is in demand", note: "Occupation-targeted draws and Express Entry-linked streams.", programs: ["Provincial nominee (in-demand)"], spec: null },
    ],
  },
  {
    key: "quebec",
    label: "Québec",
    tileLabel: "Québec",
    description: "Québec runs its own selection, with different programs and French-language rules.",
    programs: ["PEQ", "PSTQ / Arrima", "Québec business"],
    photo: "/images/home/route-quebec.jpg",
    photoAlt: "Montréal skyline at dusk",
    contentPaths: ["quebec"],
    specializationKeys: ["qc_qswp", "qc_peq", "qc_biz"],
    searchQuery: "Quebec",
    situations: [
      { key: "peq", label: "I studied or worked in Québec", note: "Québec Experience Program.", programs: ["PEQ"], spec: "qc_peq" },
      { key: "skilled", label: "Skilled worker from abroad", note: "Arrima declaration, then PSTQ selection.", programs: ["PSTQ", "Arrima"], spec: "qc_qswp" },
      { key: "business", label: "Business or investor", note: "Québec entrepreneur and investor programs.", programs: ["Québec business immigration"], spec: "qc_biz" },
    ],
  },
];

export const PATHWAY_KEYS = PATHWAYS.map((p) => p.key);

export function pathwayByKey(key: string): Pathway | undefined {
  return PATHWAYS.find((p) => p.key === key);
}

export interface Province {
  key: string;
  label: string;
  /** Specialization key of that province's nominee program, if any. */
  pnpSpec: string | null;
}

export const PROVINCES: Province[] = [
  { key: "Ontario", label: "Ontario", pnpSpec: "pnp_on" },
  { key: "British Columbia", label: "British Columbia", pnpSpec: "pnp_bc" },
  { key: "Quebec", label: "Québec", pnpSpec: null },
  { key: "Alberta", label: "Alberta", pnpSpec: "pnp_ab" },
  { key: "Manitoba", label: "Manitoba", pnpSpec: "pnp_mb" },
  { key: "Saskatchewan", label: "Saskatchewan", pnpSpec: "pnp_sk" },
  { key: "Nova Scotia", label: "Nova Scotia", pnpSpec: "pnp_ns" },
  { key: "New Brunswick", label: "New Brunswick", pnpSpec: "pnp_nb" },
  { key: "Newfoundland and Labrador", label: "Newfoundland & Labrador", pnpSpec: "pnp_nl" },
  { key: "Prince Edward Island", label: "Prince Edward Island", pnpSpec: "pnp_pei" },
  { key: "Yukon", label: "Yukon", pnpSpec: null },
  { key: "Northwest Territories", label: "Northwest Territories", pnpSpec: null },
  { key: "Nunavut", label: "Nunavut", pnpSpec: null },
];

/**
 * Pure: build the /search URL for a finished route selection.
 * Prefers a specialization filter (exact), falls back to a text query.
 */
export function buildSearchHref(pathway: Pathway, situation: Situation | null, province: Province | null): string {
  const params = new URLSearchParams();
  let spec = situation?.spec ?? null;
  if (pathway.key === "pnp" && province?.pnpSpec) spec = province.pnpSpec;
  if (spec) params.set("spec", spec);
  else params.set("q", pathway.searchQuery);
  if (province) params.set("province", province.key);
  return `/search?${params.toString()}`;
}
