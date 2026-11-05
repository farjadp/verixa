import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

/** Blog category enum → reader-facing label and archive slug. */
export const BLOG_CATEGORIES: { value: string; slug: string; label: string }[] = [
  { value: "UPDATES_POLICY", slug: "updates-policy", label: "Updates & Policy" },
  { value: "IMMIGRATION_GUIDES", slug: "immigration-guides", label: "Immigration Guides" },
  { value: "CONSULTANT_INSIGHTS", slug: "consultant-insights", label: "Consultant Insights" },
  { value: "CASE_BASED_CONTENT", slug: "case-based-content", label: "Case-Based Scenarios" },
];

export function categoryLabel(value: string): string {
  return BLOG_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ").toLowerCase();
}

export interface ArticleCardPost {
  slug: string;
  title: string;
  summary: string;
  category: string;
  coverImage: string | null;
  imageAlt?: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}

const RTL_SCRIPT = /[؀-ۿ]/;

function Cover({ post, className }: { post: ArticleCardPost; className: string }) {
  if (post.coverImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={post.coverImage}
        alt={post.imageAlt || ""}
        loading="lazy"
        className={`${className} object-cover transition-transform duration-500 group-hover:scale-[1.03]`}
      />
    );
  }
  return (
    <div className={`${className} flex items-end bg-gradient-to-br from-navy to-teal p-5`} aria-hidden="true">
      <span className="text-xs font-bold uppercase tracking-wider text-lightteal">{categoryLabel(post.category)}</span>
    </div>
  );
}

/**
 * Journal card used on /blog and the category archives.
 * "feature" is the wide lead story; "default" is the grid card.
 */
export default function ArticleCard({
  post,
  variant = "default",
}: {
  post: ArticleCardPost;
  variant?: "default" | "feature";
}) {
  const date = post.publishedAt || post.createdAt;
  const rtl = RTL_SCRIPT.test(post.title);

  if (variant === "feature") {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group grid overflow-hidden rounded-3xl border border-gray-200 bg-white transition-shadow hover:shadow-xl hover:shadow-navy/5 lg:grid-cols-2"
      >
        <div className="relative overflow-hidden bg-mist">
          <Cover post={post} className="aspect-[16/10] h-full w-full lg:aspect-auto lg:min-h-80" />
        </div>
        <div className="flex flex-col gap-4 p-6 md:p-10" dir={rtl ? "rtl" : undefined}>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded bg-teal/10 px-2 py-0.5 font-bold uppercase tracking-wide text-teal">
              {categoryLabel(post.category)}
            </span>
            <time dateTime={date.toISOString()} className="font-semibold text-gray-500">
              {format(date, "MMM d, yyyy")}
            </time>
          </div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-navy transition-colors group-hover:text-teal md:text-3xl">
            {post.title}
          </h2>
          <p className="line-clamp-3 text-base leading-relaxed text-gray-600">{post.summary}</p>
          <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-teal">
            Read the brief
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-lg hover:shadow-navy/5"
    >
      <div className="overflow-hidden bg-mist">
        <Cover post={post} className="aspect-[16/9] w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6" dir={rtl ? "rtl" : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="rounded bg-teal/10 px-2 py-0.5 font-bold uppercase tracking-wide text-teal">
            {categoryLabel(post.category)}
          </span>
          <time dateTime={date.toISOString()} className="font-semibold text-gray-500">
            {format(date, "MMM d, yyyy")}
          </time>
        </div>
        <h2 className="text-lg font-bold leading-snug text-navy transition-colors group-hover:text-teal">{post.title}</h2>
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">{post.summary}</p>
      </div>
    </Link>
  );
}
