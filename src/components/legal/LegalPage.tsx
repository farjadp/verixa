import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const LEGAL_DOCUMENTS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Booking & Refund Policy" },
  { href: "/consultant-agreement", label: "Consultant Agreement" },
  { href: "/disclaimer", label: "Disclaimer" },
] as const;

type LegalHref = (typeof LEGAL_DOCUMENTS)[number]["href"];

interface LegalPageProps {
  /** Route of this document; highlights it in the side navigation. */
  current: LegalHref;
  eyebrow: string;
  title: string;
  /** Effective date or version line, shown under the title. */
  meta?: React.ReactNode;
  /** Extra classes for the document card (e.g. spacing between sections). */
  bodyClassName?: string;
  children: React.ReactNode;
}

/** Shared shell for the legal documents: brand hero, document switcher, readable body card. */
export default function LegalPage({ current, eyebrow, title, meta, bodyClassName = "", children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-white font-sans text-ink">
      <Header />

      <section className="border-b border-gray-200 bg-mist pt-28 lg:pt-36">
        <div className="mx-auto max-w-7xl px-6 pb-10 lg:px-8 lg:pb-12">
          <div className="flex max-w-3xl flex-col gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">{eyebrow}</span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-navy md:text-5xl">{title}</h1>
            {meta && <div className="text-base text-gray-600">{meta}</div>}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row lg:gap-12 lg:px-8 lg:py-14">
        <nav aria-label="Legal documents" className="shrink-0 lg:w-64">
          <div className="lg:sticky lg:top-28">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Legal documents</p>
            <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
              {LEGAL_DOCUMENTS.map((doc) => {
                const active = doc.href === current;
                return (
                  <li key={doc.href} className="shrink-0">
                    <Link
                      href={doc.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors lg:rounded-lg lg:border-transparent lg:px-3 ${
                        active
                          ? "border-navy bg-navy text-white lg:bg-mist lg:text-navy"
                          : "border-gray-200 text-gray-600 hover:text-navy lg:hover:bg-mist"
                      }`}
                    >
                      {doc.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <article
          className={`min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-6 text-gray-700 md:p-10 lg:p-12 ${bodyClassName}`}
        >
          {children}
        </article>
      </div>

      <Footer />
    </main>
  );
}
