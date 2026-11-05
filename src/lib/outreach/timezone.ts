// src/lib/outreach/timezone.ts
const BY_CODE: Record<string, string> = {
  BC: "America/Vancouver", AB: "America/Edmonton", SK: "America/Regina", MB: "America/Winnipeg",
  ON: "America/Toronto", QC: "America/Toronto", NB: "America/Halifax", NS: "America/Halifax", PE: "America/Halifax",
  NL: "America/St_Johns", YT: "America/Whitehorse", NT: "America/Yellowknife", NU: "America/Iqaluit",
};

const BY_NAME: Record<string, string> = {
  "british columbia": "BC", alberta: "AB", saskatchewan: "SK", manitoba: "MB", ontario: "ON",
  quebec: "QC", "québec": "QC", "new brunswick": "NB", "nova scotia": "NS", "prince edward island": "PE",
  "newfoundland and labrador": "NL", newfoundland: "NL", labrador: "NL", yukon: "YT", "yukon territory": "YT",
  "northwest territories": "NT", nunavut: "NU",
};

const CANADA = new Set(["canada", "ca", "can"]);

/** IANA zone for a Canadian province/territory; null when non-Canadian or unrecognised. */
export function timezoneForProvince(province: string | null, country: string | null): string | null {
  const c = country?.trim().toLowerCase();
  if (c && !CANADA.has(c)) return null;
  const p = province?.trim().toLowerCase().replace(/\./g, "");
  if (!p) return null;
  const code = BY_NAME[p] ?? p.toUpperCase();
  return BY_CODE[code] ?? null;
}
