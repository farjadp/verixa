# Consultant Outreach — Plan A: Core + Email Channel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Verixa side of consultant outreach. This plan delivers:
- the lead CRM and its state machine
- the Fibonacci scheduler
- AI message composer and reply classifier
- CASL-compliant email channel
- worker API
- health and auto-pause checks
- the admin page

At the end of Plan A, email outreach runs end to end. LinkedIn and X are ready for
the worker.

**Architecture:** Pure logic lives in `src/lib/outreach/` (types, config, calendar,
state, scoring, scheduler, composer, classifier) and has no I/O. A Prisma-backed repo
and an engine sit on top. Vercel's daily crons plan the email day and schedule each
send through Resend `scheduledAt`, so the gaps between emails don't need frequent
crons. HTTP endpoints serve the local LinkedIn/X worker, which is built in Plan B.

**Tech Stack:** Next.js 16 route handlers and server components, Prisma 5 on Neon
Postgres, Resend 6, OpenAI through the existing `Llm` interface
(`src/lib/content-pipeline/types.ts`), zod 4, vitest 4 and Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-05-consultant-outreach-design.md`

**Plan B (separate, later):** `worker/` — a Playwright worker for LinkedIn and X, plus
the IMAP reply reader. It consumes the endpoints from Task 14.

## Global Constraints

- **Language and style:** TypeScript only; functional React components; Tailwind
  classes only, no inline `style`.
- **Config:** every secret and address comes from env vars. Nothing is hardcoded, and a
  missing secret fails closed.
- **Cadence:**
  - Active days Mon–Thu; rest days Fri–Sun.
  - 8 new leads per channel per day; 5 touches per channel per day, follow-ups included.
  - Max 3 touches per person.
  - Waits: 3 active days after touch 1, 5 after touch 2, 5 after touch 3 before closing.
- **Lead lifetimes:** backlog expiry 34 days; cooldown 89 days, with one re-contact;
  LinkedIn invite expiry 21 days.
- **Sending:** window 08:00–13:00 in the recipient's timezone; random gap of 5–13
  minutes between sends.
- **Auto-pause:** over a rolling 7 days, with at least 13 touches, pause when negative
  replies plus opt-outs exceed 8%. Heartbeat goes stale after 24 hours.
- **Channel rules:** one person, one channel (`OutreachLead.consultantProfileId` is
  unique). Every social message ends with the escape line. Every email carries
  unsubscribe, sender identity and mailing address (CASL).
- **Messages:** an LLM never invents numbers. Every digit in output must come from
  input facts.
- **Safe defaults:** `outreach.enabled=false`, `outreach.dryRun=true`, every channel
  disabled until the founder flips it in the admin.
- **Tests:** vitest; files `src/**/*.test.ts`. Run with `npx vitest run <path>`.

## Deviations from the spec (decided while planning)

1. **One lead row per consultant** (unique `consultantProfileId`) instead of a
   partial unique index. A channel change is an update on that row. This is simpler
   and enforces one-person-one-channel by construction.
2. **No `CONNECTED` state.** On LinkedIn, the invite note *is* touch 1. Acceptance
   moves the lead to `TOUCH_1` with touch 2 due on the next active day. An expired
   invite moves the lead to email at `TOUCH_1`, so email sends touches 2–3 and the
   3-touch cap holds.
3. **Email uses one daily cron plus Resend `scheduledAt`.** Each send is scheduled into
   the recipient's local window with random 5–13 minute gaps. This works on Vercel
   Hobby, where crons run at most once a day. The kill switch cancels scheduled emails
   that haven't gone out yet.

## File map

| File | Responsibility |
|---|---|
| `src/lib/unsubscribe.ts` (modify) | Fail-closed secret, constant-time verify, one-click URL |
| `src/app/api/unsubscribe/route.ts` (modify) | Add RFC 8058 one-click `POST` |
| `src/app/api/cron/reminders/route.ts` (modify) | Remove `dev_cron_secret` fallback |
| `prisma/schema.prisma` + migration | Four `Outreach*` models |
| `src/lib/outreach/types.ts` | Shared types |
| `src/lib/outreach/config.ts` | All cadence numbers |
| `src/lib/outreach/calendar.ts` | Timezone-aware day/window math |
| `src/lib/outreach/state.ts` | Pure transition function |
| `src/lib/outreach/scoring.ts` | Fibonacci-weighted score |
| `src/lib/outreach/scheduler.ts` | Pure task planner |
| `src/lib/outreach/composer.ts` | LLM message + fact check + escape line |
| `src/lib/outreach/classifier.ts` | Reply → label |
| `src/lib/outreach/offer.ts` | Founding offer contract (null until the admin branch lands) |
| `src/lib/outreach/settings.ts` | `PlatformSetting` flags + heartbeat |
| `src/lib/outreach/suppression.ts` | Cross-channel suppression |
| `src/lib/outreach/email.ts` | Build, send and cancel CASL email via Resend |
| `src/lib/outreach/repo.ts` | `OutreachRepo` interface + Prisma implementation |
| `src/lib/outreach/engine.ts` | Maintenance, discovery, email day planning, social tasks, reports, cancel |
| `src/lib/outreach/health.ts` | Heartbeat check + auto-pause |
| `src/lib/outreach/deps.ts` | Real dependency wiring |
| `src/app/api/cron/outreach-email/route.ts` | Daily email planning |
| `src/app/api/cron/outreach-health/route.ts` | Daily health + auto-pause |
| `src/app/api/outreach/worker/{tasks,candidates,report,heartbeat}/route.ts` | Worker API |
| `src/app/api/webhooks/resend/route.ts` (modify) | Bounce/complaint → suppress lead |
| `src/actions/outreach.actions.ts` | Admin server actions |
| `src/app/dashboard/admin/outreach/{page,OutreachDashboardClient}.tsx` | Admin UI |
| `src/components/ui/SidebarNav.tsx` (modify) | Nav entry |
| `vercel.json` (modify) | Two crons |

---

### Task 1: Harden unsubscribe and cron secrets

**Files:**
- Modify: `src/lib/unsubscribe.ts`
- Modify: `src/app/api/unsubscribe/route.ts`
- Modify: `src/app/api/cron/reminders/route.ts:23`
- Test: `src/lib/unsubscribe.test.ts`

**Interfaces:**
- Produces:
  - `signUnsubscribeToken(email: string): string` (throws when `UNSUBSCRIBE_SECRET` is unset)
  - `verifyUnsubscribeToken(email: string, token: string): boolean`
  - `buildUnsubscribeUrl(email: string): string`
  - `buildOneClickUnsubscribeUrl(email: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/unsubscribe.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("unsubscribe tokens", () => {
  const original = process.env.UNSUBSCRIBE_SECRET;
  beforeEach(() => { process.env.UNSUBSCRIBE_SECRET = "test-secret"; process.env.NEXT_PUBLIC_APP_URL = "https://example.test"; });
  afterEach(() => { if (original === undefined) delete process.env.UNSUBSCRIBE_SECRET; else process.env.UNSUBSCRIBE_SECRET = original; });

  it("round-trips a token, case-insensitive on email", async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import("./unsubscribe");
    const t = signUnsubscribeToken("A@B.com");
    expect(verifyUnsubscribeToken("a@b.com", t)).toBe(true);
  });

  it("rejects wrong and wrong-length tokens without throwing", async () => {
    const { verifyUnsubscribeToken } = await import("./unsubscribe");
    expect(verifyUnsubscribeToken("a@b.com", "x".repeat(24))).toBe(false);
    expect(verifyUnsubscribeToken("a@b.com", "short")).toBe(false);
  });

  it("fails closed when the secret is unset", async () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import("./unsubscribe");
    expect(() => signUnsubscribeToken("a@b.com")).toThrow(/UNSUBSCRIBE_SECRET/);
    expect(verifyUnsubscribeToken("a@b.com", "anything")).toBe(false);
  });

  it("builds a one-click API URL", async () => {
    const { buildOneClickUnsubscribeUrl } = await import("./unsubscribe");
    expect(buildOneClickUnsubscribeUrl("a@b.com")).toMatch(/^https:\/\/example\.test\/api\/unsubscribe\?email=a%40b\.com&token=[0-9a-f]{24}$/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/unsubscribe.test.ts`
Expected: FAIL. The "fails closed" case passes the fallback secret, and `buildOneClickUnsubscribeUrl` is undefined.

- [ ] **Step 3: Implement**

```ts
// src/lib/unsubscribe.ts
import crypto from "crypto";

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET is not configured.");
  return s;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com";
}

export function signUnsubscribeToken(email: string): string {
  return crypto.createHmac("sha256", secret()).update(email.toLowerCase()).digest("hex").slice(0, 24);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  let expected: string;
  try {
    expected = signUnsubscribeToken(email);
  } catch {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function buildUnsubscribeUrl(email: string): string {
  return `${baseUrl()}/unsubscribe?email=${encodeURIComponent(email)}&token=${signUnsubscribeToken(email)}`;
}

/** RFC 8058 target: mail clients POST here for one-click unsubscribe. */
export function buildOneClickUnsubscribeUrl(email: string): string {
  return `${baseUrl()}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${signUnsubscribeToken(email)}`;
}
```

In `src/app/api/unsubscribe/route.ts`, move the body of `GET` into a shared function
and add `POST`:

```ts
async function unsubscribe(email: string | null, token: string | null): Promise<"invalid" | "success" | "error"> {
  if (!email || !token || !verifyUnsubscribeToken(email, token)) return "invalid";
  try {
    await prisma.emailUnsubscribe.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), reason: "user_request" },
      update: { reason: "user_request" },
    });
    return "success";
  } catch {
    return "error";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = await unsubscribe(searchParams.get("email"), searchParams.get("token"));
  return NextResponse.redirect(new URL(`/unsubscribe?status=${status}`, req.url));
}

// RFC 8058 one-click: body is "List-Unsubscribe=One-Click"; identity comes from the signed URL.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = await unsubscribe(searchParams.get("email"), searchParams.get("token"));
  return NextResponse.json({ ok: status === "success" }, { status: status === "invalid" ? 400 : status === "error" ? 500 : 200 });
}
```

In `src/app/api/cron/reminders/route.ts`, replace the check on line 23 with the shared
constant-time helper:

```ts
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";
// ...
if (!isAuthorizedCronRequest(authHeader, process.env.CRON_SECRET ?? "")) {
```

Then run `grep -rn "CRON_SECRET ||\|dev_cron_secret" src/app/api`. Expected: no matches.
Fix any other match the same way.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/unsubscribe.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/unsubscribe.ts src/lib/unsubscribe.test.ts src/app/api/unsubscribe/route.ts src/app/api/cron/reminders/route.ts
git commit -m "fix(security): fail-closed unsubscribe tokens, one-click POST, no cron secret fallback"
```

---

### Task 2: Outreach data model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_outreach/migration.sql`. Generated; the
  name is chosen by Prisma.

**Interfaces:**
- Produces: Prisma models `OutreachLead`, `OutreachTouch`, `OutreachReply`,
  `OutreachSuppression`, plus the `ConsultantProfile.outreachLead` back-relation.

- [ ] **Step 1: Add the models**

Append to `prisma/schema.prisma`:

```prisma
// ============================================================================
// CONSULTANT OUTREACH (see docs/superpowers/specs/2026-11-05-consultant-outreach-design.md)
// ============================================================================

model OutreachLead {
  id                  String            @id @default(cuid())
  consultantProfileId String            @unique // one person, one channel
  consultantProfile   ConsultantProfile @relation(fields: [consultantProfileId], references: [id], onDelete: Cascade)
  channel             String            // LINKEDIN | X | EMAIL
  state               String            // see src/lib/outreach/types.ts LeadState
  externalHandle      String?           // LinkedIn profile URL or X handle
  matchConfidence     Float?
  score               Int               @default(0)
  touchCount          Int               @default(0)
  nextActionAt        DateTime?
  backlogSince        DateTime?
  recontactUsed       Boolean           @default(false)
  timezone            String            @default("America/Toronto")
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  touches OutreachTouch[]
  replies OutreachReply[]

  @@index([channel, state])
  @@index([nextActionAt])
}

model OutreachTouch {
  id                String       @id @default(cuid())
  leadId            String
  lead              OutreachLead @relation(fields: [leadId], references: [id], onDelete: Cascade)
  channel           String
  step              Int          // 1..3
  subject           String?
  body              String       @db.Text
  status            String       // QUEUED | SCHEDULED | SENT | FAILED | CANCELLED | DRY_RUN
  idempotencyKey    String       @unique // `${leadId}:${step}:${cycle}` (dry runs add `:dry:<ymd>`)
  externalMessageId String?
  scheduledFor      DateTime?
  sentAt            DateTime?
  error             String?
  createdAt         DateTime     @default(now())

  @@index([leadId])
  @@index([externalMessageId])
  @@index([channel, createdAt])
}

model OutreachReply {
  id         String       @id @default(cuid())
  leadId     String
  lead       OutreachLead @relation(fields: [leadId], references: [id], onDelete: Cascade)
  body       String       @db.Text
  label      String       // negative | positive | question | auto_reply
  confidence Float
  receivedAt DateTime     @default(now())

  @@index([leadId, receivedAt])
}

model OutreachSuppression {
  id                  String   @id @default(cuid())
  consultantProfileId String   @unique
  email               String?
  linkedinUrl         String?
  xHandle             String?
  reason              String   // negative_reply | unsubscribe | bounced | complained | manual
  createdAt           DateTime @default(now())

  @@index([email])
}
```

Add the back-relation inside `model ConsultantProfile`, under `enrichmentJobs`:

```prisma
  outreachLead         OutreachLead?
```

- [ ] **Step 2: Generate the migration**

Run: `npx prisma migrate dev --name add_outreach --create-only`
Expected: a new folder under `prisma/migrations/` whose `migration.sql` creates 4
tables and their indexes, and nothing else. Read it. If it touches other tables, stop
and investigate the schema drift before going on.

- [ ] **Step 3: Apply and generate the client**

Run: `npx prisma migrate dev` and then `npx prisma generate`
Expected: "Your database is now in sync with your schema." The client then exposes
`prisma.outreachLead`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(outreach): add lead, touch, reply and suppression models"
```

---

### Task 3: Types, config and calendar

**Files:**
- Create: `src/lib/outreach/types.ts`, `src/lib/outreach/config.ts`, `src/lib/outreach/calendar.ts`
- Test: `src/lib/outreach/__tests__/calendar.test.ts`

**Interfaces:**
- Produces:
  - Types: `Channel`, `LeadState`, `ReplyLabel`, `Step`, `LeadSnapshot`, `LeadEvent`;
    constant `OUTREACH`.
  - `localParts(d: Date, tz: string): { ymd: string; weekday: number; hour: number; minute: number }`
  - `isActiveDay(d: Date, tz: string): boolean`
  - `inSendWindow(d: Date, tz: string): boolean`
  - `addActiveDays(d: Date, n: number, tz: string): Date`
  - `addCalendarDays(d: Date, n: number): Date`
  - `localTimeToUtc(ymd: string, hour: number, minute: number, tz: string): Date`

- [ ] **Step 1: Write types and config**

```ts
// src/lib/outreach/types.ts
export const CHANNELS = ["LINKEDIN", "X", "EMAIL"] as const;
export type Channel = (typeof CHANNELS)[number];

export type LeadState =
  | "BACKLOG" | "INVITED" | "TOUCH_1" | "TOUCH_2" | "TOUCH_3"
  | "CONVERSATION" | "OPTED_OUT" | "CLAIMED" | "CLOSED_NO_REPLY" | "ARCHIVED";

/** States that automation never acts on again. */
export const TERMINAL_STATES: readonly LeadState[] = ["CONVERSATION", "OPTED_OUT", "CLAIMED", "ARCHIVED"];

export type ReplyLabel = "negative" | "positive" | "question" | "auto_reply";
export type Step = 1 | 2 | 3;

export interface LeadSnapshot {
  state: LeadState;
  channel: Channel;
  touchCount: number;
  nextActionAt: Date | null;
  backlogSince: Date | null;
  recontactUsed: boolean;
  timezone: string;
}

export type LeadEvent =
  | { type: "INVITE_SENT" }
  | { type: "INVITE_ACCEPTED" }
  | { type: "INVITE_EXPIRED" }
  | { type: "TOUCH_SENT"; step: Step }
  | { type: "TOUCH_CANCELLED"; step: Step }
  | { type: "NO_REPLY_TIMEOUT" }
  | { type: "COOLDOWN_ENDED" }
  | { type: "BACKLOG_EXPIRED" }
  | { type: "REPLY"; label: ReplyLabel }
  | { type: "CLAIMED" }
  | { type: "SUPPRESSED" }
  | { type: "REASSIGN"; channel: Channel };
```

```ts
// src/lib/outreach/config.ts
import type { Step } from "./types";

/** Every cadence number lives here. Values come from the spec (Fibonacci). */
export const OUTREACH = {
  activeWeekdays: [1, 2, 3, 4] as readonly number[], // Mon–Thu; 0 = Sunday
  newLeadsPerChannelPerDay: 8,
  touchesPerChannelPerDay: 5,
  maxTouchesPerPerson: 3,
  waitActiveDaysAfterTouch: { 1: 3, 2: 5, 3: 5 } as Record<Step, number>,
  autoReplyDelayActiveDays: 3,
  backlogExpiryDays: 34,
  cooldownDays: 89,
  inviteExpiryDays: 21,
  sendWindow: { startHour: 8, endHour: 13 },
  gapMinutes: { min: 5, max: 13 },
  discoverySampleSize: 89,
  minMatchConfidence: 0.8,
  operatorTimezone: "America/Toronto",
  autoPause: { windowDays: 7, minTouches: 13, maxNegativeRate: 0.08 },
  heartbeatStaleHours: 24,
  classifierMinConfidence: 0.7,
  linkedinInviteNoteMax: 300,
} as const;
```

- [ ] **Step 2: Write the failing calendar test**

```ts
// src/lib/outreach/__tests__/calendar.test.ts
import { describe, expect, it } from "vitest";
import { addActiveDays, inSendWindow, isActiveDay, localParts, localTimeToUtc } from "../calendar";

const TOR = "America/Toronto";

describe("calendar", () => {
  it("reads local parts (Thu 2026-11-05 10:00 EST)", () => {
    expect(localParts(new Date("2026-11-05T15:00:00Z"), TOR)).toEqual({ ymd: "2026-11-05", weekday: 4, hour: 10, minute: 0 });
  });

  it("treats Mon–Thu as active and Fri–Sun as rest", () => {
    expect(isActiveDay(new Date("2026-11-05T15:00:00Z"), TOR)).toBe(true);  // Thu
    expect(isActiveDay(new Date("2026-11-06T15:00:00Z"), TOR)).toBe(false); // Fri
    expect(isActiveDay(new Date("2026-11-08T15:00:00Z"), TOR)).toBe(false); // Sun
  });

  it("limits the send window to 08:00–13:00 local", () => {
    expect(inSendWindow(new Date("2026-11-05T13:00:00Z"), TOR)).toBe(true);  // 08:00
    expect(inSendWindow(new Date("2026-11-05T17:59:00Z"), TOR)).toBe(true);  // 12:59
    expect(inSendWindow(new Date("2026-11-05T18:00:00Z"), TOR)).toBe(false); // 13:00
    expect(inSendWindow(new Date("2026-11-05T12:59:00Z"), TOR)).toBe(false); // 07:59
  });

  it("adds active days across the weekend", () => {
    const thu = new Date("2026-11-05T15:00:00Z");
    expect(localParts(addActiveDays(thu, 1, TOR), TOR).ymd).toBe("2026-11-09"); // Mon
    expect(localParts(addActiveDays(thu, 3, TOR), TOR).ymd).toBe("2026-11-11"); // Wed
    expect(localParts(addActiveDays(thu, 5, TOR), TOR).ymd).toBe("2026-11-16"); // next Mon
  });

  it("converts local wall time to UTC, per timezone", () => {
    expect(localTimeToUtc("2026-11-09", 8, 0, TOR).toISOString()).toBe("2026-11-09T13:00:00.000Z");
    expect(localTimeToUtc("2026-11-09", 8, 0, "America/Vancouver").toISOString()).toBe("2026-11-09T16:00:00.000Z");
    expect(localTimeToUtc("2026-07-06", 8, 0, TOR).toISOString()).toBe("2026-07-06T12:00:00.000Z"); // EDT
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/calendar.test.ts`
Expected: FAIL, "Cannot find module '../calendar'".

- [ ] **Step 4: Implement**

```ts
// src/lib/outreach/calendar.ts
import { OUTREACH } from "./config";

const DAY_MS = 86_400_000;
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
    });
    formatters.set(tz, f);
  }
  return f;
}

function parts(d: Date, tz: string) {
  const p: Record<string, string> = {};
  for (const { type, value } of formatter(tz).formatToParts(d)) p[type] = value;
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute, weekday: WEEKDAYS[p.weekday] };
}

export function localParts(d: Date, tz: string) {
  const p = parts(d, tz);
  const ymd = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return { ymd, weekday: p.weekday, hour: p.hour, minute: p.minute };
}

export function isActiveDay(d: Date, tz: string): boolean {
  return OUTREACH.activeWeekdays.includes(localParts(d, tz).weekday);
}

export function inSendWindow(d: Date, tz: string): boolean {
  const { hour } = localParts(d, tz);
  return isActiveDay(d, tz) && hour >= OUTREACH.sendWindow.startHour && hour < OUTREACH.sendWindow.endHour;
}

export function addCalendarDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/** Moves forward one calendar day at a time until `n` active days have been counted. */
export function addActiveDays(d: Date, n: number, tz: string): Date {
  let cur = d;
  let counted = 0;
  while (counted < n) {
    cur = addCalendarDays(cur, 1);
    if (isActiveDay(cur, tz)) counted++;
  }
  return cur;
}

function offsetMs(d: Date, tz: string): number {
  const p = parts(d, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(d.getTime() / 60_000) * 60_000;
}

/** UTC instant for a wall-clock time in `tz`. Two passes settle DST edges. */
export function localTimeToUtc(ymd: string, hour: number, minute: number, tz: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, hour, minute);
  let guess = naive - offsetMs(new Date(naive), tz);
  guess = naive - offsetMs(new Date(guess), tz);
  return new Date(guess);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/outreach/__tests__/calendar.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/outreach/types.ts src/lib/outreach/config.ts src/lib/outreach/calendar.ts src/lib/outreach/__tests__/calendar.test.ts
git commit -m "feat(outreach): types, Fibonacci cadence config and timezone calendar"
```

---

### Task 4: Lead state machine

**Files:**
- Create: `src/lib/outreach/state.ts`
- Test: `src/lib/outreach/__tests__/state.test.ts`

**Interfaces:**
- Consumes: `LeadSnapshot`, `LeadEvent`, `TERMINAL_STATES` (Task 3); `OUTREACH`;
  `addActiveDays` and `addCalendarDays`.
- Produces:
  - `transition(lead: LeadSnapshot, event: LeadEvent, now: Date): LeadSnapshot`, which
    throws `InvalidTransitionError`.
  - `class InvalidTransitionError extends Error`
  - `newBacklogLead(channel: Channel, timezone: string, now: Date): LeadSnapshot`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/outreach/__tests__/state.test.ts
import { describe, expect, it } from "vitest";
import { InvalidTransitionError, newBacklogLead, transition } from "../state";
import { localParts } from "../calendar";

const TOR = "America/Toronto";
const thu = new Date("2026-11-05T15:00:00Z");
const ymd = (d: Date | null) => (d ? localParts(d, TOR).ymd : null);

describe("transition", () => {
  it("runs an email lead through 3 touches to closed, then cooldown", () => {
    let l = newBacklogLead("EMAIL", TOR, thu);
    l = transition(l, { type: "TOUCH_SENT", step: 1 }, thu);
    expect([l.state, l.touchCount, ymd(l.nextActionAt)]).toEqual(["TOUCH_1", 1, "2026-11-11"]);
    l = transition(l, { type: "TOUCH_SENT", step: 2 }, new Date("2026-11-11T15:00:00Z"));
    expect([l.state, ymd(l.nextActionAt)]).toEqual(["TOUCH_2", "2026-11-19"]); // Wed + 5 active days (Thu, Mon, Tue, Wed, Thu)
    l = transition(l, { type: "TOUCH_SENT", step: 3 }, new Date("2026-11-19T15:00:00Z"));
    l = transition(l, { type: "NO_REPLY_TIMEOUT" }, new Date("2026-11-25T15:00:00Z"));
    expect(l.state).toBe("CLOSED_NO_REPLY");
    expect(l.nextActionAt?.toISOString()).toBe("2027-02-22T15:00:00.000Z"); // +89 days
    l = transition(l, { type: "COOLDOWN_ENDED" }, new Date("2027-02-22T15:00:00Z"));
    expect([l.state, l.touchCount, l.recontactUsed]).toEqual(["BACKLOG", 0, true]);
    // second cooldown archives
    l = { ...l, state: "CLOSED_NO_REPLY" };
    expect(transition(l, { type: "COOLDOWN_ENDED" }, thu).state).toBe("ARCHIVED");
  });

  it("rejects out-of-order steps", () => {
    const l = newBacklogLead("EMAIL", TOR, thu);
    expect(() => transition(l, { type: "TOUCH_SENT", step: 2 }, thu)).toThrow(InvalidTransitionError);
  });

  it("treats the LinkedIn invite as touch 1", () => {
    let l = newBacklogLead("LINKEDIN", TOR, thu);
    l = transition(l, { type: "INVITE_SENT" }, thu);
    expect([l.state, l.touchCount]).toEqual(["INVITED", 1]);
    expect(l.nextActionAt?.toISOString()).toBe("2026-11-26T15:00:00.000Z"); // +21 days
    const accepted = transition(l, { type: "INVITE_ACCEPTED" }, thu);
    expect([accepted.state, ymd(accepted.nextActionAt)]).toEqual(["TOUCH_1", "2026-11-09"]);
    const expired = transition(l, { type: "INVITE_EXPIRED" }, thu);
    expect([expired.state, expired.channel, expired.touchCount]).toEqual(["TOUCH_1", "EMAIL", 1]);
    expect(expired.nextActionAt).toEqual(thu);
  });

  it("routes replies by label", () => {
    const sent = transition(newBacklogLead("EMAIL", TOR, thu), { type: "TOUCH_SENT", step: 1 }, thu);
    expect(transition(sent, { type: "REPLY", label: "negative" }, thu).state).toBe("OPTED_OUT");
    expect(transition(sent, { type: "REPLY", label: "positive" }, thu).state).toBe("CONVERSATION");
    expect(transition(sent, { type: "REPLY", label: "question" }, thu).state).toBe("CONVERSATION");
    const auto = transition(sent, { type: "REPLY", label: "auto_reply" }, thu);
    expect([auto.state, ymd(auto.nextActionAt)]).toEqual(["TOUCH_1", "2026-11-17"]); // due Wed 11-11 + 3 active days (Thu, Mon, Tue)
  });

  it("reverts a cancelled touch", () => {
    const sent = transition(newBacklogLead("EMAIL", TOR, thu), { type: "TOUCH_SENT", step: 1 }, thu);
    const back = transition(sent, { type: "TOUCH_CANCELLED", step: 1 }, thu);
    expect([back.state, back.touchCount, back.nextActionAt]).toEqual(["BACKLOG", 0, thu]);
  });

  it("claims and suppression win from any live state and are idempotent", () => {
    const sent = transition(newBacklogLead("X", TOR, thu), { type: "TOUCH_SENT", step: 1 }, thu);
    const claimed = transition(sent, { type: "CLAIMED" }, thu);
    expect(claimed.state).toBe("CLAIMED");
    expect(transition(claimed, { type: "SUPPRESSED" }, thu).state).toBe("CLAIMED");
    expect(transition(sent, { type: "SUPPRESSED" }, thu).state).toBe("OPTED_OUT");
  });

  it("reassigns only from backlog", () => {
    const l = newBacklogLead("X", TOR, thu);
    expect(transition(l, { type: "REASSIGN", channel: "EMAIL" }, thu).channel).toBe("EMAIL");
    const sent = transition(l, { type: "TOUCH_SENT", step: 1 }, thu);
    expect(() => transition(sent, { type: "REASSIGN", channel: "EMAIL" }, thu)).toThrow(InvalidTransitionError);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/state.test.ts`
Expected: FAIL, "Cannot find module '../state'".

- [ ] **Step 3: Implement**

```ts
// src/lib/outreach/state.ts
import { addActiveDays, addCalendarDays } from "./calendar";
import { OUTREACH } from "./config";
import type { Channel, LeadEvent, LeadSnapshot, LeadState, Step } from "./types";

export class InvalidTransitionError extends Error {
  constructor(state: LeadState, event: LeadEvent["type"]) {
    super(`Invalid outreach transition: ${event} from ${state}`);
    this.name = "InvalidTransitionError";
  }
}

const TOUCH_STATE: Record<Step, LeadState> = { 1: "TOUCH_1", 2: "TOUCH_2", 3: "TOUCH_3" };
const LIVE_REPLY_STATES: readonly LeadState[] = ["INVITED", "TOUCH_1", "TOUCH_2", "TOUCH_3", "CLOSED_NO_REPLY", "CONVERSATION"];

export function newBacklogLead(channel: Channel, timezone: string, now: Date): LeadSnapshot {
  return { state: "BACKLOG", channel, touchCount: 0, nextActionAt: null, backlogSince: now, recontactUsed: false, timezone };
}

export function transition(lead: LeadSnapshot, event: LeadEvent, now: Date): LeadSnapshot {
  const fail = (): never => { throw new InvalidTransitionError(lead.state, event.type); };
  const s = lead.state;

  switch (event.type) {
    case "CLAIMED":
      return s === "CLAIMED" ? lead : { ...lead, state: "CLAIMED", nextActionAt: null };

    case "SUPPRESSED":
      return s === "CLAIMED" || s === "OPTED_OUT" ? lead : { ...lead, state: "OPTED_OUT", nextActionAt: null };

    case "REPLY": {
      if (!LIVE_REPLY_STATES.includes(s)) return fail();
      if (event.label === "negative") return { ...lead, state: "OPTED_OUT", nextActionAt: null };
      if (event.label === "auto_reply") {
        if (s === "CONVERSATION") return lead;
        const base = lead.nextActionAt && lead.nextActionAt > now ? lead.nextActionAt : now;
        return { ...lead, nextActionAt: addActiveDays(base, OUTREACH.autoReplyDelayActiveDays, lead.timezone) };
      }
      return { ...lead, state: "CONVERSATION", nextActionAt: null };
    }

    case "INVITE_SENT":
      if (s !== "BACKLOG" || lead.channel !== "LINKEDIN" || lead.touchCount !== 0) return fail();
      return { ...lead, state: "INVITED", touchCount: 1, backlogSince: null, nextActionAt: addCalendarDays(now, OUTREACH.inviteExpiryDays) };

    case "INVITE_ACCEPTED":
      if (s !== "INVITED") return fail();
      return { ...lead, state: "TOUCH_1", nextActionAt: addActiveDays(now, 1, lead.timezone) };

    case "INVITE_EXPIRED":
      if (s !== "INVITED") return fail();
      return { ...lead, state: "TOUCH_1", channel: "EMAIL", nextActionAt: now };

    case "TOUCH_SENT": {
      const expectedFrom: LeadState = event.step === 1 ? "BACKLOG" : TOUCH_STATE[(event.step - 1) as Step];
      if (s !== expectedFrom || lead.touchCount !== event.step - 1) return fail();
      return {
        ...lead,
        state: TOUCH_STATE[event.step],
        touchCount: event.step,
        backlogSince: null,
        nextActionAt: addActiveDays(now, OUTREACH.waitActiveDaysAfterTouch[event.step], lead.timezone),
      };
    }

    case "TOUCH_CANCELLED": {
      if (s !== TOUCH_STATE[event.step] || lead.touchCount !== event.step) return fail();
      if (event.step === 1) return { ...lead, state: "BACKLOG", touchCount: 0, backlogSince: now, nextActionAt: now };
      return { ...lead, state: TOUCH_STATE[(event.step - 1) as Step], touchCount: event.step - 1, nextActionAt: now };
    }

    case "NO_REPLY_TIMEOUT":
      if (s !== "TOUCH_3" && s !== "TOUCH_2") return fail();
      return { ...lead, state: "CLOSED_NO_REPLY", nextActionAt: addCalendarDays(now, OUTREACH.cooldownDays) };

    case "COOLDOWN_ENDED":
      if (s !== "CLOSED_NO_REPLY") return fail();
      if (lead.recontactUsed) return { ...lead, state: "ARCHIVED", nextActionAt: null };
      return { ...lead, state: "BACKLOG", touchCount: 0, recontactUsed: true, backlogSince: now, nextActionAt: null };

    case "BACKLOG_EXPIRED":
      if (s !== "BACKLOG") return fail();
      return { ...lead, state: "ARCHIVED", nextActionAt: null };

    case "REASSIGN":
      if (s !== "BACKLOG") return fail();
      return { ...lead, channel: event.channel };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/outreach/__tests__/state.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/state.ts src/lib/outreach/__tests__/state.test.ts
git commit -m "feat(outreach): pure lead lifecycle state machine"
```

---

### Task 5: Lead scoring

**Files:**
- Create: `src/lib/outreach/scoring.ts`
- Test: `src/lib/outreach/__tests__/scoring.test.ts`

**Interfaces:**
- Produces:
  - `interface ScoreSignals { ciccActive: boolean; postedAboutMarketing: boolean; soloOrSmallFirm: boolean; activeLast21Days: boolean; hadProfileViews30d: boolean; socialProfileComplete: boolean }`
  - `scoreLead(s: ScoreSignals): number`
  - `isCiccActive(status: string | null | undefined): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/outreach/__tests__/scoring.test.ts
import { describe, expect, it } from "vitest";
import { isCiccActive, scoreLead } from "../scoring";

const none = { ciccActive: false, postedAboutMarketing: false, soloOrSmallFirm: false, activeLast21Days: false, hadProfileViews30d: false, socialProfileComplete: false };

describe("scoreLead", () => {
  it("sums Fibonacci weights", () => {
    expect(scoreLead({ ...none, ciccActive: true })).toBe(13);
    expect(scoreLead({ ciccActive: true, postedAboutMarketing: true, soloOrSmallFirm: true, activeLast21Days: true, hadProfileViews30d: true, socialProfileComplete: true })).toBe(32);
  });
  it("returns 0 for inactive licences regardless of other signals", () => {
    expect(scoreLead({ ...none, postedAboutMarketing: true, soloOrSmallFirm: true })).toBe(0);
  });
});

describe("isCiccActive", () => {
  it("accepts registry spellings of active", () => {
    expect(isCiccActive("Yes")).toBe(true);
    expect(isCiccActive("active")).toBe(true);
    expect(isCiccActive("No")).toBe(false);
    expect(isCiccActive(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/scoring.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/outreach/scoring.ts
export interface ScoreSignals {
  ciccActive: boolean;
  postedAboutMarketing: boolean;
  soloOrSmallFirm: boolean;
  activeLast21Days: boolean;
  hadProfileViews30d: boolean;
  socialProfileComplete: boolean;
}

const WEIGHTS: Record<keyof ScoreSignals, number> = {
  ciccActive: 13,
  postedAboutMarketing: 8,
  soloOrSmallFirm: 5,
  activeLast21Days: 3,
  hadProfileViews30d: 2,
  socialProfileComplete: 1,
};

/** An active licence is a gate: without it the lead is worthless. */
export function scoreLead(s: ScoreSignals): number {
  if (!s.ciccActive) return 0;
  return (Object.keys(WEIGHTS) as (keyof ScoreSignals)[]).reduce((sum, k) => (s[k] ? sum + WEIGHTS[k] : sum), 0);
}

/** The CICC import stores "Yes"/"No"; also accept "Active". */
export function isCiccActive(status: string | null | undefined): boolean {
  const v = (status ?? "").trim().toLowerCase();
  return v === "yes" || v === "active";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/outreach/__tests__/scoring.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/scoring.ts src/lib/outreach/__tests__/scoring.test.ts
git commit -m "feat(outreach): Fibonacci-weighted lead scoring"
```

---

### Task 6: Scheduler

**Files:**
- Create: `src/lib/outreach/scheduler.ts`
- Test: `src/lib/outreach/__tests__/scheduler.test.ts`

**Interfaces:**
- Consumes: `LeadSnapshot`, `Channel`, `Step` (Task 3); `OUTREACH`; `inSendWindow`,
  `isActiveDay`, `addCalendarDays`.
- Produces:
  - `interface SchedulableLead extends LeadSnapshot { id: string; score: number }`
  - `type Task = { kind: "INVITE"; leadId: string; step: 1 } | { kind: "TOUCH"; leadId: string; step: Step } | { kind: "CLOSE" | "EXPIRE_INVITE" | "ARCHIVE" | "RECONTACT"; leadId: string }`
  - `interface ScheduleInput { channel: Channel; leads: SchedulableLead[]; now: Date; sentToday: number; offerAvailable: boolean; activeDayOnly?: boolean }`
  - `planTasks(input: ScheduleInput): Task[]`. Maintenance tasks come first and are
    uncapped. Send tasks follow, capped at `touchesPerChannelPerDay - sentToday`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/outreach/__tests__/scheduler.test.ts
import { describe, expect, it } from "vitest";
import { planTasks, type SchedulableLead } from "../scheduler";

const TOR = "America/Toronto";
const now = new Date("2026-11-05T15:00:00Z"); // Thu 10:00 Toronto
const past = new Date("2026-11-04T15:00:00Z");

function lead(id: string, over: Partial<SchedulableLead> = {}): SchedulableLead {
  return { id, score: 13, state: "BACKLOG", channel: "EMAIL", touchCount: 0, nextActionAt: null, backlogSince: past, recontactUsed: false, timezone: TOR, ...over };
}

describe("planTasks", () => {
  it("caps sends at 5 minus already sent, follow-ups first, then best score", () => {
    const leads = [
      lead("b1", { score: 18 }), lead("b2", { score: 31 }), lead("b3", { score: 13 }),
      lead("f1", { state: "TOUCH_1", touchCount: 1, nextActionAt: past }),
    ];
    const tasks = planTasks({ channel: "EMAIL", leads, now, sentToday: 2, offerAvailable: true });
    expect(tasks).toEqual([
      { kind: "TOUCH", leadId: "f1", step: 2 },
      { kind: "TOUCH", leadId: "b2", step: 1 },
      { kind: "TOUCH", leadId: "b1", step: 1 },
    ]);
  });

  it("uses INVITE for LinkedIn backlog", () => {
    const tasks = planTasks({ channel: "LINKEDIN", leads: [lead("l1", { channel: "LINKEDIN" })], now, sentToday: 0, offerAvailable: true });
    expect(tasks).toEqual([{ kind: "INVITE", leadId: "l1", step: 1 }]);
  });

  it("skips leads outside their send window, unless activeDayOnly", () => {
    const van = lead("v1", { timezone: "America/Vancouver" }); // 07:00 in Vancouver
    expect(planTasks({ channel: "EMAIL", leads: [van], now, sentToday: 0, offerAvailable: true })).toEqual([]);
    expect(planTasks({ channel: "EMAIL", leads: [van], now, sentToday: 0, offerAvailable: true, activeDayOnly: true })).toHaveLength(1);
  });

  it("sends nothing on rest days but still does maintenance", () => {
    const fri = new Date("2026-11-06T15:00:00Z");
    const old = lead("old", { backlogSince: new Date("2026-10-01T15:00:00Z") });
    expect(planTasks({ channel: "EMAIL", leads: [old, lead("x")], now: fri, sentToday: 0, offerAvailable: true })).toEqual([{ kind: "ARCHIVE", leadId: "old" }]);
  });

  it("closes after touch 3, and after touch 2 when no offer exists", () => {
    const t3 = lead("t3", { state: "TOUCH_3", touchCount: 3, nextActionAt: past });
    const t2 = lead("t2", { state: "TOUCH_2", touchCount: 2, nextActionAt: past });
    const tasks = planTasks({ channel: "EMAIL", leads: [t3, t2], now, sentToday: 0, offerAvailable: false });
    expect(tasks).toEqual([{ kind: "CLOSE", leadId: "t3" }, { kind: "CLOSE", leadId: "t2" }]);
  });

  it("expires invites and ends cooldowns", () => {
    const inv = lead("i", { channel: "LINKEDIN", state: "INVITED", touchCount: 1, nextActionAt: past });
    const cool = lead("c", { channel: "LINKEDIN", state: "CLOSED_NO_REPLY", touchCount: 3, nextActionAt: past });
    expect(planTasks({ channel: "LINKEDIN", leads: [inv, cool], now, sentToday: 5, offerAvailable: true }))
      .toEqual([{ kind: "EXPIRE_INVITE", leadId: "i" }, { kind: "RECONTACT", leadId: "c" }]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/scheduler.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/outreach/scheduler.ts
import { addCalendarDays, inSendWindow, isActiveDay } from "./calendar";
import { OUTREACH } from "./config";
import type { Channel, LeadSnapshot, Step } from "./types";

export interface SchedulableLead extends LeadSnapshot {
  id: string;
  score: number;
}

export type Task =
  | { kind: "INVITE"; leadId: string; step: 1 }
  | { kind: "TOUCH"; leadId: string; step: Step }
  | { kind: "CLOSE" | "EXPIRE_INVITE" | "ARCHIVE" | "RECONTACT"; leadId: string };

export interface ScheduleInput {
  channel: Channel;
  leads: SchedulableLead[];
  now: Date;
  sentToday: number;
  offerAvailable: boolean;
  /** Email plans the day before the window opens: require only an active day. */
  activeDayOnly?: boolean;
}

const due = (l: SchedulableLead, now: Date) => l.nextActionAt !== null && l.nextActionAt <= now;

export function planTasks({ channel, leads, now, sentToday, offerAvailable, activeDayOnly }: ScheduleInput): Task[] {
  const mine = leads.filter((l) => l.channel === channel);
  const maintenance: Task[] = [];
  const followUps: SchedulableLead[] = [];
  const backlog: SchedulableLead[] = [];

  for (const l of mine) {
    if (l.state === "BACKLOG" && l.backlogSince && addCalendarDays(l.backlogSince, OUTREACH.backlogExpiryDays) <= now) {
      maintenance.push({ kind: "ARCHIVE", leadId: l.id });
    } else if (l.state === "CLOSED_NO_REPLY" && due(l, now)) {
      maintenance.push({ kind: "RECONTACT", leadId: l.id });
    } else if (l.state === "INVITED" && due(l, now)) {
      maintenance.push({ kind: "EXPIRE_INVITE", leadId: l.id });
    } else if (l.state === "TOUCH_3" && due(l, now)) {
      maintenance.push({ kind: "CLOSE", leadId: l.id });
    } else if (l.state === "TOUCH_2" && due(l, now) && !offerAvailable) {
      maintenance.push({ kind: "CLOSE", leadId: l.id });
    } else if ((l.state === "TOUCH_1" || l.state === "TOUCH_2") && due(l, now)) {
      followUps.push(l);
    } else if (l.state === "BACKLOG" && (l.nextActionAt === null || due(l, now))) {
      backlog.push(l);
    }
  }

  const sendable = (l: SchedulableLead) => (activeDayOnly ? isActiveDay(now, l.timezone) : inSendWindow(now, l.timezone));
  followUps.sort((a, b) => a.nextActionAt!.getTime() - b.nextActionAt!.getTime());
  backlog.sort((a, b) => b.score - a.score);

  const capacity = Math.max(0, OUTREACH.touchesPerChannelPerDay - sentToday);
  const sends: Task[] = [];
  for (const l of [...followUps, ...backlog]) {
    if (sends.length >= capacity) break;
    if (!sendable(l)) continue;
    if (l.state === "BACKLOG") {
      sends.push(channel === "LINKEDIN" ? { kind: "INVITE", leadId: l.id, step: 1 } : { kind: "TOUCH", leadId: l.id, step: 1 });
    } else {
      sends.push({ kind: "TOUCH", leadId: l.id, step: (l.touchCount + 1) as Step });
    }
  }
  return [...maintenance, ...sends];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/outreach/__tests__/scheduler.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/scheduler.ts src/lib/outreach/__tests__/scheduler.test.ts
git commit -m "feat(outreach): capped, timezone-aware task scheduler"
```

---

### Task 7: Founding-offer contract and message composer

**Files:**
- Create: `src/lib/outreach/offer.ts`, `src/lib/outreach/composer.ts`
- Test: `src/lib/outreach/__tests__/composer.test.ts`

**Interfaces:**
- Consumes: `Llm` from `@/lib/content-pipeline/types`; `Channel`, `Step`; `OUTREACH`.
- Produces:
  - `interface FoundingOffer { planName: string; freeMonths: number; priceAfterCents: number; currency: string; remainingSlots: number | null; deadline: Date | null }`
  - `getFoundingOfferForOutreach(): Promise<FoundingOffer | null>`
  - `interface ComposeInput { channel: Channel; step: Step; firstName: string; city: string | null; profileUrl: string; claimUrl: string; profileViews30d: number | null; offer: FoundingOffer | null }`
  - `interface ComposedMessage { subject: string | null; body: string }`
  - `composeMessage(llm: Llm, input: ComposeInput): Promise<ComposedMessage>`
  - `class ComposeRejectedError extends Error`
  - `ESCAPE_LINE`, `INVITE_ESCAPE_LINE`
  - `extractNumbers(text: string): string[]`

- [ ] **Step 1: Write the offer contract**

```ts
// src/lib/outreach/offer.ts
export interface FoundingOffer {
  planName: string;
  freeMonths: number;
  priceAfterCents: number;
  currency: string;
  remainingSlots: number | null;
  deadline: Date | null;
}

/**
 * The live founding offer, managed by the founder in the admin.
 * Returns null while no offer source exists. Per the spec, touch 3 is then skipped
 * and the sequence ends after touch 2. Task 18 wires this to getActiveFoundingOffer()
 * once the admin plans/offers branch is merged.
 */
export async function getFoundingOfferForOutreach(): Promise<FoundingOffer | null> {
  return null;
}
```

- [ ] **Step 2: Write the failing composer test**

```ts
// src/lib/outreach/__tests__/composer.test.ts
import { describe, expect, it } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { ComposeRejectedError, ESCAPE_LINE, INVITE_ESCAPE_LINE, composeMessage, extractNumbers, type ComposeInput } from "../composer";

const fakeLlm = (out: { subject: string | null; body: string }): Llm => ({ json: async () => out as never });

const base: ComposeInput = {
  channel: "EMAIL", step: 1, firstName: "Sara", city: "Toronto",
  profileUrl: "https://getverixa.com/consultant/R123456", claimUrl: "https://getverixa.com/claim/R123456",
  profileViews30d: 21, offer: null,
};

describe("composeMessage", () => {
  it("returns subject + body for email without an escape line (the footer handles it)", async () => {
    const m = await composeMessage(fakeLlm({ subject: "Your Verixa listing", body: "Hi Sara, your listing got 21 views: https://getverixa.com/consultant/R123456" }), base);
    expect(m).toEqual({ subject: "Your Verixa listing", body: "Hi Sara, your listing got 21 views: https://getverixa.com/consultant/R123456" });
  });

  it("rejects invented numbers", async () => {
    await expect(composeMessage(fakeLlm({ subject: "Hi", body: "Your profile got 340 views" }), base)).rejects.toThrow(ComposeRejectedError);
  });

  it("rejects email without a subject", async () => {
    await expect(composeMessage(fakeLlm({ subject: null, body: "Hi Sara" }), base)).rejects.toThrow(ComposeRejectedError);
  });

  it("appends the escape line on social channels", async () => {
    const m = await composeMessage(fakeLlm({ subject: null, body: "Hi Sara, quick note." }), { ...base, channel: "X", step: 2 });
    expect(m.body.endsWith(ESCAPE_LINE)).toBe(true);
    expect(m.subject).toBeNull();
  });

  it("keeps LinkedIn invite notes within 300 chars", async () => {
    const ok = await composeMessage(fakeLlm({ subject: null, body: "Hi Sara, your CICC listing is on Verixa." }), { ...base, channel: "LINKEDIN" });
    expect(ok.body.endsWith(INVITE_ESCAPE_LINE)).toBe(true);
    expect(ok.body.length).toBeLessThanOrEqual(300);
    await expect(composeMessage(fakeLlm({ subject: null, body: "x".repeat(290) }), { ...base, channel: "LINKEDIN" })).rejects.toThrow(ComposeRejectedError);
  });

  it("allows offer numbers on touch 3", async () => {
    const offer = { planName: "Pro", freeMonths: 12, priceAfterCents: 4900, currency: "CAD", remainingSlots: 13, deadline: new Date("2027-01-31T12:00:00Z") };
    const m = await composeMessage(fakeLlm({ subject: "Founding spot", body: "12 months free, then $49/month. 13 spots left until January 31, 2027." }), { ...base, step: 3, offer });
    expect(m.body).toContain("$49");
  });
});

describe("extractNumbers", () => {
  it("ignores digits inside URLs", () => {
    expect(extractNumbers("see https://x.com/a/R123 got 21, $49.00")).toEqual(["21", "49.00"]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/composer.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement**

```ts
// src/lib/outreach/composer.ts
import { z } from "zod";
import type { Llm } from "@/lib/content-pipeline/types";
import { OUTREACH } from "./config";
import type { FoundingOffer } from "./offer";
import type { Channel, Step } from "./types";

export const ESCAPE_LINE = 'Not relevant? Just reply "no" and I won\'t message again.';
export const INVITE_ESCAPE_LINE = "Not relevant? Just ignore this.";

export class ComposeRejectedError extends Error {
  constructor(reason: string) {
    super(`Composed message rejected: ${reason}`);
    this.name = "ComposeRejectedError";
  }
}

export interface ComposeInput {
  channel: Channel;
  step: Step;
  firstName: string;
  city: string | null;
  profileUrl: string;
  claimUrl: string;
  profileViews30d: number | null;
  offer: FoundingOffer | null;
}

export interface ComposedMessage {
  subject: string | null;
  body: string;
}

const schema = z.object({ subject: z.string().nullable(), body: z.string().min(1) });

const SYSTEM = `You write short, honest outreach from Farjad, the solo founder of Verixa, to a licensed Canadian immigration consultant (RCIC).
Verixa already lists every RCIC from the public CICC registry; the consultant can claim their listing.
Rules:
- Plain, warm, specific. No hype, no exclamation marks, no emojis, no "I hope this finds you well".
- Never invent facts or numbers. Use only numbers given in FACTS. If a fact is null, don't mention it.
- One clear, low-pressure next step. Sign off as "Farjad" (email) or no sign-off (social).
- Email: subject under 60 characters, body under 120 words. LinkedIn invite: body under 240 characters. Other social: under 80 words.
- Each message must stand on its own and include the profile link.`;

const STEP_BRIEF: Record<Step, string> = {
  1: "Tell them their public CICC listing is on Verixa and share the profile link. Ask nothing beyond taking a look.",
  2: "If profileViews30d is a positive number, mention it. Otherwise, a short useful note on how clients search for consultants by city and specialization. Softly invite them to claim the listing (claim link).",
  3: "Present the founding offer exactly as given in FACTS.offer (free months, plan, price afterwards, cancel anytime, slots/deadline if present). Claim link. Make clear this is the last message.",
};

function money(cents: number): string[] {
  const dollars = cents / 100;
  return [String(dollars), dollars.toFixed(2)];
}

function allowedNumbers(input: ComposeInput): Set<string> {
  const allowed = new Set<string>();
  if (input.profileViews30d !== null) allowed.add(String(input.profileViews30d));
  const o = input.offer;
  if (o) {
    allowed.add(String(o.freeMonths));
    if (o.freeMonths % 12 === 0) allowed.add(String(o.freeMonths / 12));
    money(o.priceAfterCents).forEach((v) => allowed.add(v));
    if (o.remainingSlots !== null) allowed.add(String(o.remainingSlots));
    if (o.deadline) {
      allowed.add(String(o.deadline.getUTCDate()));
      allowed.add(String(o.deadline.getUTCFullYear()));
    }
  }
  return allowed;
}

export function extractNumbers(text: string): string[] {
  const withoutUrls = text.replace(/https?:\/\/\S+/g, " ");
  return (withoutUrls.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
}

function userPrompt(input: ComposeInput): string {
  const facts = {
    firstName: input.firstName,
    city: input.city,
    profileUrl: input.profileUrl,
    claimUrl: input.claimUrl,
    profileViews30d: input.profileViews30d,
    offer: input.step === 3 && input.offer
      ? { ...input.offer, priceAfter: `$${input.offer.priceAfterCents / 100} ${input.offer.currency}/month`, deadline: input.offer.deadline?.toISOString().slice(0, 10) ?? null }
      : null,
  };
  const kind = input.channel === "EMAIL" ? "email (return subject and body)" : input.channel === "LINKEDIN" && input.step === 1 ? "LinkedIn connection-invite note (subject null)" : `${input.channel} direct message (subject null)`;
  return `Write touch ${input.step} of 3 as a ${kind}.\nBRIEF: ${STEP_BRIEF[input.step]}\nFACTS: ${JSON.stringify(facts)}`;
}

export async function composeMessage(llm: Llm, input: ComposeInput): Promise<ComposedMessage> {
  if (input.step === 3 && !input.offer) throw new ComposeRejectedError("touch 3 requires an active offer");
  const raw = await llm.json(schema, "outreach_message", SYSTEM, userPrompt(input));
  const body = raw.body.trim();
  const subject = raw.subject?.trim() || null;

  const allowed = allowedNumbers(input);
  const stray = extractNumbers(`${subject ?? ""} ${body}`).filter((n) => !allowed.has(n));
  if (stray.length > 0) throw new ComposeRejectedError(`numbers not in facts: ${stray.join(", ")}`);

  if (input.channel === "EMAIL") {
    if (!subject) throw new ComposeRejectedError("email needs a subject");
    return { subject, body };
  }

  const isInvite = input.channel === "LINKEDIN" && input.step === 1;
  const full = `${body}\n\n${isInvite ? INVITE_ESCAPE_LINE : ESCAPE_LINE}`;
  if (isInvite && full.length > OUTREACH.linkedinInviteNoteMax) throw new ComposeRejectedError(`invite note is ${full.length} chars`);
  return { subject: null, body: full };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/outreach/__tests__/composer.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/outreach/offer.ts src/lib/outreach/composer.ts src/lib/outreach/__tests__/composer.test.ts
git commit -m "feat(outreach): fact-checked LLM composer with escape lines and offer contract"
```

---

### Task 8: Reply classifier

**Files:**
- Create: `src/lib/outreach/classifier.ts`
- Test: `src/lib/outreach/__tests__/classifier.test.ts`

**Interfaces:**
- Consumes: `Llm`; `ReplyLabel`; `OUTREACH.classifierMinConfidence`.
- Produces: `classifyReply(llm: Llm, text: string): Promise<{ label: ReplyLabel; confidence: number }>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/outreach/__tests__/classifier.test.ts
import { describe, expect, it, vi } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { classifyReply } from "../classifier";

const llm = (label: string, confidence: number): Llm => ({ json: vi.fn(async () => ({ label, confidence }) as never) });

describe("classifyReply", () => {
  it("short-circuits obvious refusals without calling the LLM", async () => {
    const l = llm("positive", 1);
    expect(await classifyReply(l, "No thanks")).toEqual({ label: "negative", confidence: 1 });
    expect(await classifyReply(l, "please STOP")).toEqual({ label: "negative", confidence: 1 });
    expect(l.json).not.toHaveBeenCalled();
  });

  it("uses the LLM label when confident", async () => {
    expect(await classifyReply(llm("positive", 0.9), "Sounds interesting, tell me more")).toEqual({ label: "positive", confidence: 0.9 });
  });

  it("falls back to question (human review) when unsure", async () => {
    expect(await classifyReply(llm("negative", 0.4), "hmm maybe later")).toEqual({ label: "question", confidence: 0.4 });
  });

  it("treats empty replies as question", async () => {
    expect((await classifyReply(llm("positive", 1), "   ")).label).toBe("question");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/classifier.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/outreach/classifier.ts
import { z } from "zod";
import type { Llm } from "@/lib/content-pipeline/types";
import { OUTREACH } from "./config";
import type { ReplyLabel } from "./types";

const schema = z.object({
  label: z.enum(["negative", "positive", "question", "auto_reply"]),
  confidence: z.number().min(0).max(1),
});

const OBVIOUS_NO = /^\s*(no\b|nope\b|not interested|stop\b|unsubscribe|remove me|please stop|don'?t (contact|message|email) me)|\b(stop|unsubscribe|remove me)\s*[.!]*\s*$/i;

const SYSTEM = `Classify a reply to a cold outreach message to an immigration consultant.
negative = declines, asks to stop, annoyed. positive = interested, wants to proceed. question = asks something or is unclear. auto_reply = out-of-office or automated.
Return the label and your confidence 0..1.`;

export async function classifyReply(llm: Llm, text: string): Promise<{ label: ReplyLabel; confidence: number }> {
  const t = text.trim();
  if (!t) return { label: "question", confidence: 0 };
  if (OBVIOUS_NO.test(t)) return { label: "negative", confidence: 1 };
  const r = await llm.json(schema, "reply_label", SYSTEM, t.slice(0, 4000));
  if (r.confidence < OUTREACH.classifierMinConfidence) return { label: "question", confidence: r.confidence };
  return r;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/outreach/__tests__/classifier.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/classifier.ts src/lib/outreach/__tests__/classifier.test.ts
git commit -m "feat(outreach): reply classifier with safe low-confidence fallback"
```

---

### Task 9: Settings and suppression

**Files:**
- Create: `src/lib/outreach/settings.ts`, `src/lib/outreach/suppression.ts`
- Test: `src/lib/outreach/__tests__/settings.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`; `Channel`.
- Produces:
  - `interface OutreachSettings { enabled: boolean; dryRun: boolean; channels: Record<Channel, boolean> }`
  - `getOutreachSettings(): Promise<OutreachSettings>`, with defaults enabled=false,
    dryRun=true and channels all false
  - `setOutreachFlag(key: OutreachFlag, value: boolean): Promise<void>`, where
    `type OutreachFlag = "enabled" | "dryRun" | Channel`
  - `recordHeartbeat(now: Date): Promise<void>`
  - `getHeartbeat(): Promise<Date | null>`
  - `isSuppressed(p: { id: string; rawEmail: string | null }): Promise<boolean>`
  - `suppress(consultantProfileId: string, reason: string, contact?: { email?: string | null; linkedinUrl?: string | null; xHandle?: string | null }): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/outreach/__tests__/settings.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformSetting: {
      findMany: vi.fn(async ({ where }: { where: { key: { startsWith: string } } }) =>
        [...store].filter(([k]) => k.startsWith(where.key.startsWith)).map(([key, value]) => ({ key, value }))),
      upsert: vi.fn(async ({ where, create }: { where: { key: string }; create: { value: string } }) => { store.set(where.key, create.value); }),
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => (store.has(where.key) ? { value: store.get(where.key) } : null)),
    },
  },
}));

import { getHeartbeat, getOutreachSettings, recordHeartbeat, setOutreachFlag } from "../settings";

describe("outreach settings", () => {
  beforeEach(() => store.clear());

  it("defaults to off, dry-run, all channels disabled", async () => {
    expect(await getOutreachSettings()).toEqual({ enabled: false, dryRun: true, channels: { LINKEDIN: false, X: false, EMAIL: false } });
  });

  it("persists flags", async () => {
    await setOutreachFlag("enabled", true);
    await setOutreachFlag("EMAIL", true);
    await setOutreachFlag("dryRun", false);
    expect(await getOutreachSettings()).toEqual({ enabled: true, dryRun: false, channels: { LINKEDIN: false, X: false, EMAIL: true } });
  });

  it("stores the heartbeat", async () => {
    const t = new Date("2026-11-05T15:00:00Z");
    await recordHeartbeat(t);
    expect(await getHeartbeat()).toEqual(t);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/settings.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/outreach/settings.ts
import { prisma } from "@/lib/prisma";
import { CHANNELS, type Channel } from "./types";

export type OutreachFlag = "enabled" | "dryRun" | Channel;
export interface OutreachSettings {
  enabled: boolean;
  dryRun: boolean;
  channels: Record<Channel, boolean>;
}

const PREFIX = "outreach.";
const HEARTBEAT = "outreach.worker.lastHeartbeat";
const flagKey = (f: OutreachFlag) => (f === "enabled" || f === "dryRun" ? `${PREFIX}${f}` : `${PREFIX}${f.toLowerCase()}.enabled`);

export async function getOutreachSettings(): Promise<OutreachSettings> {
  const rows = await prisma.platformSetting.findMany({ where: { key: { startsWith: PREFIX } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const flag = (f: OutreachFlag, fallback: boolean) => (map.has(flagKey(f)) ? map.get(flagKey(f)) === "true" : fallback);
  return {
    enabled: flag("enabled", false),
    dryRun: flag("dryRun", true),
    channels: Object.fromEntries(CHANNELS.map((c) => [c, flag(c, false)])) as Record<Channel, boolean>,
  };
}

export async function setOutreachFlag(f: OutreachFlag, value: boolean): Promise<void> {
  const key = flagKey(f);
  await prisma.platformSetting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } });
}

export async function recordHeartbeat(now: Date): Promise<void> {
  const value = now.toISOString();
  await prisma.platformSetting.upsert({ where: { key: HEARTBEAT }, create: { key: HEARTBEAT, value }, update: { value } });
}

export async function getHeartbeat(): Promise<Date | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key: HEARTBEAT } });
  return row ? new Date(row.value) : null;
}
```

```ts
// src/lib/outreach/suppression.ts
import { prisma } from "@/lib/prisma";

/** Suppressed on any channel = suppressed on all channels, forever. */
export async function isSuppressed(p: { id: string; rawEmail: string | null }): Promise<boolean> {
  const [s, u] = await Promise.all([
    prisma.outreachSuppression.findUnique({ where: { consultantProfileId: p.id }, select: { id: true } }),
    p.rawEmail ? prisma.emailUnsubscribe.findUnique({ where: { email: p.rawEmail.toLowerCase() }, select: { id: true } }) : null,
  ]);
  return Boolean(s || u);
}

export async function suppress(
  consultantProfileId: string,
  reason: string,
  contact: { email?: string | null; linkedinUrl?: string | null; xHandle?: string | null } = {},
): Promise<void> {
  const email = contact.email?.toLowerCase() ?? null;
  await prisma.outreachSuppression.upsert({
    where: { consultantProfileId },
    create: { consultantProfileId, reason, email, linkedinUrl: contact.linkedinUrl ?? null, xHandle: contact.xHandle ?? null },
    update: { reason },
  });
  if (email) {
    await prisma.emailUnsubscribe.upsert({ where: { email }, create: { email, reason }, update: {} });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/outreach/__tests__/settings.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/settings.ts src/lib/outreach/suppression.ts src/lib/outreach/__tests__/settings.test.ts
git commit -m "feat(outreach): safe-default settings flags and cross-channel suppression"
```

---

### Task 10: CASL email builder and sender

**Files:**
- Create: `src/lib/outreach/email.ts`
- Test: `src/lib/outreach/__tests__/email.test.ts`

**Interfaces:**
- Consumes: `buildUnsubscribeUrl` and `buildOneClickUnsubscribeUrl` (Task 1); `resend`
  package.
- Produces:
  - `interface BuiltEmail { from: string; to: string; replyTo: string; subject: string; text: string; html: string; headers: Record<string, string> }`
  - `buildOutreachEmail(input: { to: string; subject: string; body: string }, env?: NodeJS.ProcessEnv): BuiltEmail`
  - `class OutreachConfigError extends Error`
  - `sendOutreachEmail(msg: BuiltEmail, scheduledAt: Date | null): Promise<{ id: string }>`
  - `cancelOutreachEmail(id: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/outreach/__tests__/email.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { OutreachConfigError, buildOutreachEmail } from "../email";

const env = {
  OUTREACH_FROM_EMAIL: "Farjad from Verixa <farjad@outreach.example.test>",
  OUTREACH_MAILING_ADDRESS: "1 Test St, Newmarket, ON L3Y 0A0, Canada",
  OUTREACH_REPLY_TO: "farjad@example.test",
} as unknown as NodeJS.ProcessEnv;

describe("buildOutreachEmail", () => {
  beforeEach(() => { process.env.UNSUBSCRIBE_SECRET = "s"; process.env.NEXT_PUBLIC_APP_URL = "https://example.test"; });

  it("adds CASL identity, address and unsubscribe, plus one-click headers", () => {
    const m = buildOutreachEmail({ to: "rcic@firm.ca", subject: "Your listing", body: "Hi <Sara>,\nline two" }, env);
    expect(m.from).toBe(env.OUTREACH_FROM_EMAIL);
    expect(m.replyTo).toBe("farjad@example.test");
    expect(m.text).toContain("1 Test St, Newmarket, ON L3Y 0A0, Canada");
    expect(m.text).toMatch(/Unsubscribe: https:\/\/example\.test\/unsubscribe\?email=rcic%40firm\.ca&token=/);
    expect(m.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/example\.test\/api\/unsubscribe\?email=rcic%40firm\.ca&token=[0-9a-f]{24}>$/);
    expect(m.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(m.html).toContain("Hi &lt;Sara&gt;,<br>line two");
  });

  it("refuses to build without sender, address or reply-to", () => {
    for (const k of ["OUTREACH_FROM_EMAIL", "OUTREACH_MAILING_ADDRESS", "OUTREACH_REPLY_TO"] as const) {
      expect(() => buildOutreachEmail({ to: "a@b.ca", subject: "s", body: "b" }, { ...env, [k]: "" })).toThrow(OutreachConfigError);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/email.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/outreach/email.ts
import { Resend } from "resend";
import { buildOneClickUnsubscribeUrl, buildUnsubscribeUrl } from "@/lib/unsubscribe";

export class OutreachConfigError extends Error {
  constructor(missing: string) {
    super(`Outreach email is not configured: ${missing} is unset.`);
    this.name = "OutreachConfigError";
  }
}

export interface BuiltEmail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function required(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key]?.trim();
  if (!v) throw new OutreachConfigError(key);
  return v;
}

export function buildOutreachEmail(input: { to: string; subject: string; body: string }, env: NodeJS.ProcessEnv = process.env): BuiltEmail {
  const from = required(env, "OUTREACH_FROM_EMAIL");
  const address = required(env, "OUTREACH_MAILING_ADDRESS");
  const replyTo = required(env, "OUTREACH_REPLY_TO");
  const unsubscribeUrl = buildUnsubscribeUrl(input.to);
  const footer = `--\nFarjad · Verixa (getverixa.com)\n${address}\nDon't want these emails? Unsubscribe: ${unsubscribeUrl}`;
  const text = `${input.body}\n\n${footer}`;
  const html =
    `<div>${escapeHtml(input.body).replace(/\n/g, "<br>")}</div>` +
    `<p style="color:#6b7280;font-size:12px">--<br>Farjad · Verixa (getverixa.com)<br>${escapeHtml(address)}<br>` +
    `Don't want these emails? <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`;
  return {
    from, to: input.to, replyTo, subject: input.subject, text, html,
    headers: {
      "List-Unsubscribe": `<${buildOneClickUnsubscribeUrl(input.to)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

function client(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new OutreachConfigError("RESEND_API_KEY");
  return new Resend(key);
}

export async function sendOutreachEmail(msg: BuiltEmail, scheduledAt: Date | null): Promise<{ id: string }> {
  const { data, error } = await client().emails.send({
    from: msg.from, to: [msg.to], replyTo: msg.replyTo, subject: msg.subject,
    text: msg.text, html: msg.html, headers: msg.headers,
    ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
  });
  if (error || !data) throw new Error(`Resend send failed: ${error?.message ?? "no data"}`);
  return { id: data.id };
}

export async function cancelOutreachEmail(id: string): Promise<void> {
  const { error } = await client().emails.cancel(id);
  if (error) throw new Error(`Resend cancel failed: ${error.message}`);
}
```

The footer `<p>` is email HTML, not React. Inline styles are the only way to style
email bodies, so the no-inline-styles rule does not apply here.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/outreach/__tests__/email.test.ts`
Expected: PASS (2 tests). Also run `npx tsc --noEmit` to confirm the Resend 6 types
accept `replyTo`, `headers` and `scheduledAt`. If a name differs, check
`node_modules/resend/dist/index.d.ts` and use its name.

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/email.ts src/lib/outreach/__tests__/email.test.ts
git commit -m "feat(outreach): CASL-compliant email with one-click unsubscribe and scheduling"
```

---

### Task 11: Repository

**Files:**
- Create: `src/lib/outreach/repo.ts`

**Interfaces:**
- Consumes: Prisma models (Task 2); `SchedulableLead` (Task 6); `LeadSnapshot`,
  `Channel`, `Step`, `TERMINAL_STATES`; `isSuppressed` (Task 9); `OUTREACH`;
  `localParts` and `localTimeToUtc`.
- Produces:
  - `interface LeadRow extends SchedulableLead { consultantProfileId: string; externalHandle: string | null; profileClaimed: boolean; suppressed: boolean }`
  - `interface Candidate { consultantProfileId: string; timezone: string; status: string; email: string | null; companyPeerCount: number; profileViews30d: number }`
  - `interface ComposeContext { email: string | null; firstName: string; city: string | null; licenseNumber: string; profileViews30d: number; consultantProfileId: string; externalHandle: string | null }`
  - `interface TouchInput { leadId: string; channel: Channel; step: Step; cycle: 0 | 1; subject: string | null; body: string; status: "QUEUED" | "DRY_RUN"; dryRunDay?: string }`
  - `interface OutreachRepo` with:
    - `listLeads(channel?: Channel): Promise<LeadRow[]>`
    - `getLead(id: string): Promise<LeadRow | null>`
    - `findLeadByContact(q: { email?: string; handle?: string }): Promise<LeadRow | null>`
    - `saveLead(id: string, s: LeadSnapshot): Promise<void>`
    - `createLead(input: { consultantProfileId: string; snapshot: LeadSnapshot; score: number; externalHandle: string | null; matchConfidence: number | null }): Promise<boolean>`
    - `countLeadsCreatedToday(channel: Channel, now: Date): Promise<number>`
    - `countTouchesToday(channel: Channel, now: Date): Promise<number>`
    - `findDiscoveryCandidates(limit: number): Promise<Candidate[]>`
    - `getComposeContext(leadId: string): Promise<ComposeContext | null>`
    - `createTouch(t: TouchInput): Promise<{ id: string; created: boolean; status: string; body: string }>`
    - `updateTouch(id: string, patch: { status: string; externalMessageId?: string; error?: string; sentAt?: Date; scheduledFor?: Date }): Promise<void>`
    - `getTouch(id: string): Promise<{ id: string; leadId: string; step: Step; status: string } | null>`
    - `findTouchByExternalId(externalMessageId: string): Promise<{ id: string; leadId: string; step: Step } | null>`
    - `listFutureScheduledEmailTouches(now: Date): Promise<{ id: string; leadId: string; step: Step; externalMessageId: string }[]>`
    - `recordReply(r: { leadId: string; body: string; label: string; confidence: number }): Promise<void>`
    - `negativeStats(since: Date): Promise<{ touches: number; negatives: number }>`
  - `prismaRepo: OutreachRepo`

- [ ] **Step 1: Implement the interface and the Prisma version**

```ts
// src/lib/outreach/repo.ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localParts, localTimeToUtc } from "./calendar";
import { OUTREACH } from "./config";
import type { SchedulableLead } from "./scheduler";
import { isCiccActive } from "./scoring";
import { isSuppressed } from "./suppression";
import { TERMINAL_STATES, type Channel, type LeadSnapshot, type LeadState, type Step } from "./types";

export interface LeadRow extends SchedulableLead {
  consultantProfileId: string;
  externalHandle: string | null;
  profileClaimed: boolean;
  suppressed: boolean;
}
export interface Candidate { consultantProfileId: string; timezone: string; status: string; email: string | null; companyPeerCount: number; profileViews30d: number }
export interface ComposeContext { email: string | null; firstName: string; city: string | null; licenseNumber: string; profileViews30d: number; consultantProfileId: string; externalHandle: string | null }
export interface TouchInput { leadId: string; channel: Channel; step: Step; cycle: 0 | 1; subject: string | null; body: string; status: "QUEUED" | "DRY_RUN"; dryRunDay?: string }

export interface OutreachRepo {
  listLeads(channel?: Channel): Promise<LeadRow[]>;
  getLead(id: string): Promise<LeadRow | null>;
  findLeadByContact(q: { email?: string; handle?: string }): Promise<LeadRow | null>;
  saveLead(id: string, s: LeadSnapshot): Promise<void>;
  createLead(input: { consultantProfileId: string; snapshot: LeadSnapshot; score: number; externalHandle: string | null; matchConfidence: number | null }): Promise<boolean>;
  countLeadsCreatedToday(channel: Channel, now: Date): Promise<number>;
  countTouchesToday(channel: Channel, now: Date): Promise<number>;
  findDiscoveryCandidates(limit: number): Promise<Candidate[]>;
  getComposeContext(leadId: string): Promise<ComposeContext | null>;
  createTouch(t: TouchInput): Promise<{ id: string; created: boolean; status: string; body: string }>;
  updateTouch(id: string, patch: { status: string; externalMessageId?: string; error?: string; sentAt?: Date; scheduledFor?: Date }): Promise<void>;
  getTouch(id: string): Promise<{ id: string; leadId: string; step: Step; status: string } | null>;
  findTouchByExternalId(externalMessageId: string): Promise<{ id: string; leadId: string; step: Step } | null>;
  listFutureScheduledEmailTouches(now: Date): Promise<{ id: string; leadId: string; step: Step; externalMessageId: string }[]>;
  recordReply(r: { leadId: string; body: string; label: string; confidence: number }): Promise<void>;
  negativeStats(since: Date): Promise<{ touches: number; negatives: number }>;
}

const DAY_MS = 86_400_000;
const startOfOperatorDay = (now: Date) => localTimeToUtc(localParts(now, OUTREACH.operatorTimezone).ymd, 0, 0, OUTREACH.operatorTimezone);

type LeadWithProfile = Prisma.OutreachLeadGetPayload<{ include: { consultantProfile: { select: { userId: true; rawEmail: true } } } }>;

async function toRow(l: LeadWithProfile): Promise<LeadRow> {
  return {
    id: l.id, consultantProfileId: l.consultantProfileId, externalHandle: l.externalHandle, score: l.score,
    state: l.state as LeadState, channel: l.channel as Channel, touchCount: l.touchCount, nextActionAt: l.nextActionAt,
    backlogSince: l.backlogSince, recontactUsed: l.recontactUsed, timezone: l.timezone,
    profileClaimed: l.consultantProfile.userId !== null,
    suppressed: await isSuppressed({ id: l.consultantProfileId, rawEmail: l.consultantProfile.rawEmail }),
  };
}

const include = { consultantProfile: { select: { userId: true, rawEmail: true } } } as const;

export const prismaRepo: OutreachRepo = {
  async listLeads(channel) {
    const rows = await prisma.outreachLead.findMany({
      where: { state: { notIn: [...TERMINAL_STATES] }, ...(channel ? { channel } : {}) },
      include,
    });
    return Promise.all(rows.map(toRow));
  },

  async getLead(id) {
    const l = await prisma.outreachLead.findUnique({ where: { id }, include });
    return l ? toRow(l) : null;
  },

  async findLeadByContact({ email, handle }) {
    const l = await prisma.outreachLead.findFirst({
      where: email ? { consultantProfile: { rawEmail: { equals: email, mode: "insensitive" } } } : { externalHandle: { equals: handle ?? "", mode: "insensitive" } },
      include,
    });
    return l ? toRow(l) : null;
  },

  async saveLead(id, s) {
    await prisma.outreachLead.update({
      where: { id },
      data: { state: s.state, channel: s.channel, touchCount: s.touchCount, nextActionAt: s.nextActionAt, backlogSince: s.backlogSince, recontactUsed: s.recontactUsed, timezone: s.timezone },
    });
  },

  async createLead({ consultantProfileId, snapshot, score, externalHandle, matchConfidence }) {
    try {
      await prisma.outreachLead.create({
        data: { consultantProfileId, score, externalHandle, matchConfidence, state: snapshot.state, channel: snapshot.channel, touchCount: 0, backlogSince: snapshot.backlogSince, timezone: snapshot.timezone },
      });
      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false; // already a lead
      throw e;
    }
  },

  async countLeadsCreatedToday(channel, now) {
    return prisma.outreachLead.count({ where: { channel, createdAt: { gte: startOfOperatorDay(now) } } });
  },

  async countTouchesToday(channel, now) {
    return prisma.outreachTouch.count({
      where: { channel, status: { in: ["QUEUED", "SCHEDULED", "SENT"] }, createdAt: { gte: startOfOperatorDay(now) } },
    });
  },

  async findDiscoveryCandidates(limit) {
    // Random sample of eligible, unclaimed, never-contacted profiles with an email.
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM "ConsultantProfile" p
      LEFT JOIN "OutreachLead" l ON l."consultantProfileId" = p.id
      LEFT JOIN "OutreachSuppression" s ON s."consultantProfileId" = p.id
      WHERE p."userId" IS NULL AND p."rawEmail" IS NOT NULL AND p."rawEmail" <> ''
        AND lower(p.status) IN ('yes', 'active')
        AND l.id IS NULL AND s.id IS NULL
        AND NOT EXISTS (SELECT 1 FROM "EmailUnsubscribe" u WHERE u.email = lower(p."rawEmail"))
      ORDER BY random() LIMIT ${limit}`;
    if (ids.length === 0) return [];
    const profiles = await prisma.consultantProfile.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      select: { id: true, timezone: true, status: true, rawEmail: true, company: true },
    });
    const companies = profiles.map((p) => p.company).filter((c): c is string => !!c);
    const peers = companies.length
      ? await prisma.consultantProfile.groupBy({ by: ["company"], where: { company: { in: companies } }, _count: { _all: true } })
      : [];
    const peerMap = new Map(peers.map((g) => [g.company, g._count._all]));
    const views = await prisma.analyticsEvent.groupBy({
      by: ["consultantId"],
      where: { eventName: "page_view", consultantId: { in: profiles.map((p) => p.id) }, createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) } },
      _count: { _all: true },
    });
    const viewMap = new Map(views.map((v) => [v.consultantId, v._count._all]));
    return profiles
      .filter((p) => isCiccActive(p.status))
      .map((p) => ({
        consultantProfileId: p.id, timezone: p.timezone, status: p.status, email: p.rawEmail,
        companyPeerCount: p.company ? peerMap.get(p.company) ?? 1 : 0,
        profileViews30d: viewMap.get(p.id) ?? 0,
      }));
  },

  async getComposeContext(leadId) {
    const l = await prisma.outreachLead.findUnique({
      where: { id: leadId },
      include: { consultantProfile: { select: { id: true, fullName: true, city: true, licenseNumber: true, rawEmail: true } } },
    });
    if (!l) return null;
    const views = await prisma.analyticsEvent.count({
      where: { eventName: "page_view", consultantId: l.consultantProfileId, createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) } },
    });
    const p = l.consultantProfile;
    return {
      consultantProfileId: p.id, email: p.rawEmail, city: p.city, licenseNumber: p.licenseNumber,
      firstName: p.fullName.trim().split(/\s+/)[0] ?? p.fullName, profileViews30d: views, externalHandle: l.externalHandle,
    };
  },

  async createTouch(t) {
    const idempotencyKey = `${t.leadId}:${t.step}:${t.cycle}${t.status === "DRY_RUN" ? `:dry:${t.dryRunDay}` : ""}`;
    const existing = await prisma.outreachTouch.findUnique({ where: { idempotencyKey } });
    if (existing) return { id: existing.id, created: false, status: existing.status, body: existing.body };
    try {
      const row = await prisma.outreachTouch.create({
        data: { leadId: t.leadId, channel: t.channel, step: t.step, subject: t.subject, body: t.body, status: t.status, idempotencyKey },
      });
      return { id: row.id, created: true, status: row.status, body: row.body };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const row = await prisma.outreachTouch.findUniqueOrThrow({ where: { idempotencyKey } });
        return { id: row.id, created: false, status: row.status, body: row.body };
      }
      throw e;
    }
  },

  async updateTouch(id, patch) {
    await prisma.outreachTouch.update({ where: { id }, data: patch });
  },

  async getTouch(id) {
    const t = await prisma.outreachTouch.findUnique({ where: { id }, select: { id: true, leadId: true, step: true, status: true } });
    return t ? { ...t, step: t.step as Step } : null;
  },

  async findTouchByExternalId(externalMessageId) {
    const t = await prisma.outreachTouch.findFirst({ where: { externalMessageId }, select: { id: true, leadId: true, step: true } });
    return t ? { ...t, step: t.step as Step } : null;
  },

  async listFutureScheduledEmailTouches(now) {
    const rows = await prisma.outreachTouch.findMany({
      where: { channel: "EMAIL", status: "SCHEDULED", scheduledFor: { gt: now }, externalMessageId: { not: null } },
      select: { id: true, leadId: true, step: true, externalMessageId: true },
    });
    return rows.map((r) => ({ id: r.id, leadId: r.leadId, step: r.step as Step, externalMessageId: r.externalMessageId! }));
  },

  async recordReply(r) {
    await prisma.outreachReply.create({ data: r });
  },

  async negativeStats(since) {
    const [touches, negatives, optOuts] = await Promise.all([
      prisma.outreachTouch.count({ where: { status: { in: ["SENT", "SCHEDULED"] }, createdAt: { gte: since } } }),
      prisma.outreachReply.count({ where: { label: "negative", receivedAt: { gte: since } } }),
      prisma.outreachSuppression.count({ where: { reason: { in: ["unsubscribe", "complained"] }, createdAt: { gte: since } } }),
    ]);
    return { touches, negatives: negatives + optOuts };
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `src/lib/outreach/repo.ts`. If `AnalyticsEvent` has no
`createdAt`, run `grep -n "createdAt\|timestamp" prisma/schema.prisma` inside
`model AnalyticsEvent` and use its timestamp field in both view queries.

- [ ] **Step 3: Commit**

```bash
git add src/lib/outreach/repo.ts
git commit -m "feat(outreach): repository interface and Prisma implementation"
```

---

### Task 12: Engine — maintenance, discovery and email day planning

**Files:**
- Create: `src/lib/outreach/engine.ts`
- Test: `src/lib/outreach/__tests__/engine.test.ts` (with an in-memory repo)

**Interfaces:**
- Consumes: all of the above.
- Produces:
  - `interface EngineDeps { now: () => Date; random: () => number; llm: Llm; repo: OutreachRepo; settings: () => Promise<OutreachSettings>; getOffer: () => Promise<FoundingOffer | null>; email: { build: (i: { to: string; subject: string; body: string }) => BuiltEmail; send: (m: BuiltEmail, at: Date | null) => Promise<{ id: string }>; cancel: (id: string) => Promise<void> }; suppress: (profileId: string, reason: string, contact?: { email?: string | null; linkedinUrl?: string | null; xHandle?: string | null }) => Promise<void>; appUrl: string }`
  - `runMaintenance(deps: EngineDeps, channel: Channel): Promise<number>`, returning
    the number of transitions applied
  - `discoverEmailLeads(deps: EngineDeps): Promise<number>`, returning leads created
  - `planEmailDay(deps: EngineDeps): Promise<{ status: "disabled" | "rest_day" | "ok"; scheduled: number; dryRun: number; failed: number }>`
  - `cancelScheduledEmails(deps: EngineDeps): Promise<number>`
  - `composeWithRetry(deps: EngineDeps, lead: LeadRow, step: Step, offer: FoundingOffer | null): Promise<{ subject: string | null; body: string; email: string | null } | null>`
  - `profileUrls(appUrl: string, licenseNumber: string, channel: Channel): { profileUrl: string; claimUrl: string }`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/outreach/__tests__/engine.test.ts
import { describe, expect, it, vi } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { cancelScheduledEmails, planEmailDay, type EngineDeps } from "../engine";
import type { LeadRow, OutreachRepo } from "../repo";
import type { LeadSnapshot } from "../types";

const TOR = "America/Toronto";
const NOW = new Date("2026-11-05T11:00:00Z"); // Thu 06:00 Toronto — daily cron time

function memoryRepo(leads: LeadRow[]) {
  const touches: { id: string; leadId: string; step: number; status: string; externalMessageId?: string; scheduledFor?: Date; key: string; body: string }[] = [];
  const repo: OutreachRepo = {
    listLeads: async (c) => leads.filter((l) => !c || l.channel === c),
    getLead: async (id) => leads.find((l) => l.id === id) ?? null,
    findLeadByContact: async () => null,
    saveLead: async (id, s: LeadSnapshot) => { Object.assign(leads.find((l) => l.id === id)!, s); },
    createLead: async () => false,
    countLeadsCreatedToday: async () => 8,
    countTouchesToday: async () => 0,
    findDiscoveryCandidates: async () => [],
    getComposeContext: async (leadId) => ({ consultantProfileId: leadId, email: `${leadId}@firm.ca`, firstName: "Sam", city: null, licenseNumber: `R${leadId}`, profileViews30d: 0, externalHandle: null }),
    createTouch: async (t) => {
      const key = `${t.leadId}:${t.step}:${t.cycle}:${t.status}`;
      const ex = touches.find((x) => x.key === key);
      if (ex) return { id: ex.id, created: false, status: ex.status, body: ex.body };
      const row = { id: `t${touches.length}`, leadId: t.leadId, step: t.step, status: t.status, key, body: t.body };
      touches.push(row);
      return { id: row.id, created: true, status: row.status, body: row.body };
    },
    updateTouch: async (id, p) => { Object.assign(touches.find((t) => t.id === id)!, p); },
    getTouch: async () => null,
    findTouchByExternalId: async () => null,
    listFutureScheduledEmailTouches: async (now) => touches.filter((t) => t.status === "SCHEDULED" && t.scheduledFor! > now).map((t) => ({ id: t.id, leadId: t.leadId, step: t.step as 1, externalMessageId: t.externalMessageId! })),
    recordReply: async () => {},
    negativeStats: async () => ({ touches: 0, negatives: 0 }),
  };
  return { repo, touches };
}

const backlog = (id: string, score: number): LeadRow => ({
  id, consultantProfileId: id, externalHandle: null, profileClaimed: false, suppressed: false, score,
  state: "BACKLOG", channel: "EMAIL", touchCount: 0, nextActionAt: null, backlogSince: new Date("2026-11-04T12:00:00Z"), recontactUsed: false, timezone: TOR,
});

function deps(repo: OutreachRepo, over: Partial<EngineDeps> = {}): EngineDeps {
  const llm: Llm = { json: async () => ({ subject: "Your Verixa listing", body: "Hi Sam, your listing is live." }) as never };
  let n = 0;
  return {
    now: () => NOW, random: () => 0.5, llm, repo, appUrl: "https://getverixa.com",
    settings: async () => ({ enabled: true, dryRun: false, channels: { EMAIL: true, LINKEDIN: false, X: false } }),
    getOffer: async () => null,
    email: { build: (i) => ({ from: "f", to: i.to, replyTo: "r", subject: i.subject, text: i.body, html: i.body, headers: {} }), send: vi.fn(async () => ({ id: `re_${n++}` })), cancel: vi.fn(async () => {}) },
    suppress: vi.fn(async () => {}),
    ...over,
  };
}

describe("planEmailDay", () => {
  it("schedules the top 5 inside 08:00–13:00 local with 5–13 minute gaps and advances state", async () => {
    const leads = Array.from({ length: 7 }, (_, i) => backlog(`L${i}`, 13 + i));
    const { repo, touches } = memoryRepo(leads);
    const d = deps(repo);
    const res = await planEmailDay(d);
    expect(res).toEqual({ status: "ok", scheduled: 5, dryRun: 0, failed: 0 });
    const times = (d.email.send as ReturnType<typeof vi.fn>).mock.calls.map((c) => (c[1] as Date).getTime());
    expect(new Date(times[0]).toISOString()).toBe("2026-11-05T13:07:00.000Z"); // 08:00 + round(0.5*13) min
    for (let i = 1; i < times.length; i++) expect((times[i] - times[i - 1]) / 60000).toBe(9); // 5 + 0.5*8
    expect(leads.filter((l) => l.state === "TOUCH_1").map((l) => l.id).sort()).toEqual(["L2", "L3", "L4", "L5", "L6"]);
    expect(touches.every((t) => t.status === "SCHEDULED")).toBe(true);
  });

  it("dry-run records touches but sends nothing and keeps state", async () => {
    const leads = [backlog("A", 20)];
    const { repo, touches } = memoryRepo(leads);
    const d = deps(repo, { settings: async () => ({ enabled: true, dryRun: true, channels: { EMAIL: true, LINKEDIN: false, X: false } }) });
    expect(await planEmailDay(d)).toEqual({ status: "ok", scheduled: 0, dryRun: 1, failed: 0 });
    expect(d.email.send).not.toHaveBeenCalled();
    expect(leads[0].state).toBe("BACKLOG");
    expect(touches[0].status).toBe("DRY_RUN");
  });

  it("does nothing when disabled or on a rest day", async () => {
    const { repo } = memoryRepo([backlog("A", 20)]);
    expect((await planEmailDay(deps(repo, { settings: async () => ({ enabled: false, dryRun: false, channels: { EMAIL: true, LINKEDIN: false, X: false } }) }))).status).toBe("disabled");
    expect((await planEmailDay(deps(repo, { now: () => new Date("2026-11-06T11:00:00Z") }))).status).toBe("rest_day");
  });

  it("moves claimed leads to CLAIMED instead of emailing them", async () => {
    const lead = { ...backlog("A", 20), profileClaimed: true };
    const { repo } = memoryRepo([lead]);
    const d = deps(repo);
    await planEmailDay(d);
    expect(lead.state).toBe("CLAIMED");
    expect(d.email.send).not.toHaveBeenCalled();
  });
});

describe("cancelScheduledEmails", () => {
  it("cancels future sends and reverts the lead", async () => {
    const leads = [backlog("A", 20)];
    const { repo } = memoryRepo(leads);
    const d = deps(repo);
    await planEmailDay(d);
    expect(leads[0].state).toBe("TOUCH_1");
    expect(await cancelScheduledEmails(d)).toBe(1);
    expect(d.email.cancel).toHaveBeenCalledWith("re_0");
    expect(leads[0].state).toBe("BACKLOG");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/engine.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/outreach/engine.ts
import type { Llm } from "@/lib/content-pipeline/types";
import { isActiveDay, localParts, localTimeToUtc } from "./calendar";
import { ComposeRejectedError, composeMessage } from "./composer";
import { OUTREACH } from "./config";
import type { BuiltEmail } from "./email";
import type { FoundingOffer } from "./offer";
import type { LeadRow, OutreachRepo } from "./repo";
import { planTasks, type Task } from "./scheduler";
import { scoreLead } from "./scoring";
import type { OutreachSettings } from "./settings";
import { InvalidTransitionError, newBacklogLead, transition } from "./state";
import type { Channel, LeadEvent, Step } from "./types";

export interface EngineDeps {
  now: () => Date;
  random: () => number;
  llm: Llm;
  repo: OutreachRepo;
  settings: () => Promise<OutreachSettings>;
  getOffer: () => Promise<FoundingOffer | null>;
  email: {
    build: (i: { to: string; subject: string; body: string }) => BuiltEmail;
    send: (m: BuiltEmail, at: Date | null) => Promise<{ id: string }>;
    cancel: (id: string) => Promise<void>;
  };
  suppress: (profileId: string, reason: string, contact?: { email?: string | null; linkedinUrl?: string | null; xHandle?: string | null }) => Promise<void>;
  appUrl: string;
}

export function profileUrls(appUrl: string, licenseNumber: string, channel: Channel) {
  const utm = `utm_source=outreach&utm_medium=${channel.toLowerCase()}&utm_campaign=claim`;
  const lic = encodeURIComponent(licenseNumber);
  return { profileUrl: `${appUrl}/consultant/${lic}?${utm}`, claimUrl: `${appUrl}/claim/${lic}?${utm}` };
}

async function apply(deps: EngineDeps, lead: LeadRow, event: LeadEvent): Promise<boolean> {
  try {
    const next = transition(lead, event, deps.now());
    await deps.repo.saveLead(lead.id, next);
    Object.assign(lead, next);
    return true;
  } catch (e) {
    if (e instanceof InvalidTransitionError) {
      console.warn(`[outreach] ${e.message} (lead ${lead.id})`);
      return false;
    }
    throw e;
  }
}

const MAINTENANCE_EVENT: Partial<Record<Task["kind"], LeadEvent>> = {
  ARCHIVE: { type: "BACKLOG_EXPIRED" },
  RECONTACT: { type: "COOLDOWN_ENDED" },
  EXPIRE_INVITE: { type: "INVITE_EXPIRED" },
  CLOSE: { type: "NO_REPLY_TIMEOUT" },
};

/** Claims and suppressions first, then time-based maintenance. Runs on every day, rest days included. */
export async function runMaintenance(deps: EngineDeps, channel: Channel): Promise<number> {
  const leads = await deps.repo.listLeads(channel);
  let applied = 0;
  for (const l of leads) {
    if (l.profileClaimed) applied += Number(await apply(deps, l, { type: "CLAIMED" }));
    else if (l.suppressed) applied += Number(await apply(deps, l, { type: "SUPPRESSED" }));
  }
  const live = leads.filter((l) => !l.profileClaimed && !l.suppressed);
  const offer = await deps.getOffer();
  const tasks = planTasks({ channel, leads: live, now: deps.now(), sentToday: OUTREACH.touchesPerChannelPerDay, offerAvailable: offer !== null });
  for (const t of tasks) {
    const event = MAINTENANCE_EVENT[t.kind];
    const lead = live.find((l) => l.id === t.leadId);
    if (event && lead) applied += Number(await apply(deps, lead, event));
  }
  return applied;
}

export async function discoverEmailLeads(deps: EngineDeps): Promise<number> {
  const now = deps.now();
  const remaining = OUTREACH.newLeadsPerChannelPerDay - (await deps.repo.countLeadsCreatedToday("EMAIL", now));
  if (remaining <= 0) return 0;
  const candidates = await deps.repo.findDiscoveryCandidates(OUTREACH.discoverySampleSize);
  const scored = candidates
    .map((c) => ({
      c,
      score: scoreLead({
        ciccActive: true, postedAboutMarketing: false, activeLast21Days: false, socialProfileComplete: false,
        soloOrSmallFirm: c.companyPeerCount <= 3, hadProfileViews30d: c.profileViews30d > 0,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, remaining);
  let created = 0;
  for (const { c, score } of scored) {
    const ok = await deps.repo.createLead({
      consultantProfileId: c.consultantProfileId, score, externalHandle: null, matchConfidence: null,
      snapshot: newBacklogLead("EMAIL", c.timezone, now),
    });
    created += Number(ok);
  }
  return created;
}

export async function composeWithRetry(deps: EngineDeps, lead: LeadRow, step: Step, offer: FoundingOffer | null) {
  const ctx = await deps.repo.getComposeContext(lead.id);
  if (!ctx) return null;
  const { profileUrl, claimUrl } = profileUrls(deps.appUrl, ctx.licenseNumber, lead.channel);
  const input = { channel: lead.channel, step, firstName: ctx.firstName, city: ctx.city, profileUrl, claimUrl, profileViews30d: ctx.profileViews30d, offer };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const m = await composeMessage(deps.llm, input);
      return { ...m, email: ctx.email };
    } catch (e) {
      if (!(e instanceof ComposeRejectedError) || attempt === 1) {
        console.warn(`[outreach] compose failed for lead ${lead.id}: ${(e as Error).message}`);
        return null;
      }
    }
  }
  return null;
}

/** Hands out send slots per timezone: 08:00 local + random 0–13 min, then +5–13 min each. */
function slotAllocator(deps: EngineDeps) {
  const last = new Map<string, Date>();
  const { min, max } = OUTREACH.gapMinutes;
  return (tz: string): Date | null => {
    const now = deps.now();
    const ymd = localParts(now, tz).ymd;
    const prev = last.get(tz);
    const open = localTimeToUtc(ymd, OUTREACH.sendWindow.startHour, 0, tz);
    const close = localTimeToUtc(ymd, OUTREACH.sendWindow.endHour, 0, tz);
    let next = prev
      ? new Date(prev.getTime() + Math.round(min + deps.random() * (max - min)) * 60_000)
      : new Date(open.getTime() + Math.round(deps.random() * max) * 60_000);
    if (next.getTime() < now.getTime() + min * 60_000) next = new Date(now.getTime() + min * 60_000);
    if (next >= close) return null;
    last.set(tz, next);
    return next;
  };
}

export async function planEmailDay(deps: EngineDeps) {
  const result = { status: "ok" as "disabled" | "rest_day" | "ok", scheduled: 0, dryRun: 0, failed: 0 };
  const settings = await deps.settings();
  if (!settings.enabled || !settings.channels.EMAIL) return { ...result, status: "disabled" as const };

  await runMaintenance(deps, "EMAIL");
  const now = deps.now();
  if (!isActiveDay(now, OUTREACH.operatorTimezone)) return { ...result, status: "rest_day" as const };

  await discoverEmailLeads(deps);
  const leads = (await deps.repo.listLeads("EMAIL")).filter((l) => !l.profileClaimed && !l.suppressed);
  const offer = await deps.getOffer();
  const sentToday = await deps.repo.countTouchesToday("EMAIL", now);
  const tasks = planTasks({ channel: "EMAIL", leads, now, sentToday, offerAvailable: offer !== null, activeDayOnly: true });
  const nextSlot = slotAllocator(deps);
  const today = localParts(now, OUTREACH.operatorTimezone).ymd;

  for (const task of tasks) {
    if (task.kind !== "TOUCH") continue;
    const lead = leads.find((l) => l.id === task.leadId)!;
    const msg = await composeWithRetry(deps, lead, task.step, offer);
    if (!msg?.email || !msg.subject) { result.failed++; continue; }
    const cycle = lead.recontactUsed ? 1 : 0;

    if (settings.dryRun) {
      await deps.repo.createTouch({ leadId: lead.id, channel: "EMAIL", step: task.step, cycle, subject: msg.subject, body: msg.body, status: "DRY_RUN", dryRunDay: today });
      result.dryRun++;
      continue;
    }

    const at = nextSlot(lead.timezone);
    if (!at) continue; // window already full for this timezone today
    const touch = await deps.repo.createTouch({ leadId: lead.id, channel: "EMAIL", step: task.step, cycle, subject: msg.subject, body: msg.body, status: "QUEUED" });
    if (!touch.created) continue; // already handled; never send twice
    try {
      const built = deps.email.build({ to: msg.email, subject: msg.subject, body: msg.body });
      const { id } = await deps.email.send(built, at);
      await deps.repo.updateTouch(touch.id, { status: "SCHEDULED", externalMessageId: id, scheduledFor: at });
      await apply(deps, lead, { type: "TOUCH_SENT", step: task.step });
      result.scheduled++;
    } catch (e) {
      await deps.repo.updateTouch(touch.id, { status: "FAILED", error: (e as Error).message.slice(0, 500) });
      result.failed++;
    }
  }
  return result;
}

/** Kill switch: pull back every email that hasn't left Resend yet. */
export async function cancelScheduledEmails(deps: EngineDeps): Promise<number> {
  const pending = await deps.repo.listFutureScheduledEmailTouches(deps.now());
  let cancelled = 0;
  for (const t of pending) {
    try {
      await deps.email.cancel(t.externalMessageId);
      await deps.repo.updateTouch(t.id, { status: "CANCELLED" });
      const lead = await deps.repo.getLead(t.leadId);
      if (lead) await apply(deps, lead, { type: "TOUCH_CANCELLED", step: t.step });
      cancelled++;
    } catch (e) {
      console.error(`[outreach] cancel failed for touch ${t.id}: ${(e as Error).message}`);
    }
  }
  return cancelled;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/outreach/__tests__/engine.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/engine.ts src/lib/outreach/__tests__/engine.test.ts
git commit -m "feat(outreach): engine for maintenance, discovery, scheduled email day and cancel"
```

---

### Task 13: Engine — social tasks and worker reports

**Files:**
- Modify: `src/lib/outreach/engine.ts` (append)
- Test: `src/lib/outreach/__tests__/engine-social.test.ts`

**Interfaces:**
- Consumes: `EngineDeps`, `apply`, `composeWithRetry`, `classifyReply` (Task 8),
  `scoreLead`, `ScoreSignals`.
- Produces:
  - `interface WorkerTask { touchId: string; leadId: string; kind: "INVITE" | "TOUCH"; step: Step; handle: string; body: string; dryRun: boolean }`
  - `buildSocialTasks(deps: EngineDeps, channel: "LINKEDIN" | "X"): Promise<WorkerTask[]>`
  - `type WorkerReport` (zod-inferred, schema `workerReportSchema`) with these variants:
    - `TOUCH_RESULT`
    - `INVITE_ACCEPTED`
    - `REPLY`
    - `LEAD_MATCHED`
    - `DMS_CLOSED`
    - `CHANNEL_HALT` (reason `CHECKPOINT` or `ADAPTER_BROKEN`)
  - `applyReport(deps: EngineDeps, r: WorkerReport, hooks: { haltChannel: (c: Channel, reason: string, detail: string) => Promise<void> }): Promise<{ ok: boolean; detail?: string }>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/outreach/__tests__/engine-social.test.ts
import { describe, expect, it, vi } from "vitest";
import type { Llm } from "@/lib/content-pipeline/types";
import { applyReport, buildSocialTasks, type EngineDeps } from "../engine";
import type { LeadRow, OutreachRepo } from "../repo";

const TOR = "America/Toronto";
const NOW = new Date("2026-11-05T15:00:00Z"); // Thu 10:00

function setup(leads: LeadRow[], llmOut: unknown) {
  const touches = new Map<string, { id: string; leadId: string; step: number; status: string; body: string }>();
  const replies: unknown[] = [];
  const created: unknown[] = [];
  const repo = {
    listLeads: async (c?: string) => leads.filter((l) => !c || l.channel === c),
    getLead: async (id: string) => leads.find((l) => l.id === id) ?? null,
    findLeadByContact: async ({ handle }: { handle?: string }) => leads.find((l) => l.externalHandle === handle) ?? null,
    saveLead: async (id: string, s: object) => { Object.assign(leads.find((l) => l.id === id)!, s); },
    createLead: async (i: unknown) => { created.push(i); return true; },
    countLeadsCreatedToday: async () => 0,
    countTouchesToday: async () => 0,
    getComposeContext: async (id: string) => ({ consultantProfileId: id, email: null, firstName: "Ana", city: null, licenseNumber: "R1", profileViews30d: 0, externalHandle: "ana_rcic" }),
    createTouch: async (t: { leadId: string; step: number; status: string; body: string }) => {
      const key = `${t.leadId}:${t.step}`;
      const ex = touches.get(key);
      if (ex) return { id: ex.id, created: false, status: ex.status, body: ex.body };
      const row = { id: `t-${key}`, leadId: t.leadId, step: t.step, status: t.status, body: t.body };
      touches.set(key, row);
      return { id: row.id, created: true, status: row.status, body: row.body };
    },
    updateTouch: async (id: string, p: object) => { for (const t of touches.values()) if (t.id === id) Object.assign(t, p); },
    getTouch: async (id: string) => { for (const t of touches.values()) if (t.id === id) return { id: t.id, leadId: t.leadId, step: t.step as 1, status: t.status }; return null; },
    recordReply: async (r: unknown) => { replies.push(r); },
  } as unknown as OutreachRepo;
  const llm: Llm = { json: async () => llmOut as never };
  const deps: EngineDeps = {
    now: () => NOW, random: () => 0.5, llm, repo, appUrl: "https://getverixa.com",
    settings: async () => ({ enabled: true, dryRun: false, channels: { LINKEDIN: true, X: true, EMAIL: false } }),
    getOffer: async () => null,
    email: { build: vi.fn(), send: vi.fn(), cancel: vi.fn() },
    suppress: vi.fn(async () => {}),
  };
  return { deps, touches, replies, created };
}

const xLead = (): LeadRow => ({
  id: "X1", consultantProfileId: "P1", externalHandle: "ana_rcic", profileClaimed: false, suppressed: false, score: 21,
  state: "BACKLOG", channel: "X", touchCount: 0, nextActionAt: null, backlogSince: NOW, recontactUsed: false, timezone: TOR,
});

describe("buildSocialTasks + applyReport", () => {
  it("hands out a queued touch once, and SENT advances the lead", async () => {
    const lead = xLead();
    const { deps } = setup([lead], { subject: null, body: "Hi Ana, your listing is live." });
    const [task] = await buildSocialTasks(deps, "X");
    expect(task).toMatchObject({ leadId: "X1", kind: "TOUCH", step: 1, handle: "ana_rcic", dryRun: false });
    expect(task.body).toContain("Not relevant?");
    expect(await buildSocialTasks(deps, "X")).toEqual([task]); // same queued touch, not a new one
    await applyReport(deps, { type: "TOUCH_RESULT", touchId: task.touchId, status: "SENT", externalMessageId: "dm1" }, { haltChannel: vi.fn() });
    expect(lead.state).toBe("TOUCH_1");
  });

  it("negative reply suppresses everywhere", async () => {
    const lead = { ...xLead(), state: "TOUCH_1" as const, touchCount: 1 };
    const { deps, replies } = setup([lead], { label: "negative", confidence: 0.95 });
    await applyReport(deps, { type: "REPLY", channel: "X", handle: "ana_rcic", body: "not for me, thanks" }, { haltChannel: vi.fn() });
    expect(lead.state).toBe("OPTED_OUT");
    expect(deps.suppress).toHaveBeenCalledWith("P1", "negative_reply", { xHandle: "ana_rcic" });
    expect(replies).toHaveLength(1);
  });

  it("drops matches below 0.8 confidence and scores the rest", async () => {
    const { deps, created } = setup([], {});
    const signals = { postedAboutMarketing: true, soloOrSmallFirm: true, activeLast21Days: true, socialProfileComplete: true, hadProfileViews30d: false };
    await applyReport(deps, { type: "LEAD_MATCHED", consultantProfileId: "P9", channel: "LINKEDIN", handle: "in/x", matchConfidence: 0.6, timezone: TOR, signals }, { haltChannel: vi.fn() });
    expect(created).toHaveLength(0);
    await applyReport(deps, { type: "LEAD_MATCHED", consultantProfileId: "P9", channel: "LINKEDIN", handle: "in/x", matchConfidence: 0.9, timezone: TOR, signals }, { haltChannel: vi.fn() });
    expect(created[0]).toMatchObject({ consultantProfileId: "P9", score: 30, externalHandle: "in/x" });
  });

  it("halts a channel on checkpoint", async () => {
    const { deps } = setup([], {});
    const haltChannel = vi.fn(async () => {});
    await applyReport(deps, { type: "CHANNEL_HALT", channel: "LINKEDIN", reason: "CHECKPOINT", detail: "verify page" }, { haltChannel });
    expect(haltChannel).toHaveBeenCalledWith("LINKEDIN", "CHECKPOINT", "verify page");
  });

  it("returns no tasks when the channel is disabled", async () => {
    const { deps } = setup([xLead()], {});
    deps.settings = async () => ({ enabled: true, dryRun: false, channels: { LINKEDIN: true, X: false, EMAIL: false } });
    expect(await buildSocialTasks(deps, "X")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/engine-social.test.ts`
Expected: FAIL, "buildSocialTasks is not exported".

- [ ] **Step 3: Implement (append to `engine.ts`)**

Add these imports at the top of `engine.ts`:

```ts
import { z } from "zod";
import { classifyReply } from "./classifier";
import { CHANNELS } from "./types";
```

Then append:

```ts
export interface WorkerTask {
  touchId: string;
  leadId: string;
  kind: "INVITE" | "TOUCH";
  step: Step;
  handle: string;
  body: string;
  dryRun: boolean;
}

export async function buildSocialTasks(deps: EngineDeps, channel: "LINKEDIN" | "X"): Promise<WorkerTask[]> {
  const settings = await deps.settings();
  if (!settings.enabled || !settings.channels[channel]) return [];
  await runMaintenance(deps, channel);
  const now = deps.now();
  const leads = (await deps.repo.listLeads(channel)).filter((l) => !l.profileClaimed && !l.suppressed && l.externalHandle);
  const offer = await deps.getOffer();
  const sentToday = await deps.repo.countTouchesToday(channel, now);
  const tasks = planTasks({ channel, leads, now, sentToday, offerAvailable: offer !== null });
  const today = localParts(now, OUTREACH.operatorTimezone).ymd;
  const out: WorkerTask[] = [];

  for (const t of tasks) {
    if (t.kind !== "TOUCH" && t.kind !== "INVITE") continue;
    const lead = leads.find((l) => l.id === t.leadId)!;
    const msg = await composeWithRetry(deps, lead, t.step, offer);
    if (!msg) continue;
    const touch = await deps.repo.createTouch({
      leadId: lead.id, channel, step: t.step, cycle: lead.recontactUsed ? 1 : 0, subject: null, body: msg.body,
      status: settings.dryRun ? "DRY_RUN" : "QUEUED", dryRunDay: today,
    });
    if (touch.status !== "QUEUED" && touch.status !== "DRY_RUN") continue; // already sent or failed
    out.push({ touchId: touch.id, leadId: lead.id, kind: t.kind, step: t.step, handle: lead.externalHandle!, body: touch.body, dryRun: settings.dryRun });
  }
  return out;
}

const channelEnum = z.enum(CHANNELS);
const signalsSchema = z.object({
  postedAboutMarketing: z.boolean(), soloOrSmallFirm: z.boolean(), activeLast21Days: z.boolean(),
  socialProfileComplete: z.boolean(), hadProfileViews30d: z.boolean(),
});

export const workerReportSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TOUCH_RESULT"), touchId: z.string(), status: z.enum(["SENT", "FAILED"]), externalMessageId: z.string().optional(), error: z.string().max(500).optional() }),
  z.object({ type: z.literal("INVITE_ACCEPTED"), leadId: z.string() }),
  z.object({ type: z.literal("REPLY"), channel: channelEnum, handle: z.string().optional(), email: z.string().email().optional(), body: z.string().max(8000) }),
  z.object({ type: z.literal("LEAD_MATCHED"), consultantProfileId: z.string(), channel: z.enum(["LINKEDIN", "X"]), handle: z.string().min(1), matchConfidence: z.number().min(0).max(1), timezone: z.string(), signals: signalsSchema }),
  z.object({ type: z.literal("DMS_CLOSED"), leadId: z.string() }),
  z.object({ type: z.literal("CHANNEL_HALT"), channel: z.enum(["LINKEDIN", "X", "EMAIL"]), reason: z.enum(["CHECKPOINT", "ADAPTER_BROKEN"]), detail: z.string().max(1000) }),
]);
export type WorkerReport = z.infer<typeof workerReportSchema>;

export async function applyReport(
  deps: EngineDeps,
  r: WorkerReport,
  hooks: { haltChannel: (c: Channel, reason: string, detail: string) => Promise<void> },
): Promise<{ ok: boolean; detail?: string }> {
  switch (r.type) {
    case "TOUCH_RESULT": {
      const touch = await deps.repo.getTouch(r.touchId);
      if (!touch) return { ok: false, detail: "unknown touch" };
      if (touch.status === "SENT") return { ok: true, detail: "already recorded" };
      if (touch.status === "DRY_RUN") return { ok: true, detail: "dry run" };
      if (r.status === "FAILED") {
        await deps.repo.updateTouch(touch.id, { status: "FAILED", error: r.error });
        return { ok: true };
      }
      await deps.repo.updateTouch(touch.id, { status: "SENT", externalMessageId: r.externalMessageId, sentAt: deps.now() });
      const lead = await deps.repo.getLead(touch.leadId);
      if (!lead) return { ok: false, detail: "unknown lead" };
      const event: LeadEvent = lead.channel === "LINKEDIN" && touch.step === 1 ? { type: "INVITE_SENT" } : { type: "TOUCH_SENT", step: touch.step };
      return { ok: await apply(deps, lead, event) };
    }

    case "INVITE_ACCEPTED": {
      const lead = await deps.repo.getLead(r.leadId);
      return { ok: lead ? await apply(deps, lead, { type: "INVITE_ACCEPTED" }) : false };
    }

    case "REPLY": {
      const lead = await deps.repo.findLeadByContact(r.email ? { email: r.email } : { handle: r.handle });
      if (!lead) return { ok: false, detail: "no lead for contact" };
      const { label, confidence } = await classifyReply(deps.llm, r.body);
      await deps.repo.recordReply({ leadId: lead.id, body: r.body, label, confidence });
      if (label === "negative") {
        await deps.suppress(lead.consultantProfileId, "negative_reply", r.email ? { email: r.email } : r.channel === "X" ? { xHandle: r.handle } : { linkedinUrl: r.handle });
      }
      return { ok: await apply(deps, lead, { type: "REPLY", label }) };
    }

    case "LEAD_MATCHED": {
      if (r.matchConfidence < OUTREACH.minMatchConfidence) return { ok: true, detail: "below confidence threshold" };
      if ((await deps.repo.countLeadsCreatedToday(r.channel, deps.now())) >= OUTREACH.newLeadsPerChannelPerDay) return { ok: true, detail: "daily cap reached" };
      const score = scoreLead({ ciccActive: true, ...r.signals });
      const created = await deps.repo.createLead({
        consultantProfileId: r.consultantProfileId, score, externalHandle: r.handle, matchConfidence: r.matchConfidence,
        snapshot: newBacklogLead(r.channel, r.timezone, deps.now()),
      });
      return { ok: true, detail: created ? "created" : "already a lead" };
    }

    case "DMS_CLOSED": {
      const lead = await deps.repo.getLead(r.leadId);
      return { ok: lead ? await apply(deps, lead, { type: "REASSIGN", channel: "EMAIL" }) : false };
    }

    case "CHANNEL_HALT":
      await hooks.haltChannel(r.channel, r.reason, r.detail);
      return { ok: true };
  }
}
```

- [ ] **Step 4: Run all outreach tests**

Run: `npx vitest run src/lib/outreach`
Expected: PASS (every suite from Tasks 3–13).

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/engine.ts src/lib/outreach/__tests__/engine-social.test.ts
git commit -m "feat(outreach): worker task building and report handling"
```

---

### Task 14: Wiring, health check, crons and worker API

**Files:**
- Create: `src/lib/outreach/health.ts`
- Create: `src/lib/outreach/deps.ts`
- Create: `src/app/api/cron/outreach-email/route.ts`
- Create: `src/app/api/cron/outreach-health/route.ts`
- Create: `src/app/api/outreach/worker/auth.ts`
- Create: `src/app/api/outreach/worker/tasks/route.ts`
- Create: `src/app/api/outreach/worker/candidates/route.ts`
- Create: `src/app/api/outreach/worker/report/route.ts`
- Create: `src/app/api/outreach/worker/heartbeat/route.ts`
- Modify: `vercel.json`
- Test: `src/lib/outreach/__tests__/health.test.ts`

**Interfaces:**
- Consumes: the engine, settings, `sendEmail` from `@/lib/mailer`,
  `isAuthorizedCronRequest`, and `createOpenAiLlm` from
  `@/lib/content-pipeline/llm`.
- Produces:
  - `realDeps(): EngineDeps`
  - `haltChannel(c: Channel, reason: string, detail: string): Promise<void>`
  - `checkHealth(input: { now: Date; settings: OutreachSettings; heartbeat: Date | null; stats: { touches: number; negatives: number } }): { alerts: string[]; pause: boolean }`
  - `runHealth(): Promise<{ alerts: string[]; paused: boolean }>`
  - `HTTP GET /api/outreach/worker/tasks?channel=LINKEDIN|X` → `{ tasks: WorkerTask[] }`
  - `HTTP GET /api/outreach/worker/candidates?limit=13` → `{ candidates: { consultantProfileId, fullName, company, city, province, licenseNumber, timezone }[] }`
  - `HTTP POST /api/outreach/worker/report` with body `WorkerReport` → `{ ok, detail? }`
  - `HTTP POST /api/outreach/worker/heartbeat` → `{ ok: true }`

- [ ] **Step 1: Write the failing health test**

```ts
// src/lib/outreach/__tests__/health.test.ts
import { describe, expect, it } from "vitest";
import { checkHealth } from "../health";

const on = { enabled: true, dryRun: false, channels: { LINKEDIN: true, X: false, EMAIL: true } };
const thu = new Date("2026-11-05T15:00:00Z");

describe("checkHealth", () => {
  it("alerts on a stale heartbeat on active days when a social channel is on", () => {
    const r = checkHealth({ now: thu, settings: on, heartbeat: new Date("2026-11-04T10:00:00Z"), stats: { touches: 0, negatives: 0 } });
    expect(r.alerts[0]).toMatch(/heartbeat/i);
    expect(r.pause).toBe(false);
  });

  it("stays quiet on rest days and when social channels are off", () => {
    expect(checkHealth({ now: new Date("2026-11-07T15:00:00Z"), settings: on, heartbeat: null, stats: { touches: 0, negatives: 0 } }).alerts).toEqual([]);
    expect(checkHealth({ now: thu, settings: { ...on, channels: { LINKEDIN: false, X: false, EMAIL: true } }, heartbeat: null, stats: { touches: 0, negatives: 0 } }).alerts).toEqual([]);
  });

  it("auto-pauses above 8% negatives with at least 13 touches", () => {
    const fresh = new Date("2026-11-05T14:00:00Z");
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: { touches: 13, negatives: 2 } }).pause).toBe(true);  // 15.4%
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: { touches: 13, negatives: 1 } }).pause).toBe(false); // 7.7%
    expect(checkHealth({ now: thu, settings: on, heartbeat: fresh, stats: { touches: 8, negatives: 5 } }).pause).toBe(false);  // too few
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/health.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `health.ts` and `deps.ts`**

```ts
// src/lib/outreach/health.ts
import { isActiveDay } from "./calendar";
import { OUTREACH } from "./config";
import type { OutreachSettings } from "./settings";

export function checkHealth({ now, settings, heartbeat, stats }: {
  now: Date; settings: OutreachSettings; heartbeat: Date | null; stats: { touches: number; negatives: number };
}): { alerts: string[]; pause: boolean } {
  const alerts: string[] = [];
  if (!settings.enabled) return { alerts, pause: false };

  const socialOn = settings.channels.LINKEDIN || settings.channels.X;
  const staleMs = OUTREACH.heartbeatStaleHours * 3_600_000;
  if (socialOn && isActiveDay(now, OUTREACH.operatorTimezone) && (!heartbeat || now.getTime() - heartbeat.getTime() > staleMs)) {
    alerts.push(`Worker heartbeat is stale (last: ${heartbeat?.toISOString() ?? "never"}). Check the Mac worker.`);
  }

  const { minTouches, maxNegativeRate } = OUTREACH.autoPause;
  const pause = stats.touches >= minTouches && stats.negatives / stats.touches > maxNegativeRate;
  if (pause) alerts.push(`Auto-paused: ${stats.negatives}/${stats.touches} negative replies or opt-outs in the last 7 days.`);
  return { alerts, pause };
}
```

```ts
// src/lib/outreach/deps.ts
import { createOpenAiLlm } from "@/lib/content-pipeline/llm";
import { sendEmail } from "@/lib/mailer";
import { addCalendarDays } from "./calendar";
import { OUTREACH } from "./config";
import { buildOutreachEmail, cancelOutreachEmail, sendOutreachEmail } from "./email";
import { cancelScheduledEmails, type EngineDeps } from "./engine";
import { checkHealth } from "./health";
import { getFoundingOfferForOutreach } from "./offer";
import { prismaRepo } from "./repo";
import { getHeartbeat, getOutreachSettings, setOutreachFlag } from "./settings";
import { suppress } from "./suppression";
import type { Channel } from "./types";

export function realDeps(): EngineDeps {
  return {
    now: () => new Date(),
    random: Math.random,
    llm: createOpenAiLlm(process.env.OUTREACH_LLM_MODEL || "gpt-4o-mini"),
    repo: prismaRepo,
    settings: getOutreachSettings,
    getOffer: getFoundingOfferForOutreach,
    email: { build: (i) => buildOutreachEmail(i), send: sendOutreachEmail, cancel: cancelOutreachEmail },
    suppress,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com",
  };
}

async function alertFounder(subject: string, lines: string[]): Promise<void> {
  const to = process.env.OUTREACH_ALERT_EMAIL;
  if (!to) {
    console.error(`[outreach] OUTREACH_ALERT_EMAIL unset; alert dropped: ${subject} — ${lines.join(" | ")}`);
    return;
  }
  await sendEmail({ to, subject: `[Verixa outreach] ${subject}`, html: lines.map((l) => `<p>${l.replace(/</g, "&lt;")}</p>`).join(""), type: "OUTREACH_ALERT" });
}

export async function haltChannel(c: Channel, reason: string, detail: string): Promise<void> {
  await setOutreachFlag(c, false);
  if (c === "EMAIL") await cancelScheduledEmails(realDeps());
  await alertFounder(`${c} halted: ${reason}`, [`The ${c} channel was turned off automatically.`, detail, "Fix it, then turn the channel back on in /dashboard/admin/outreach."]);
}

export async function runHealth(): Promise<{ alerts: string[]; paused: boolean }> {
  const now = new Date();
  const [settings, heartbeat, stats] = await Promise.all([
    getOutreachSettings(), getHeartbeat(), prismaRepo.negativeStats(addCalendarDays(now, -OUTREACH.autoPause.windowDays)),
  ]);
  const { alerts, pause } = checkHealth({ now, settings, heartbeat, stats });
  if (pause) {
    await setOutreachFlag("enabled", false);
    await cancelScheduledEmails(realDeps());
  }
  if (alerts.length) await alertFounder(pause ? "Auto-paused" : "Health warning", alerts);
  return { alerts, paused: pause };
}
```

- [ ] **Step 4: Run the health test**

Run: `npx vitest run src/lib/outreach/__tests__/health.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement the routes**

```ts
// src/app/api/cron/outreach-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";
import { realDeps } from "@/lib/outreach/deps";
import { planEmailDay } from "@/lib/outreach/engine";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), process.env.CRON_SECRET ?? "")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const result = await planEmailDay(realDeps());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/outreach-email]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
```

```ts
// src/app/api/cron/outreach-health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";
import { runHealth } from "@/lib/outreach/deps";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), process.env.CRON_SECRET ?? "")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runHealth()) });
  } catch (e) {
    console.error("[cron/outreach-health]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
```

```ts
// src/app/api/outreach/worker/auth.ts
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/content-pipeline/cron-auth";

/** Returns a 401 response when the worker token is missing or wrong; null when authorized. */
export function rejectUnlessWorker(req: NextRequest): NextResponse | null {
  const ok = isAuthorizedCronRequest(req.headers.get("authorization"), process.env.OUTREACH_WORKER_TOKEN ?? "");
  return ok ? null : NextResponse.json({ ok: false }, { status: 401 });
}
```

```ts
// src/app/api/outreach/worker/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { realDeps } from "@/lib/outreach/deps";
import { buildSocialTasks } from "@/lib/outreach/engine";
import { rejectUnlessWorker } from "../auth";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  const channel = new URL(req.url).searchParams.get("channel");
  if (channel !== "LINKEDIN" && channel !== "X") return NextResponse.json({ ok: false, error: "channel must be LINKEDIN or X" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, tasks: await buildSocialTasks(realDeps(), channel) });
  } catch (e) {
    console.error("[worker/tasks]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
```

```ts
// src/app/api/outreach/worker/candidates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaRepo } from "@/lib/outreach/repo";
import { rejectUnlessWorker } from "../auth";

/** Profiles the worker should try to match on LinkedIn/X. Returns names only, never contact data. */
export async function GET(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit") ?? 13), 1), 34);
  try {
    const ids = (await prismaRepo.findDiscoveryCandidates(limit)).map((c) => c.consultantProfileId);
    const candidates = await prisma.consultantProfile.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true, company: true, city: true, province: true, licenseNumber: true, timezone: true },
    });
    return NextResponse.json({ ok: true, candidates: candidates.map(({ id, ...rest }) => ({ consultantProfileId: id, ...rest })) });
  } catch (e) {
    console.error("[worker/candidates]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
```

```ts
// src/app/api/outreach/worker/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { haltChannel, realDeps } from "@/lib/outreach/deps";
import { applyReport, workerReportSchema } from "@/lib/outreach/engine";
import { rejectUnlessWorker } from "../auth";

export async function POST(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  const parsed = workerReportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  try {
    return NextResponse.json(await applyReport(realDeps(), parsed.data, { haltChannel }));
  } catch (e) {
    console.error("[worker/report]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
```

```ts
// src/app/api/outreach/worker/heartbeat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { recordHeartbeat } from "@/lib/outreach/settings";
import { rejectUnlessWorker } from "../auth";

export async function POST(req: NextRequest) {
  const denied = rejectUnlessWorker(req);
  if (denied) return denied;
  await recordHeartbeat(new Date());
  return NextResponse.json({ ok: true });
}
```

In `vercel.json`, add two entries to `crons`. 11:00 UTC is 06:00/07:00 Toronto, before
any Canadian window opens. Health runs at 23:00 UTC.

```json
{ "path": "/api/cron/outreach-email", "schedule": "0 11 * * *" },
{ "path": "/api/cron/outreach-health", "schedule": "0 23 * * *" }
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npx vitest run src/lib/outreach`
Expected: no type errors; every outreach suite passes.

Run `npm run dev`. In another shell, run each of these:

```bash
curl -s localhost:3000/api/outreach/worker/heartbeat -X POST
```

Expected: `{"ok":false}` with status 401.

```bash
curl -s -H "Authorization: Bearer $OUTREACH_WORKER_TOKEN" localhost:3000/api/outreach/worker/heartbeat -X POST
```

Expected: `{"ok":true}`.

```bash
curl -s -H "Authorization: Bearer $OUTREACH_WORKER_TOKEN" "localhost:3000/api/outreach/worker/tasks?channel=X"
```

Expected: `{"ok":true,"tasks":[]}`, because channels default to off.

- [ ] **Step 7: Commit**

```bash
git add src/lib/outreach/health.ts src/lib/outreach/deps.ts src/lib/outreach/__tests__/health.test.ts src/app/api/cron/outreach-email src/app/api/cron/outreach-health src/app/api/outreach vercel.json
git commit -m "feat(outreach): crons, health auto-pause, alerts and worker API"
```

---

### Task 15: Resend webhook → suppress bounced or complained outreach

**Files:**
- Modify: `src/app/api/webhooks/resend/route.ts` (event handling block)
- Modify: `src/lib/outreach/engine.ts` (append `handleEmailEvent`)
- Test: append to `src/lib/outreach/__tests__/engine.test.ts`

**Interfaces:**
- Produces: `handleEmailEvent(deps: EngineDeps, resendId: string, status: "DELIVERED" | "BOUNCED" | "COMPLAINED"): Promise<boolean>`
  (returns true when the id belongs to an outreach touch)

- [ ] **Step 1: Add the failing test**

Add `handleEmailEvent` to the existing `import { ... } from "../engine"` at the top of
`engine.test.ts`, then append:

```ts
describe("handleEmailEvent", () => {
  it("suppresses the lead on bounce and marks SENT on delivery", async () => {
    const lead = { ...backlog("A", 20), state: "TOUCH_1" as const, touchCount: 1 };
    const { repo } = memoryRepo([lead]);
    repo.findTouchByExternalId = async (id) => (id === "re_9" ? { id: "t9", leadId: "A", step: 1 } : null);
    const updates: object[] = [];
    repo.updateTouch = async (_id, p) => { updates.push(p); };
    const d = deps(repo);
    expect(await handleEmailEvent(d, "re_unknown", "BOUNCED")).toBe(false);
    expect(await handleEmailEvent(d, "re_9", "DELIVERED")).toBe(true);
    expect(updates[0]).toMatchObject({ status: "SENT" });
    await handleEmailEvent(d, "re_9", "BOUNCED");
    expect(lead.state).toBe("OPTED_OUT");
    expect(d.suppress).toHaveBeenCalledWith("A", "bounced", { email: "A@firm.ca" });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/outreach/__tests__/engine.test.ts`
Expected: FAIL, "handleEmailEvent is not a function".

- [ ] **Step 3: Implement**

Append to `engine.ts`:

```ts
export async function handleEmailEvent(deps: EngineDeps, resendId: string, status: "DELIVERED" | "BOUNCED" | "COMPLAINED"): Promise<boolean> {
  const touch = await deps.repo.findTouchByExternalId(resendId);
  if (!touch) return false;
  if (status === "DELIVERED") {
    await deps.repo.updateTouch(touch.id, { status: "SENT", sentAt: deps.now() });
    return true;
  }
  const lead = await deps.repo.getLead(touch.leadId);
  if (!lead) return true;
  const ctx = await deps.repo.getComposeContext(lead.id);
  await deps.suppress(lead.consultantProfileId, status === "BOUNCED" ? "bounced" : "complained", { email: ctx?.email ?? null });
  await apply(deps, lead, { type: "SUPPRESSED" });
  return true;
}
```

In `src/app/api/webhooks/resend/route.ts`, add an import and call it right after the
`newStatus` guard, before the `campaignRecipient.updateMany`:

```ts
import { handleEmailEvent } from "@/lib/outreach/engine";
import { realDeps } from "@/lib/outreach/deps";
// ...
    const isOutreach = await handleEmailEvent(realDeps(), resendId, newStatus as "DELIVERED" | "BOUNCED" | "COMPLAINED");
    if (isOutreach) return NextResponse.json({ ok: true, outreach: true });
```

Resend's dashboard webhook already sends `email.delivered`, `email.bounced` and
`email.complained` (see the route header). `outreach.getverixa.com` is in the same
Resend account, so no new webhook is needed.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/outreach`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/engine.ts src/lib/outreach/__tests__/engine.test.ts src/app/api/webhooks/resend/route.ts
git commit -m "feat(outreach): suppress bounced or complained outreach via Resend webhook"
```

---

### Task 16: Admin dashboard and kill switch

**Files:**
- Create: `src/actions/outreach.actions.ts`
- Create: `src/app/dashboard/admin/outreach/page.tsx`
- Create: `src/app/dashboard/admin/outreach/OutreachDashboardClient.tsx`
- Modify: `src/components/ui/SidebarNav.tsx` (the "Marketing & Reach" children)

**Interfaces:**
- Consumes: `getOutreachSettings`, `setOutreachFlag`, `cancelScheduledEmails`,
  `realDeps`, `prisma`.
- Produces:
  - `getOutreachDashboard(): Promise<OutreachDashboard>`
  - `toggleOutreachFlag(flag: OutreachFlag, value: boolean): Promise<OutreachSettings>`
  - `type OutreachDashboard = { settings: OutreachSettings; heartbeat: string | null; counts: { channel: string; state: string; n: number }[]; today: { id: string; channel: string; step: number; status: string; subject: string | null; body: string; scheduledFor: string | null; name: string }[]; conversations: { leadId: string; name: string; channel: string; label: string; body: string; receivedAt: string; profileUrl: string }[]; backlog: { leadId: string; name: string; channel: string; score: number }[] }`

- [ ] **Step 1: Server actions**

```ts
// src/actions/outreach.actions.ts
"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { localParts, localTimeToUtc } from "@/lib/outreach/calendar";
import { OUTREACH } from "@/lib/outreach/config";
import { realDeps } from "@/lib/outreach/deps";
import { cancelScheduledEmails } from "@/lib/outreach/engine";
import { getHeartbeat, getOutreachSettings, setOutreachFlag, type OutreachFlag, type OutreachSettings } from "@/lib/outreach/settings";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") throw new Error("Unauthorized");
}

export type OutreachDashboard = {
  settings: OutreachSettings;
  heartbeat: string | null;
  counts: { channel: string; state: string; n: number }[];
  today: { id: string; channel: string; step: number; status: string; subject: string | null; body: string; scheduledFor: string | null; name: string }[];
  conversations: { leadId: string; name: string; channel: string; label: string; body: string; receivedAt: string; profileUrl: string }[];
  backlog: { leadId: string; name: string; channel: string; score: number }[];
};

export async function getOutreachDashboard(): Promise<OutreachDashboard> {
  await requireAdmin();
  const now = new Date();
  const dayStart = localTimeToUtc(localParts(now, OUTREACH.operatorTimezone).ymd, 0, 0, OUTREACH.operatorTimezone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com";

  const [settings, heartbeat, grouped, today, convos, backlog] = await Promise.all([
    getOutreachSettings(),
    getHeartbeat(),
    prisma.outreachLead.groupBy({ by: ["channel", "state"], _count: { _all: true } }),
    prisma.outreachTouch.findMany({
      where: { createdAt: { gte: dayStart } }, orderBy: { createdAt: "asc" },
      include: { lead: { include: { consultantProfile: { select: { fullName: true } } } } },
    }),
    prisma.outreachLead.findMany({
      where: { state: "CONVERSATION" }, orderBy: { updatedAt: "desc" }, take: 34,
      include: { consultantProfile: { select: { fullName: true, licenseNumber: true } }, replies: { orderBy: { receivedAt: "desc" }, take: 1 } },
    }),
    prisma.outreachLead.findMany({
      where: { state: "BACKLOG" }, orderBy: { score: "desc" }, take: 21,
      include: { consultantProfile: { select: { fullName: true } } },
    }),
  ]);

  return {
    settings,
    heartbeat: heartbeat?.toISOString() ?? null,
    counts: grouped.map((g) => ({ channel: g.channel, state: g.state, n: g._count._all })),
    today: today.map((t) => ({
      id: t.id, channel: t.channel, step: t.step, status: t.status, subject: t.subject, body: t.body,
      scheduledFor: t.scheduledFor?.toISOString() ?? null, name: t.lead.consultantProfile.fullName,
    })),
    conversations: convos.map((l) => ({
      leadId: l.id, name: l.consultantProfile.fullName, channel: l.channel,
      label: l.replies[0]?.label ?? "", body: l.replies[0]?.body ?? "", receivedAt: l.replies[0]?.receivedAt.toISOString() ?? l.updatedAt.toISOString(),
      profileUrl: `${appUrl}/consultant/${encodeURIComponent(l.consultantProfile.licenseNumber)}`,
    })),
    backlog: backlog.map((l) => ({ leadId: l.id, name: l.consultantProfile.fullName, channel: l.channel, score: l.score })),
  };
}

export async function toggleOutreachFlag(flag: OutreachFlag, value: boolean): Promise<OutreachSettings> {
  await requireAdmin();
  await setOutreachFlag(flag, value);
  // Turning sending off must also pull back emails already handed to Resend.
  if (!value && (flag === "enabled" || flag === "EMAIL")) await cancelScheduledEmails(realDeps());
  revalidatePath("/dashboard/admin/outreach");
  return getOutreachSettings();
}
```

- [ ] **Step 2: Page (server component)**

```tsx
// src/app/dashboard/admin/outreach/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getOutreachDashboard } from "@/actions/outreach.actions";
import OutreachDashboardClient from "./OutreachDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminOutreachPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") redirect("/login");
  const data = await getOutreachDashboard();
  return <OutreachDashboardClient initial={data} />;
}
```

- [ ] **Step 3: Client component**

```tsx
// src/app/dashboard/admin/outreach/OutreachDashboardClient.tsx
"use client";

import { useState, useTransition } from "react";
import { toggleOutreachFlag, type OutreachDashboard } from "@/actions/outreach.actions";
import type { OutreachFlag } from "@/lib/outreach/settings";

const CHANNELS = ["LINKEDIN", "X", "EMAIL"] as const;
const STATES = ["BACKLOG", "INVITED", "TOUCH_1", "TOUCH_2", "TOUCH_3", "CONVERSATION", "CLAIMED", "OPTED_OUT", "CLOSED_NO_REPLY", "ARCHIVED"];

function Toggle({ label, on, danger, disabled, onChange }: { label: string; on: boolean; danger?: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:opacity-50 ${
        on ? (danger ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-900") : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="font-mono text-xs uppercase">{on ? "on" : "off"}</span>
    </button>
  );
}

export default function OutreachDashboardClient({ initial }: { initial: OutreachDashboard }) {
  const [settings, setSettings] = useState(initial.settings);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const flip = (flag: OutreachFlag, value: boolean) =>
    start(async () => {
      setError(null);
      try {
        setSettings(await toggleOutreachFlag(flag, value));
      } catch (e) {
        setError((e as Error).message);
      }
    });

  const count = (c: string, s: string) => initial.counts.find((x) => x.channel === c && x.state === s)?.n ?? 0;
  const heartbeatAge = initial.heartbeat ? Math.round((Date.now() - new Date(initial.heartbeat).getTime()) / 3_600_000) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Consultant outreach</h1>
          <p className="text-sm text-slate-500">Mon–Thu · 8 found and 5 touches per channel per day · max 3 touches per person</p>
        </div>
        <p className={`text-sm ${heartbeatAge === null || heartbeatAge > 24 ? "text-amber-700" : "text-slate-500"}`}>
          Worker heartbeat: {heartbeatAge === null ? "never" : `${heartbeatAge}h ago`}
        </p>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Toggle label="Outreach (kill switch)" on={settings.enabled} disabled={pending} onChange={(v) => flip("enabled", v)} />
        <Toggle label="Dry run" on={settings.dryRun} danger disabled={pending} onChange={(v) => flip("dryRun", v)} />
        {CHANNELS.map((c) => (
          <Toggle key={c} label={c} on={settings.channels[c]} disabled={pending} onChange={(v) => flip(c, v)} />
        ))}
      </section>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">State</th>
              {CHANNELS.map((c) => <th key={c} className="px-3 py-2 text-right">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {STATES.map((s) => (
              <tr key={s} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{s}</td>
                {CHANNELS.map((c) => <td key={c} className="px-3 py-2 text-right tabular-nums text-slate-900">{count(c, s)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Conversations ({initial.conversations.length})</h2>
        {initial.conversations.length === 0 && <p className="text-sm text-slate-500">No replies waiting for you.</p>}
        {initial.conversations.map((c) => (
          <article key={c.leadId} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <a href={c.profileUrl} className="font-medium text-slate-900 underline-offset-2 hover:underline">{c.name}</a>
              <span className="text-xs text-slate-500">{c.channel} · {c.label} · {new Date(c.receivedAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Today ({initial.today.length})</h2>
        {initial.today.map((t) => (
          <details key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <summary className="flex cursor-pointer flex-wrap justify-between gap-2 text-sm">
              <span className="font-medium text-slate-900">{t.name} · {t.channel} · touch {t.step}</span>
              <span className="font-mono text-xs text-slate-500">{t.status}{t.scheduledFor ? ` · ${new Date(t.scheduledFor).toLocaleTimeString()}` : ""}</span>
            </summary>
            {t.subject && <p className="mt-3 text-sm font-medium text-slate-800">{t.subject}</p>}
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{t.body}</p>
          </details>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Top backlog</h2>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
          {initial.backlog.map((b) => (
            <li key={b.leadId} className="flex justify-between px-4 py-2">
              <span className="text-slate-900">{b.name}</span>
              <span className="font-mono text-xs text-slate-500">{b.channel} · {b.score}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Sidebar entry**

In `src/components/ui/SidebarNav.tsx`, add this item to the "Marketing & Reach"
`children`, after "Social Publishing":

```ts
            { label: "Consultant Outreach", href: "/dashboard/admin/outreach" },
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`. As an admin, open `http://localhost:3000/dashboard/admin/outreach`.

Expected:
- The page renders with every toggle off except Dry run (which is on).
- The counts table is all zeros.
- Flipping "EMAIL" persists across a reload.

Then flip everything back to the safe defaults.

Run: `npm run lint`
Expected: no new errors in the new files.

- [ ] **Step 6: Commit**

```bash
git add src/actions/outreach.actions.ts src/app/dashboard/admin/outreach src/components/ui/SidebarNav.tsx
git commit -m "feat(outreach): admin dashboard with kill switch, dry run and conversations"
```

---

### Task 17: Environment, dry-run week and go-live checklist

**Files:**
- Modify: `.env.local` (not committed), the Vercel project env and `.env.example`
  (local, gitignored)

- [ ] **Step 1: Set the env vars**

These already exist: `OUTREACH_FROM_EMAIL` and `OUTREACH_MAILING_ADDRESS`. Add the
following to `.env.local` and to the Vercel project (production, preview and
development) as encrypted values:

| Key | Value |
|---|---|
| `UNSUBSCRIBE_SECRET` | `openssl rand -hex 32` (if not already set in Vercel; check first, because rotating it invalidates old unsubscribe links) |
| `OUTREACH_WORKER_TOKEN` | `openssl rand -hex 32`. Plan B's worker uses the same value. |
| `OUTREACH_REPLY_TO` | The inbox the founder reads and the Plan B IMAP reader polls |
| `OUTREACH_ALERT_EMAIL` | The founder's alert inbox |
| `OUTREACH_LLM_MODEL` | Optional. Default `gpt-4o-mini`. |

Add the same keys, without values, to `.env.example`.

- [ ] **Step 2: Full test and build**

Run: `npm test && npm run lint && npm run build`
Expected: every test passes, lint is clean for the new files, and the build succeeds.

- [ ] **Step 3: Dry-run week (5 active days)**

1. Deploy.
2. In `/dashboard/admin/outreach`, turn on Outreach and EMAIL, and leave Dry run on.
3. Each morning, check "Today" for DRY_RUN touches. Confirm each one: correct name, a
   working profile link, no invented numbers, a tone the founder would sign.
4. Write any wording change into `STEP_BRIEF` or `SYSTEM` in `composer.ts` and commit.

- [ ] **Step 4: Go live**

Turn Dry run off. The next 11:00 UTC cron schedules real emails. Watch Resend logs,
`Today`, and the health email for the first week.

- [ ] **Step 5: Commit any prompt tuning**

```bash
git add src/lib/outreach/composer.ts
git commit -m "chore(outreach): tune message briefs after dry-run review"
```

---

### Task 18: Wire the founding offer (after the admin plans/offers branch merges)

**Precondition:** the `admin-plans-offers` branch is merged and exports
`getActiveFoundingOffer()`. Find it with `grep -rn "export async function getActiveFoundingOffer" src`.

**Files:**
- Modify: `src/lib/outreach/offer.ts`
- Test: `src/lib/outreach/__tests__/offer.test.ts`

- [ ] **Step 1: Read the real return type**

Run: `grep -rn "getActiveFoundingOffer" src --include=*.ts -A 25 | head -60`

Note the field names for plan name, free months, price after the free period (cents),
currency, remaining slots and deadline.

- [ ] **Step 2: Write the failing mapping test**

```ts
// src/lib/outreach/__tests__/offer.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/offers", () => ({
  getActiveFoundingOffer: vi.fn(async () => ({
    planName: "Pro", freeMonths: 12, priceAfterCents: 4900, currency: "CAD", remainingSlots: 13, deadline: new Date("2027-01-31T00:00:00Z"),
  })),
}));

import { getFoundingOfferForOutreach } from "../offer";

describe("getFoundingOfferForOutreach", () => {
  it("maps the admin offer", async () => {
    expect(await getFoundingOfferForOutreach()).toEqual({
      planName: "Pro", freeMonths: 12, priceAfterCents: 4900, currency: "CAD", remainingSlots: 13, deadline: new Date("2027-01-31T00:00:00Z"),
    });
  });
});
```

Adjust the `vi.mock` path and the returned object to match the module path and field
names found in Step 1.

- [ ] **Step 3: Implement the mapping**

Replace the body of `getFoundingOfferForOutreach` in `src/lib/outreach/offer.ts`.
Import from the real module path, and map each field from the real names found in
Step 1:

```ts
import { getActiveFoundingOffer } from "@/lib/offers";

export async function getFoundingOfferForOutreach(): Promise<FoundingOffer | null> {
  const o = await getActiveFoundingOffer();
  if (!o) return null;
  if (o.remainingSlots !== null && o.remainingSlots <= 0) return null;
  if (o.deadline && o.deadline.getTime() < Date.now()) return null;
  return {
    planName: o.planName,
    freeMonths: o.freeMonths,
    priceAfterCents: o.priceAfterCents,
    currency: o.currency,
    remainingSlots: o.remainingSlots,
    deadline: o.deadline,
  };
}
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run src/lib/outreach`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/outreach/offer.ts src/lib/outreach/__tests__/offer.test.ts
git commit -m "feat(outreach): read the founding offer from the admin for touch 3"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| §1 Goal, metrics, auto-pause | 14 (`checkHealth`/`runHealth`), 16 (dashboard counts) |
| §2 Operating rules | 3 (config, calendar), 6 (scheduler), 12 (slots) |
| §2 One person, one channel | 2 (unique `consultantProfileId`), 4 (`REASSIGN`) |
| §2 Escape hatch | 7 (social lines), 10 (email footer + one-click) |
| §2 Eligibility | 11 (`findDiscoveryCandidates`), 12 (`runMaintenance`) |
| §3 Scoring | 5, 12 (email signals), 13 (social signals) |
| §4 Message sequence, offer from admin | 7, 18 |
| §5 Lifecycle, reply classification | 4, 8, 13 |
| §6 Architecture, units, data model, idempotency | 2, 11, 12, 13, 14 |
| §7 Email (CASL, subdomain, bounces, reply-to) | 10, 15, 17 |
| §7 LinkedIn (invite as touch 1, 21-day withdrawal), X (DMs closed → email) | 4, 6, 13. Browser side in Plan B. |
| §8 Checkpoint halt, heartbeat, kill switch, dry-run | 13 (`CHANNEL_HALT`), 14, 16, 17 |
| §9 Prerequisites | 1, 14 (`vercel.json`) |
| §10 Testing | Every task; dry-run week in 17. Adapter fixtures are in Plan B. |
