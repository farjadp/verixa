# Content Pipeline (agent team)

Produces ~2 immigration articles a day from official sources, behind an admin switch that defaults to **draft only**.

```
discovery → selection/dedup → writer → SEO → reviewer (fact-check gate) → cover image → publisher
```

| Stage | Module | Uses LLM | Notes |
|---|---|---|---|
| Discovery | `agents/discovery.ts` | no | Enabled `ContentSource` rows, fetched concurrently: RSS/Atom, or a single-page same-host link scrape. Tags immigration paths (`paths.ts`). All fetches go through `net-guard.ts` (public http(s) hosts only, redirects re-checked, byte cap). |
| Selection | `agents/selection.ts` + `dedup.ts` | no | Skips items already handled (pipeline jobs, aggregator raw articles) or covered by a `BlogPost` (slug / title / keyword similarity). Collapses the same event reported by several sources (shared path, same/adjacent day, ≥0.3 title overlap), keeping the highest-trust source. Ranks by recency, source trust, path diversity. |
| Writer | `agents/writer.ts` | yes | Structured draft from source text only; citations restricted to the real source URL. The written title/keyword get a second dedup check before review. |
| SEO | `agents/seo-agent.ts` + `seo.ts` | no | Slug, meta title/description, heading fixes, internal links (related posts + consultant search), alt text, NewsArticle JSON-LD. |
| Reviewer | `agents/reviewer.ts` + `review-rules.ts` | yes | Claim-by-claim fact-check vs source + deterministic checks. Gate set by `content_review_strictness`. Guarantees the visible "not legal advice" disclaimer. |
| Image | `agents/image.ts` | image model | Engine from `aiImageModel` (FAL / `DALL_E_3` / `GPT_IMAGE_1`). OpenAI bytes are stored in `ContentImage` and served from `/api/content-image/[id]`. Failure never blocks a draft. |
| Publisher | `agents/publisher.ts` | no | Creates `BlogPost` + `SocialJob` in one transaction. **Never calls a social API.** |

Orchestration: `orchestrator.ts`, run daily by `/api/cron/content-pipeline` (13:00 UTC, `vercel.json`) or **Run now** in the admin page. Safe to rerun:

- **Daily quota** — stops once today's target is met.
- **Atomic run lock** — `PipelineRun.lockKey` is unique; a second concurrent run gets a unique-violation and skips.
- **Atomic job claim** — `ContentPipelineJob.dedupKey` is unique per item. A run creates the job, or takes over a `FAILED` one with a conditional update, so two runs never process the same item.
- **Recovery** — if Vercel kills a run at `maxDuration`, the next run marks that run `FAILED`, frees its lock, and fails its `ACTIVE` jobs ("Run timed out"), as well as any `ACTIVE` job untouched for 15 minutes.
- **Retries** — `FAILED` items retry automatically on later runs, up to 3 attempts. Admins can **Retry** a failed or reviewer-rejected job from the queue at any time.
- **Time budget** — new topics stop starting before the 300 s function limit.

## Settings (`PlatformSetting`, edit at `/dashboard/admin/content-pipeline`)

| Key | Default | Meaning |
|---|---|---|
| `content_language` | `en` | `en`, `fa`, `fr`, or bilingual `en+fa` / `en+fr` (adds a secondary-language summary). Prompts, section headings, footer, consultant links and social copy all come from `language.ts`; the post stores `BlogPost.language` for `inLanguage`, `lang`/`dir` and the FAQ heading. |
| `content_pieces_per_day` | `2` | Daily target (0–10). `0` pauses the pipeline. |
| `content_autopublish_enabled` | `false` | `false`: posts are created unpublished and wait for approval. `true`: posts that pass review go live. |
| `content_images_enabled` | `true` | `false` skips cover-image generation (and its cost); add images later in the Blog Engine. |
| `content_review_strictness` | `standard` | `lenient` (60+, ≤1 unsupported claim), `standard` (70+, 0 unsupported), `strict` (80+, 0 unsupported, ≤1 unverifiable). |
| `content_channel_{linkedin,twitter,facebook,telegram}` | `false` | Which channels get a queued social post. Disabled channels are marked `SKIPPED`. |

Social posts are always created as `QUEUED`. Sending is a separate, manual step in **Social Publishing**: the job must be approved there, and approval is blocked until the article is published. Rejecting a pipeline post marks its social job `CANCELLED`.

## Required env

`DATABASE_URL`, `OPENAI_API_KEY`, `CRON_SECRET` (the cron route returns 500 without it — there is no fallback), `NEXT_PUBLIC_APP_URL` (canonical URLs, JSON-LD, sitemap). Optional: `FAL_KEY` for FAL image engines.

## Setup

```bash
npx prisma migrate deploy                     # adds PipelineRun, ContentPipelineJob, ContentImage + BlogPost SEO columns
npx tsx scripts/seed-content-sources.ts       # IRCC + CIC News enabled; provincial pages added disabled
```

## Tests

`src/lib/content-pipeline/__tests__/` — dedup, SEO/slug, and an end-to-end run against an in-memory database with a fake LLM and `fetch` stubbed to throw.
