import Link from "next/link";
import { ShieldCheck, MapPin } from "lucide-react";
import type { HomeConsultant } from "@/lib/home-data";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ConsultantCard({ consultant }: { consultant: HomeConsultant }) {
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
