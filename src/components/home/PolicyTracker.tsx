import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HomeArticle } from "@/lib/home-data";
import { pathByKey } from "@/lib/content-pipeline/paths";

function tagFor(article: HomeArticle): string {
  const path = article.paths.map(pathByKey).find((p) => p && p.key !== "general");
  if (path) return path.label;
  return article.category.replace(/_/g, " ").toLowerCase();
}

function dateParts(iso: string | null): { month: string; day: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleDateString("en-CA", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
  };
}

export default function PolicyTracker({ articles }: { articles: HomeArticle[] }) {
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        The first policy briefs are on their way.
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between pb-2">
        <h3 className="text-base font-bold text-navy">Policy tracker</h3>
        <span className="text-xs text-gray-500">Latest briefs</span>
      </div>
      <ul className="flex flex-col">
        {articles.map((a) => {
          const date = dateParts(a.publishedAt);
          return (
            <li key={a.slug} className="border-t border-gray-100">
              <Link
                href={`/blog/${a.slug}`}
                className="group grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <span className="text-xs font-bold leading-tight text-gray-500">
                  {date ? (
                    <>
                      {date.month}
                      <br />
                      {date.day}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="w-fit rounded bg-teal/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-teal">
                    {tagFor(a)}
                  </span>
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-teal">
                    {a.title}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/blog" className="mt-3 text-sm font-bold text-teal hover:text-navy">
        All briefs →
      </Link>
    </div>
  );
}
