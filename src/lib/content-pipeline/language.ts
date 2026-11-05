// ============================================================================
// Content Pipeline — language profiles
// Switching `content_language` (PlatformSetting) between "en", "fa", "fr" or a
// bilingual pair like "en+fa" is a config change only: every prompt builds its
// language rules from here.
// ============================================================================

export interface LanguageLabels {
  related: string; // "Related resources" section heading
  sources: string; // "Sources" section heading
  faq: string; // FAQ section heading (the blog page recognises all of these)
  consultantLink: (pathLabel: string) => string; // internal link to consultant search
  footer: (sourceLink: string, date: string) => string; // provenance line under the article
  readMore: string; // social copy lead-in before the link
  socialNote: string; // short disclaimer for social posts
  hashtag: string; // base hashtag, without "#"
}

export interface LanguageProfile {
  code: string; // BCP-47-ish, used for JSON-LD inLanguage and <html lang>
  name: string; // human-readable, injected into prompts
  dir: "ltr" | "rtl";
  disclaimer: string; // visible "general information, not legal advice" notice
  styleNotes: string; // extra writing guidance for this language
  labels: LanguageLabels;
}

export const LANGUAGE_PROFILES: Record<string, LanguageProfile> = {
  en: {
    code: "en",
    name: "English",
    dir: "ltr",
    disclaimer:
      "**General information only — not legal advice.** Immigration rules change often. Confirm details on the official Government of Canada (IRCC) or provincial website, and speak with a licensed immigration consultant (RCIC) or lawyer about your situation.",
    styleNotes: "Use Canadian English spelling (licence, centre, colour) and IRCC's official program names.",
    labels: {
      related: "Related resources",
      sources: "Sources",
      faq: "Frequently Asked Questions",
      consultantLink: (l) => `Find a licensed consultant for ${l}`,
      footer: (src, d) =>
        `*Prepared by the Verixa editorial team from official information published by ${src}. Last reviewed ${d}. This article is general information, not legal advice.*`,
      readMore: "Read the full update:",
      socialNote: "General information, not legal advice.",
      hashtag: "CanadaImmigration",
    },
  },
  fa: {
    code: "fa",
    name: "Persian (Farsi)",
    dir: "rtl",
    disclaimer:
      "**این مطلب صرفاً اطلاعات عمومی است و مشاوره حقوقی محسوب نمی‌شود.** قوانین مهاجرت به‌طور مکرر تغییر می‌کنند. جزئیات را در وب‌سایت رسمی دولت کانادا (IRCC) یا استان مربوطه بررسی کنید و برای شرایط خود با یک مشاور رسمی مهاجرت (RCIC) یا وکیل مشورت کنید.",
    styleNotes:
      "Write natural, formal-but-readable Persian (رسمی/نوشتاری). Use the zero-width non-joiner (نیم‌فاصله) correctly, Persian punctuation (، ؛ «»), and keep official program names in English in parentheses on first mention, e.g. «اکسپرس انتری (Express Entry)».",
    labels: {
      related: "مطالب مرتبط",
      sources: "منابع",
      faq: "پرسش‌های متداول",
      consultantLink: (l) => `یافتن مشاور رسمی مهاجرت برای ${l}`,
      footer: (src, d) =>
        `*این مطلب را تیم تحریریه وریکسا بر اساس اطلاعات رسمی منتشرشده توسط ${src} تهیه کرده است. آخرین بازبینی: ${d}. این مطلب صرفاً اطلاعات عمومی است و مشاوره حقوقی محسوب نمی‌شود.*`,
      readMore: "متن کامل خبر:",
      socialNote: "اطلاعات عمومی؛ مشاوره حقوقی محسوب نمی‌شود.",
      hashtag: "مهاجرت_کانادا",
    },
  },
  fr: {
    code: "fr",
    name: "French (Canadian)",
    dir: "ltr",
    disclaimer:
      "**Information générale seulement — ne constitue pas un avis juridique.** Les règles d'immigration changent souvent. Vérifiez les détails sur le site officiel du gouvernement du Canada (IRCC) ou de la province, et consultez un consultant réglementé en immigration (CRIC) ou un avocat.",
    styleNotes: "Write in Canadian French (français canadien) with official IRCC French program names.",
    labels: {
      related: "Ressources connexes",
      sources: "Sources",
      faq: "Foire aux questions",
      consultantLink: (l) => `Trouver un consultant réglementé pour ${l}`,
      footer: (src, d) =>
        `*Préparé par l'équipe éditoriale de Verixa à partir d'informations officielles publiées par ${src}. Dernière révision : ${d}. Cet article est une information générale et ne constitue pas un avis juridique.*`,
      readMore: "Lire la mise à jour complète :",
      socialNote: "Information générale, pas un avis juridique.",
      hashtag: "ImmigrationCanada",
    },
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

/** Profile for a stored language code (BlogPost.language); unknown → English. */
export function profileFor(code: string | null | undefined): LanguageProfile {
  return LANGUAGE_PROFILES[(code || "en").split("+")[0]] ?? LANGUAGE_PROFILES.en;
}

/** Every FAQ heading the blog page should recognise, across languages. */
export const FAQ_HEADINGS: string[] = ["FAQ", ...new Set(Object.values(LANGUAGE_PROFILES).map((p) => p.labels.faq))];
