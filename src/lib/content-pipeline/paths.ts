// ============================================================================
// Content Pipeline — immigration path taxonomy for topic tagging & coverage.
// Broader than src/lib/immigration-paths.ts (which is the consultant
// specialization list) because news also covers study permits, citizenship,
// visitor visas, etc. `specializationKeys` maps back to that list so internal
// links can point at matching consultants.
// ============================================================================

export interface ContentPath {
  key: string;
  label: string;
  patterns: RegExp[];
  consultantQuery: string; // used for /search?q= internal links
  specializationKeys: string[];
}

export const CONTENT_PATHS: ContentPath[] = [
  {
    key: "express_entry",
    label: "Express Entry",
    patterns: [/express entry/i, /\bcrs\b/i, /comprehensive ranking/i, /invitations? to apply/i, /\bITAs?\b/, /federal skilled/i, /canadian experience class/i, /\bcec\b/i, /\bfswp?\b/i],
    consultantQuery: "Express Entry",
    specializationKeys: ["fswp", "cec", "fstp", "ee_healthcare", "ee_stem", "ee_trades", "ee_transport", "ee_agri", "ee_french"],
  },
  {
    key: "pnp",
    label: "Provincial Nominee Programs",
    patterns: [/provincial nominee/i, /\bpnp\b/i, /\boinp\b/i, /\bbc ?pnp\b/i, /\baaip\b/i, /\bsinp\b/i, /\bmpnp\b/i, /\bnsnp\b/i, /nova scotia nominee/i, /\bnbpnp\b/i, /\bpei pnp\b/i, /\bnlpnp\b/i, /ontario immigrant nominee/i, /alberta advantage/i],
    consultantQuery: "Provincial Nominee",
    specializationKeys: ["pnp_on", "pnp_bc", "pnp_ab", "pnp_sk", "pnp_mb", "pnp_ns", "pnp_nb", "pnp_pei", "pnp_nl"],
  },
  {
    key: "family",
    label: "Family Sponsorship",
    patterns: [/sponsor(ship)?/i, /spous(e|al)/i, /common-law/i, /parents? and grandparents?/i, /\bpgp\b/i, /super visa/i, /dependent child/i],
    consultantQuery: "Family Sponsorship",
    specializationKeys: ["fam_spouse", "fam_children", "fam_pgp", "fam_orphan", "fam_lonely"],
  },
  {
    key: "study",
    label: "Study Permits",
    patterns: [/study permit/i, /international students?/i, /\bdli\b/i, /designated learning/i, /provincial attestation/i, /\bPAL\b/],
    consultantQuery: "Study Permit",
    specializationKeys: [],
  },
  {
    key: "work",
    label: "Work Permits",
    patterns: [/work permit/i, /\blmia\b/i, /labour market impact/i, /\bpgwp\b/i, /post-graduation work/i, /open work permit/i, /temporary foreign worker/i, /\btfwp\b/i, /international experience canada/i, /\biec\b/i, /intra-company/i],
    consultantQuery: "Work Permit",
    specializationKeys: ["tr_pgwp", "tr_lmia", "tr_iec", "biz_ict"],
  },
  {
    key: "refugee",
    label: "Refugee & Humanitarian",
    patterns: [/refugee/i, /asylum/i, /humanitarian/i, /compassionate/i, /\bh&c\b/i, /resettle/i, /protected person/i],
    consultantQuery: "Refugee",
    specializationKeys: ["hum_gar", "hum_psr", "hum_hc"],
  },
  {
    key: "citizenship",
    label: "Citizenship",
    patterns: [/citizenship/i, /citizen(s)? test/i, /oath/i, /naturaliz/i, /proof of citizenship/i],
    consultantQuery: "Citizenship",
    specializationKeys: [],
  },
  {
    key: "quebec",
    label: "Quebec Immigration",
    patterns: [/qu[eé]bec/i, /\bmifi\b/i, /\bpeq\b/i, /\bpstq\b/i, /\bcsq\b/i, /arrima/i],
    consultantQuery: "Quebec",
    specializationKeys: ["qc_qswp", "qc_peq", "qc_biz"],
  },
  {
    key: "business",
    label: "Business & Investor",
    patterns: [/start-?up visa/i, /self-employed/i, /entrepreneur/i, /investor/i],
    consultantQuery: "Start-Up Visa",
    specializationKeys: ["biz_startup", "biz_selfemployed", "biz_prov"],
  },
  {
    key: "pilots",
    label: "Pilots & Regional Programs",
    patterns: [/atlantic immigration/i, /\baip\b/i, /rural community/i, /\brcip\b/i, /francophone community/i, /\bfcip\b/i, /agri-food pilot/i, /pilot program/i, /economic mobility/i],
    consultantQuery: "Atlantic Immigration",
    specializationKeys: ["pilot_aip", "pilot_rcip", "pilot_fcip", "pilot_agrifood", "pilot_empp"],
  },
  {
    key: "caregiver",
    label: "Caregivers",
    patterns: [/caregiver/i, /home child care/i, /home support worker/i],
    consultantQuery: "Caregiver",
    specializationKeys: ["care_child", "care_support"],
  },
  {
    key: "visitor",
    label: "Visitor Visas & eTA",
    patterns: [/visitor visa/i, /temporary resident visa/i, /\btrv\b/i, /\beTA\b/, /electronic travel/i],
    consultantQuery: "Visitor Visa",
    specializationKeys: [],
  },
  // Catch-all, kept LAST so it only becomes the primary path when nothing more specific matched.
  {
    key: "general",
    label: "Canadian Immigration",
    patterns: [/immigra/i, /permanent residen/i, /\bIRCC\b/, /newcomers?/i, /levels plan/i],
    consultantQuery: "Immigration",
    specializationKeys: [],
  },
];

export const PATH_KEYS = CONTENT_PATHS.map((p) => p.key);

/** Pure: tag free text with the immigration paths it mentions (in taxonomy order). */
export function tagImmigrationPaths(text: string): string[] {
  if (!text) return [];
  return CONTENT_PATHS.filter((p) => p.patterns.some((re) => re.test(text))).map((p) => p.key);
}

export function pathByKey(key: string): ContentPath | undefined {
  return CONTENT_PATHS.find((p) => p.key === key);
}

/** Pure: keep only known path keys, deduped, in taxonomy order. */
export function normalizePathKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  const set = new Set(keys.filter((k): k is string => typeof k === "string"));
  return PATH_KEYS.filter((k) => set.has(k));
}
