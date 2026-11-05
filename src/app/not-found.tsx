import Link from "next/link";
import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Home, BookOpen, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found | Verixa",
  description: "The page you're looking for doesn't exist or has been moved.",
};

const LINKS = [
  { href: "/search", icon: <Search className="h-5 w-5" aria-hidden="true" />, label: "Find a licensed RCIC", desc: "Search the CICC register" },
  { href: "/blog", icon: <BookOpen className="h-5 w-5" aria-hidden="true" />, label: "Immigration journal", desc: "Policy updates and guides" },
  { href: "/", icon: <Home className="h-5 w-5" aria-hidden="true" />, label: "Home", desc: "Choose your route to Canada" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-ink">
      <Header />

      <main className="flex flex-1 items-center bg-mist px-6 pb-20 pt-32 lg:pt-40">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Error 404</span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-navy md:text-5xl">
              This page doesn&apos;t exist.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-gray-600">
              It may have moved or been renamed. These will get you back on track.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-3">
            {LINKS.map(({ href, icon, label, desc }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-navy/5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mist text-navy transition-colors group-hover:bg-teal group-hover:text-white">
                    {icon}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1 font-bold text-navy group-hover:text-teal">
                      {label}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-gray-600">{desc}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}
