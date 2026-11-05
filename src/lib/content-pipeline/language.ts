// ============================================================================
// Content Pipeline — language profiles
// Switching `content_language` (PlatformSetting) between "en", "fa", "fr" or a
// bilingual pair like "en+fa" is a config change only: every prompt builds its
// language rules from here.
// ============================================================================

export interface LanguageProfile {
  code: string; // BCP-47-ish, used for JSON-LD inLanguage and <html lang>
  name: string; // human-readable, injected into prompts
  dir: "ltr" | "rtl";
  disclaimer: string; // visible "general information, not legal advice" notice
  styleNotes: string; // extra writing guidance for this language
}

export const LANGUAGE_PROFILES: Record<string, LanguageProfile> = {
  en: {
    code: "en",
    name: "English",
    dir: "ltr",
    disclaimer:
      "**General information only — not legal advice.** Immigration rules change often. Confirm details on the official Government of Canada (IRCC) or provincial website, and speak with a licensed immigration consultant (RCIC) or lawyer about your situation.",
    styleNotes: "Use Canadian English spelling (licence, centre, colour) and IRCC's official program names.",
  },
  fa: {
    code: "fa",
    name: "Persian (Farsi)",
    dir: "rtl",
    disclaimer:
      "**این مطلب صرفاً اطلاعات عمومی است و مشاوره حقوقی محسوب نمی‌شود.** قوانین مهاجرت به‌طور مکرر تغییر می‌کنند. جزئیات را در وب‌سایت رسمی دولت کانادا (IRCC) یا استان مربوطه بررسی کنید و برای شرایط خود با یک مشاور رسمی مهاجرت (RCIC) یا وکیل مشورت کنید.",
    styleNotes:
      "Write natural, formal-but-readable Persian (رسمی/نوشتاری). Use the zero-width non-joiner (نیم‌فاصله) correctly, Persian punctuation (، ؛ «»), and keep official program names in English in parentheses on first mention, e.g. «اکسپرس انتری (Express Entry)».",
  },
  fr: {
    code: "fr",
    name: "French (Canadian)",
    dir: "ltr",
    disclaimer:
      "**Information générale seulement — ne constitue pas un avis juridique.** Les règles d'immigration changent souvent. Vérifiez les détails sur le site officiel du gouvernement du Canada (IRCC) ou de la province, et consultez un consultant réglementé en immigration (CRIC) ou un avocat.",
    styleNotes: "Write in Canadian French (français canadien) with official IRCC French program names.",
  },
};

export interface LanguageSetting {
  primary: LanguageProfile;
  secondary: LanguageProfile | null; // set for bilingual configs like "en+fa"
  raw: string;
}

/** Parse a `content_language` value ("en", "fa", "en+fa"). Unknown codes fall back to English. */
export function parseLanguageSetting(value: string | null | undefined): LanguageSetting {
  const raw = (value || "en").trim().toLowerCase();
  const [p, s] = raw.split("+").map((x) => x.trim());
  const primary = LANGUAGE_PROFILES[p] ?? LANGUAGE_PROFILES.en;
  const secondary = s && LANGUAGE_PROFILES[s] && s !== primary.code ? LANGUAGE_PROFILES[s] : null;
  return { primary, secondary, raw: secondary ? `${primary.code}+${secondary.code}` : primary.code };
}

/** The language block every writer/SEO/reviewer prompt includes. */
export function languageInstruction(lang: LanguageSetting): string {
  const lines = [
    `OUTPUT LANGUAGE: Write ALL reader-facing text (title, summary, headings, body, FAQ, meta title, meta description, image alt text) in ${lang.primary.name}.`,
    lang.primary.styleNotes,
    "Keep URLs, program acronyms (CRS, ITA, LMIA, PGWP, PNP, IRCC) and official program names accurate.",
  ];
  if (lang.secondary) {
    lines.push(
      `BILINGUAL MODE: Also provide a short summary in ${lang.secondary.name} in the "secondarySummary" field (3-5 sentences). ${lang.secondary.styleNotes}`
    );
  }
  return lines.join("\n");
}

export function disclaimerFor(lang: LanguageSetting): string {
  return lang.secondary ? `${lang.primary.disclaimer}\n>\n> ${lang.secondary.disclaimer}` : lang.primary.disclaimer;
}
