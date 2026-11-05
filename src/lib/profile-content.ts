import DOMPurify from "isomorphic-dompurify";

const BIO_TAGS = ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "h2", "h3", "h4"];

/**
 * Consultant bios are rich text. No style/class (they allowed overlaying the
 * page for phishing), only http(s)/mailto links, and every link opens safely.
 * Run on save AND on render, so bios saved before this change are safe too.
 */
export function sanitizeBio(html: string | null | undefined): string {
  if (!html) return "";
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: BIO_TAGS,
    ALLOWED_ATTR: ["href"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
  return clean.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer nofollow" ');
}

export function bioTextLength(html: string): number {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).replace(/\s+/g, " ").trim().length;
}

/** Profile images must be ones we serve, or https URLs. */
export function isSafeImageUrl(url: string): boolean {
  if (!url) return true; // empty = remove image
  if (/^\/api\/content-image\/c[a-z0-9]{20,32}$/.test(url)) return true;
  if (/^\/uploads\/consultants\/[\w.-]+\.(png|jpe?g|webp)$/i.test(url)) return true; // legacy local uploads
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Normalises a website to an https/http URL, or returns null when invalid. */
export function normalizeWebsite(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Limit from a plan feature value: "unlimited" → Infinity, "5" → 5, missing → fallback. */
export function parseLimit(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback;
  if (value.trim().toLowerCase() === "unlimited") return Infinity;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
