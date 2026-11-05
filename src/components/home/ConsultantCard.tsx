import Link from "next/link";
import { ShieldCheck, MapPin, ArrowRight } from "lucide-react";
import type { HomeConsultant } from "@/lib/home-data";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}]+/u, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export type LicenceStanding = "active" | "inactive" | "unknown";

interface ConsultantCardProps {
  consultant: HomeConsultant;
  /**
   * "portrait" (default) is the homepage card. "row" is the compact card used in
   * search results and sidebars, where most profiles have no photo.
   */
  variant?: "portrait" | "row";
  /** Licence standing from the CICC register. Shown only on the row variant. */
  standing?: LicenceStanding;
}

function VerifiedChip({ claimed, className = "" }: { claimed: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        claimed ? "bg-success/10 text-success" : "bg-mist text-navy"
      } ${className}`}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {claimed ? "Verified on Verixa" : "CICC register"}
    </span>
  );
}

const STANDING_LABEL: Record<LicenceStanding, string> = {
  active: "Licence active",
  inactive: "Licence inactive",
  unknown: "Standing unknown",
};

const STANDING_CLASS: Record<LicenceStanding, string> = {
  active: "text-success",
  inactive: "text-warning",
  unknown: "text-gray-500",
};

const STANDING_DOT: Record<LicenceStanding, string> = {
  active: "bg-success",
  inactive: "bg-warning",
  unknown: "bg-gray-400",
};

function RowCard({ consultant, standing }: { consultant: HomeConsultant; standing?: LicenceStanding }) {
  const location = [consultant.city, consultant.province].filter(Boolean).join(", ");
  const href = `/consultant/${consultant.licenseNumber}`;
  return (
    <article className="group relative flex h-full gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-navy/5">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mist">
        {consultant.avatarImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={consultant.avatarImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy to-teal text-lg font-bold text-white"
            aria-hidden="true"
          >
            {initials(consultant.fullName)}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <VerifiedChip claimed={consultant.claimed} />
          {standing && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${STANDING_CLASS[standing]}`}>
              <span className={`h-2 w-2 rounded-full ${STANDING_DOT[standing]}`} aria-hidden="true" />
              {STANDING_LABEL[standing]}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold leading-tight text-navy">
          {/* Stretched link: the whole card is clickable, one tab stop. */}
          <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl group-hover:text-teal">
            {consultant.fullName}, RCIC
          </Link>
        </h3>
        <p className="line-clamp-1 text-sm text-gray-600">{consultant.company || "Independent practice"}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>Licence {consultant.licenseNumber}</span>
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {location}
            </span>
          )}
          {consultant.languages.length > 0 && <span>{consultant.languages.join(" · ")}</span>}
        </p>
      </div>

      <ArrowRight
        className="mt-1 hidden h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal sm:block"
        aria-hidden="true"
      />
    </article>
  );
}

export default function ConsultantCard({ consultant, variant = "portrait", standing }: ConsultantCardProps) {
  if (variant === "row") return <RowCard consultant={consultant} standing={standing} />;

  const location = [consultant.city, consultant.province].filter(Boolean).join(", ");
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-lg hover:shadow-navy/5">
      <Link href={`/consultant/${consultant.licenseNumber}`} className="relative block overflow-hidden rounded-xl bg-mist">
        {consultant.avatarImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={consultant.avatarImage}
            alt={`Portrait of ${consultant.fullName}`}
            className="aspect-[4/5] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-navy to-teal text-4xl font-bold text-white">
            {initials(consultant.fullName)}
          </div>
        )}
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            consultant.claimed ? "bg-white text-success" : "bg-white/95 text-navy"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {consultant.claimed ? "Verified on Verixa" : "CICC register"}
        </span>
      </Link>

      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold leading-tight text-navy">
          <Link href={`/consultant/${consultant.licenseNumber}`} className="hover:text-teal">
            {consultant.fullName}, RCIC
          </Link>
        </h3>
        <p className="line-clamp-1 text-sm text-gray-600">{consultant.company || "Independent practice"}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
          <span>Licence {consultant.licenseNumber}</span>
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {location}
            </span>
          )}
        </p>
        {consultant.languages.length > 0 && (
          <p className="text-xs text-gray-500">{consultant.languages.join(" · ")}</p>
        )}
      </div>

      <Link
        href={`/consultant/${consultant.licenseNumber}`}
        className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl border border-navy bg-white px-4 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white"
      >
        View profile &amp; book
      </Link>
    </article>
  );
}
