export const IMMIGRATION_PATHS = [
  { category: "Express Entry", items: [
    { key: "fswp", label: "Federal Skilled Worker Program (FSWP)" },
    { key: "cec", label: "Canadian Experience Class (CEC)" },
    { key: "fstp", label: "Federal Skilled Trades Program (FSTP)" },
    { key: "ee_healthcare", label: "Category-Based: Healthcare" },
    { key: "ee_stem", label: "Category-Based: STEM" },
    { key: "ee_trades", label: "Category-Based: Trades" },
    { key: "ee_transport", label: "Category-Based: Transport" },
    { key: "ee_agri", label: "Category-Based: Agriculture & Agri-food" },
    { key: "ee_french", label: "Category-Based: French-Language Proficiency" },
  ]},
  { category: "Provincial Nominee Programs (PNP)", items: [
    { key: "pnp_on", label: "Ontario – OINP" },
    { key: "pnp_bc", label: "British Columbia – BCPNP" },
    { key: "pnp_ab", label: "Alberta – AAIP" },
    { key: "pnp_sk", label: "Saskatchewan – SINP" },
    { key: "pnp_mb", label: "Manitoba – MPNP" },
    { key: "pnp_ns", label: "Nova Scotia – NSNP" },
    { key: "pnp_nb", label: "New Brunswick – NBPNP" },
    { key: "pnp_pei", label: "Prince Edward Island – PEI PNP" },
    { key: "pnp_nl", label: "Newfoundland & Labrador – NLPNP" },
  ]},
  { category: "Business & Investor Pathways", items: [
    { key: "biz_startup", label: "Start-Up Visa Program" },
    { key: "biz_selfemployed", label: "Self-Employed Persons Program" },
    { key: "biz_ict", label: "Intra-Company Transfer (ICT)" },
    { key: "biz_prov", label: "Provincial Entrepreneur Streams" },
  ]},
  { category: "Pilot Programs & Regional Pathways", items: [
    { key: "pilot_aip", label: "Atlantic Immigration Program (AIP)" },
    { key: "pilot_rcip", label: "Rural Community Immigration Pilot (RCIP)" },
    { key: "pilot_fcip", label: "Francophone Community Immigration Pilot (FCIP)" },
    { key: "pilot_agrifood", label: "Agri-Food Pilot" },
    { key: "pilot_empp", label: "Economic Mobility Pathways Pilot (EMPP)" },
  ]},
  { category: "Family Sponsorship", items: [
    { key: "fam_spouse", label: "Spouse / Common-law / Conjugal Partner" },
    { key: "fam_children", label: "Dependent Children" },
    { key: "fam_pgp", label: "Parent & Grandparent Program (PGP)" },
    { key: "fam_orphan", label: "Orphaned Relatives" },
    { key: "fam_lonely", label: "Lonely Canadian Exception" },
  ]},
  { category: "Quebec-Specific Programs", items: [
    { key: "qc_qswp", label: "Quebec Skilled Worker Program (QSWP)" },
    { key: "qc_peq", label: "Quebec Experience Program (PEQ)" },
    { key: "qc_biz", label: "Quebec Business Immigration" },
  ]},
  { category: "Caregiver Programs", items: [
    { key: "care_child", label: "Home Child Care Provider Pilot" },
    { key: "care_support", label: "Home Support Worker Pilot" },
  ]},
  { category: "Temporary to Permanent (TR to PR)", items: [
    { key: "tr_pgwp", label: "Post-Graduation Work Permit (PGWP)" },
    { key: "tr_lmia", label: "LMIA-based Work Permits" },
    { key: "tr_iec", label: "International Experience Canada (IEC)" },
  ]},
  { category: "Humanitarian & Refugee Pathways", items: [
    { key: "hum_gar", label: "Government-Assisted Refugees" },
    { key: "hum_psr", label: "Privately Sponsored Refugees" },
    { key: "hum_hc", label: "Humanitarian & Compassionate (H&C)" },
  ]},
];

export const ALL_SPECIALIZATION_ITEMS = IMMIGRATION_PATHS.flatMap(p => p.items);

export const ALL_LANGUAGES = [
  "English", "French", "Persian (Farsi)", "Spanish", "Arabic", "Mandarin",
  "Cantonese", "Hindi", "Punjabi", "Urdu", "Tagalog", "Korean", "Japanese",
  "Portuguese", "Russian", "Polish", "Ukrainian", "Turkish", "Vietnamese",
  "Bengali", "Gujarati", "Tamil", "Telugu", "Sinhala", "Nepali", "Somali",
  "Amharic", "Romanian", "Hungarian", "Italian", "German", "Dutch",
  "Greek", "Hebrew", "Swahili", "Indonesian", "Malay", "Thai"
];
