"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

import { PATHWAYS, PROVINCES, buildSearchHref, type PathwayKey } from "@/lib/home-pathways";
import type { HomeArticle, HomeConsultant } from "@/lib/home-data";
import ConsultantCard from "@/components/home/ConsultantCard";

interface Props {
  consultantsByRoute: Record<PathwayKey, HomeConsultant[]>;
  articlesByRoute: Record<PathwayKey, HomeArticle[]>;
}

const STEPS = ["Goal", "Situation", "Province"] as const;

export default function Pathfinder({ consultantsByRoute, articlesByRoute }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [goalKey, setGoalKey] = useState<PathwayKey>("pr");
  const [situationKey, setSituationKey] = useState<string | null>(null);
  const [provinceKey, setProvinceKey] = useState<string | null>(null);

  const goal = PATHWAYS.find((p) => p.key === goalKey) ?? PATHWAYS[0];
  const situation = goal.situations.find((s) => s.key === situationKey) ?? null;
  const province = PROVINCES.find((p) => p.key === provinceKey) ?? null;
  const consultants = consultantsByRoute[goal.key] ?? [];
  const articles = articlesByRoute[goal.key] ?? [];
  const searchHref = buildSearchHref(goal, situation, province);
  const programs = situation ? situation.programs : goal.programs;

  const pickGoal = (key: PathwayKey) => {
    setGoalKey(key);
    setSituationKey(null);
  };

  return (
    <section id="route-finder" className="scroll-mt-28">
      {/* Step indicator */}
      <ol className="mb-6 flex flex-wrap gap-4" aria-label="Route finder steps">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs ${
                  active ? "border-teal bg-teal text-white" : done ? "border-navy bg-navy text-white" : "border-gray-300 text-gray-500"
                }`}
                aria-hidden="true"
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={active ? "text-navy" : ""}>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.6fr)] lg:items-start">
        {/* Left: the current step */}
        <div className="flex flex-col gap-4">
          {step === 0 && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-bold text-navy">What do you want to do in Canada?</h3>
                <span className="text-sm text-gray-500">Pick one to start</span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3" role="group" aria-label="Your goal">
                {PATHWAYS.map((p) => {
                  const on = p.key === goal.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => pickGoal(p.key)}
                      aria-pressed={on}
                      className={`group relative aspect-[4/3] overflow-hidden rounded-xl text-left outline-none ring-offset-2 transition-shadow focus-visible:ring-2 focus-visible:ring-teal ${
                        on ? "ring-[3px] ring-teal" : "ring-0"
                      }`}
                    >
                      <Image
                        src={p.photo}
                        alt={p.photoAlt}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" aria-hidden="true" />
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3 text-base font-bold text-white md:p-4 md:text-lg">
                        {p.tileLabel}
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal transition-opacity ${on ? "opacity-100" : "opacity-0"}`}
                          aria-hidden="true"
                        >
                          <Check className="h-3.5 w-3.5 text-white" />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-bold text-navy">Which is closest to your situation?</h3>
                <span className="text-sm text-gray-500">{goal.label}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-3" role="group" aria-label="Your situation">
                {goal.situations.map((s) => {
                  const on = s.key === situationKey;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSituationKey(s.key)}
                      aria-pressed={on}
                      className={`flex min-h-32 flex-col gap-2 rounded-xl border-2 bg-white p-5 text-left transition-colors ${
                        on ? "border-teal bg-teal/5" : "border-gray-200 hover:border-navy"
                      }`}
                    >
                      <span className="text-base font-bold text-navy">{s.label}</span>
                      <span className="text-sm leading-snug text-gray-600">{s.note}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-bold text-navy">Where do you want to live?</h3>
                <span className="text-sm text-gray-500">Optional, but it narrows the consultants</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" role="group" aria-label="Province or territory">
                {PROVINCES.map((p) => {
                  const on = p.key === provinceKey;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setProvinceKey(on ? null : p.key)}
                      aria-pressed={on}
                      className={`min-h-11 rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        on ? "border-teal bg-teal/5 text-navy" : "border-gray-200 bg-white text-gray-700 hover:border-navy"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {goal.key === "quebec" && province && province.key !== "Quebec" && (
                <p className="text-sm text-warning">Québec programs lead to Québec. Pick Québec, or change your goal to a federal route.</p>
              )}
            </>
          )}

          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 2 ? 1 : 0))}
              className="inline-flex w-fit items-center gap-1 text-sm font-bold text-gray-600 hover:text-navy"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </button>
          )}
        </div>

        {/* Right: summary */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Your route so far</span>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold leading-tight text-navy">{goal.label}</span>
            <span className="text-sm leading-relaxed text-gray-600">{situation ? situation.note : goal.description}</span>
          </div>
          <dl className="flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Programs</dt>
              <dd className="text-right font-semibold text-ink">{programs.join(" · ")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Situation</dt>
              <dd className="text-right font-semibold text-ink">{situation ? situation.label : "Not yet"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Province</dt>
              <dd className="text-right font-semibold text-ink">{province ? province.label : "Anywhere"}</dd>
            </div>
          </dl>

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 0 ? 1 : 2))}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal px-5 text-base font-bold text-white transition-colors hover:bg-navy"
            >
              {step === 0 ? "Next: your situation" : "Next: your province"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <Link
              href={searchHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal px-5 text-base font-bold text-white transition-colors hover:bg-navy"
            >
              See matching consultants
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
          <p className="text-xs text-gray-500">No account needed. Nothing is sent to a consultant until you book.</p>
        </aside>
      </div>

      {/* People on this route */}
      <div className="mt-16 flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Licensed consultants · {goal.label}</span>
            <h3 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">People who work this route</h3>
            <p className="max-w-2xl text-base text-gray-600">
              Every profile is matched to the CICC public register. Nobody pays to be listed here.
            </p>
          </div>
          <Link href={searchHref} className="inline-flex min-h-11 items-center rounded-xl border border-navy px-5 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-white">
            All consultants for this route
          </Link>
        </div>
        {consultants.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {consultants.map((c) => (
              <ConsultantCard key={c.licenseNumber} consultant={c} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            Consultants for this route will appear once the register sync completes.
          </div>
        )}
      </div>

      {/* What changed on this route */}
      {articles.length > 0 && (
        <div className="mt-16 flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal">Immigration data · {goal.label}</span>
              <h3 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">What changed on this route</h3>
            </div>
            <Link href="/blog" className="text-sm font-bold text-navy hover:text-teal">
              All briefs →
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-lg hover:shadow-navy/5"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-navy to-teal">
                  {a.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="flex flex-col gap-2 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal">
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : ""}
                    {a.publishedAt ? " · " : ""}
                    {a.category.replace(/_/g, " ").toLowerCase()}
                  </span>
                  <span className="line-clamp-2 text-lg font-bold leading-snug text-navy group-hover:text-teal">{a.title}</span>
                  <span className="line-clamp-2 text-sm text-gray-600">{a.summary}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
