# Consultant Outreach Agents — Phase 1 Design

- **Date:** 2026-11-05
- **Owner:** Farjad (solo operator)
- **Status:** Draft — awaiting review
- **Scope:** Supply side only (RCIC consultants). Channels: LinkedIn, X, email.

## 1. Goal

Get unclaimed consultant profiles on Verixa claimed, through low-volume, personal,
fully automated outreach that never feels like spam.

Verixa already holds a `ConsultantProfile` for every RCIC imported from the CICC
public registry (`rawEmail`, `rawPhone`, `licenseNumber`), and a claim flow exists at
`/claim/[license_number]`. Outreach therefore does not "sell a product". It tells a
consultant their public listing already exists, shows what it is doing for them,
and invites them to claim it — free for one year.

### Success metrics (weekly)

| Metric | Target |
|---|---|
| Reply rate | ≥ 8% |
| Claim rate (claimed within 21 days of first touch) | ≥ 3% |
| Negative replies + opt-outs | < 5% |
| LinkedIn / X account restrictions | 0 |

**Automatic pause:** if negative replies plus opt-outs in a rolling 7-day window exceed
8% of touches (minimum 13 touches), the whole system pauses and alerts the founder.

### Out of scope (phase 1)

Facebook; the client (immigrant) side; social listening; content publishing (the
existing `SocialJob` pipeline already covers it); paid LinkedIn or X APIs; Unipile.

## 2. Operating rules

All numbers come from the Fibonacci sequence, except where the calendar forces otherwise.

| Rule | Value |
|---|---|
| Active days | Mon–Thu (recipient's timezone) |
| Rest days | 3 (Fri, Sat, Sun) — no sends, no discovery, no social browsing |
| New leads matched per channel per active day | 8 |
| Touches per channel per active day (follow-ups included) | 5 (hard cap) |
| Max touches per person, all channels combined | 3 |
| Wait: touch 1 → touch 2 | 3 active days |
| Wait: touch 2 → touch 3 | 5 active days |
| Backlog expiry | 34 days → `ARCHIVED` |
| Cooldown after no reply | 89 days, then eligible again once |
| Send window | 08:00–13:00 in `ConsultantProfile.timezone` |
| Gap between sends on one channel | random 5–13 minutes |

**One person, one channel.** Each consultant is assigned exactly one channel at a
time. Leads are keyed by `consultantProfileId`, so they dedupe across channels by
construction.

**Escape hatch in every message.**
- Email: an unsubscribe link plus the sender's identity and mailing address, as CASL
  requires.
- LinkedIn / X: a last line such as "Not relevant? Just reply 'no' and I won't message
  again."

**Eligibility.** A profile is skipped when any of these hold:
- it is already claimed (`userId` is set);
- its CICC status is not active;
- it is on the suppression list or in `EmailUnsubscribe`;
- it is in a cooldown period;
- it has already used its 89-day re-contact.

## 3. Lead scoring

Leads get Fibonacci-weighted signals. Each channel picks its top 5 eligible leads per day.

| Signal | Weight |
|---|---|
| CICC status active (required, also a gate) | 13 |
| Posted about client acquisition or marketing recently (social channels only) | 8 |
| Solo practitioner or small firm (no company, or a company with ≤ 3 RCICs) | 5 |
| Active on the channel in the last 21 days | 3 |
| The Verixa profile got views in the last 30 days (`AnalyticsEvent`) | 2 |
| Social profile complete (photo, headline mentions RCIC/immigration) | 1 |

## 4. Message sequence

The sequence leads with value and keeps the pitch light. An LLM writes each message
with the existing `openai` dependency, from a channel-specific template plus the
lead's facts. Messages never invent facts: the prompt receives only verified fields,
and the output is rejected if it contains numbers that are not in the input.

| Step | Content |
|---|---|
| Touch 1 | "Your CICC listing is on Verixa" + link to their public profile. No ask beyond "take a look". |
| Touch 2 | Real data, if any (profile views or searches in their city or specialization). If there is no data, a useful note about how clients search for consultants. Soft invite to claim. |
| Touch 3 (last) | Founding offer, read live from the admin through `getActiveFoundingOffer()`: free months, plan, price afterwards, cancel anytime, remaining slots or deadline. Then silence. If there is no active offer, touch 3 is skipped and the sequence ends after touch 2. |

The offer and its prices are managed by the founder in the admin (plans + offers).
They are never hardcoded in templates.

## 5. Lead lifecycle

```
NEW (matched) → BACKLOG → TOUCH_1 → TOUCH_2 → TOUCH_3 → CLOSED_NO_REPLY
                   │          └──────────┴─────────┴──→ CONVERSATION  (any reply that isn't negative)
                   │          └──────────┴─────────┴──→ OPTED_OUT     (negative reply / unsubscribe)
                   │          └──────────┴─────────┴──→ CLAIMED       (profile claimed)
                   └→ ARCHIVED (34 days unused)
LinkedIn only: BACKLOG → INVITED → CONNECTED → TOUCH_1 …   (invite withdrawn after 21 days)
CLOSED_NO_REPLY → (89 days later) BACKLOG, once
```

- **`CONVERSATION`:** automation stops for that person and the founder is notified.
  The founder replies by hand.
- **`OPTED_OUT`:** written to `OutreachSuppression`, which covers every channel and is
  permanent.
- **`CLAIMED`:** detected when `ConsultantProfile.userId` becomes non-null. Ends the
  sequence on every channel.

**Reply classification.** An LLM labels each reply `negative`, `positive`, `question`
or `auto_reply`. A negative label opts the person out. Positive and question labels move
the lead to `CONVERSATION`. An auto-reply keeps the sequence going but pushes the next
touch back by 3 active days. Low-confidence labels are treated as `CONVERSATION`
(the safe side).

## 6. Architecture

```
┌──────────────── Verixa (Vercel + Neon) ─────────────────┐        ┌──── Local worker (Farjad's Mac) ────┐
│ src/lib/outreach/   state machine, scheduler, scoring,  │  HTTPS │ worker/  Node + Playwright           │
│                     composer, suppression, classifier   │◄──────►│  persistent Chrome profile (headed)  │
│ /api/outreach/worker/{tasks,report,heartbeat}           │ bearer │  LinkedIn + X adapters               │
│ /api/cron/outreach-email     sends email touches        │  token │  inbox readers (LinkedIn, X, IMAP)   │
│ /api/cron/outreach-health    heartbeat + auto-pause     │        │  launchd schedule + pmset wake       │
│ /dashboard/admin/outreach    Today, backlog, convos,    │        └──────────────────────────────────────┘
│                              kill switch, dry-run       │
│ Resend (outreach subdomain)                             │
└─────────────────────────────────────────────────────────┘
```

**Verixa is the brain and the source of truth.** It decides who gets contacted, on
which channel, with what text and when. The worker only executes tasks and reports
results. Email does not depend on the Mac.

### Units

| Unit | Responsibility | Depends on |
|---|---|---|
| `outreach/state.ts` | Pure transition function `(lead, event) → lead`. No I/O. | — |
| `outreach/scheduler.ts` | Builds the day's task list per channel within the caps, send windows and rest days. Pure, given "now". | state |
| `outreach/scoring.ts` | Computes the Fibonacci-weighted score. | — |
| `outreach/composer.ts` | Template + LLM → message text. Includes the fact check and the escape-hatch line. | openai |
| `outreach/classifier.ts` | Reply → label + confidence. | openai |
| `outreach/suppression.ts` | `isSuppressed(profile)`, `suppress(profile, reason)`. Checks `OutreachSuppression` + `EmailUnsubscribe`. | prisma |
| `api/outreach/worker/*` | Task pull, result report, heartbeat. Bearer `OUTREACH_WORKER_TOKEN`, compared in constant time. | lib |
| `worker/adapters/linkedin.ts`, `x.ts` | `findProfile`, `invite`, `sendMessage`, `readInbox`, `detectCheckpoint`. | Playwright |
| `worker/run.ts` | Pull tasks → execute with random gaps → report. Stops a channel on any checkpoint. | adapters |

### Data model (new Prisma models)

- **`OutreachLead`:** `id`, `consultantProfileId`, `channel` (LINKEDIN | X | EMAIL),
  `externalHandle`, `matchConfidence`, `score`, `state`, `touchCount`,
  `nextActionAt`, `recontactUsed`, timestamps. One active lead per
  `consultantProfileId`, enforced by a partial unique index.
- **`OutreachTouch`:** `id`, `leadId`, `step`, `body`, `status` (QUEUED | SENT |
  FAILED | SKIPPED), `idempotencyKey` (unique: `leadId:step`), `externalMessageId`,
  `sentAt`, `error`.
- **`OutreachReply`:** `id`, `leadId`, `body`, `label`, `confidence`, `receivedAt`.
- **`OutreachSuppression`:** `consultantProfileId` (unique), `email`, `linkedinUrl`,
  `xHandle`, `reason`, `createdAt`.
- **Settings in the existing `PlatformSetting`:**
  - `outreach.enabled` (global kill switch)
  - `outreach.<channel>.enabled`
  - `outreach.dryRun`
  - `outreach.worker.lastHeartbeat`

**Idempotency.** A touch row is created as `QUEUED` before any send, and its
`idempotencyKey` is unique. The worker reports `SENT` with the external ID. If the
worker crashes mid-send, the task comes back as `QUEUED`. Before resending, the
adapter checks the conversation thread for that text, so a message is never sent
twice.

## 7. Channel specifics

### Email
- Recipient: `rawEmail` from the CICC registry. This is a conspicuously published
  business address, so it qualifies for CASL implied consent when the message is
  relevant to their practice.
- Sent through Resend from the dedicated subdomain `outreach.getverixa.com` (for
  example `farjad@outreach.getverixa.com`), so cold mail cannot damage deliverability of
  booking and receipt mail. The sender address comes from `OUTREACH_FROM_EMAIL`.
- The CASL footer address comes from `OUTREACH_MAILING_ADDRESS`. Email sending
  refuses to run while it is unset. It must be a full postal address or a PO box; a
  postal code alone does not satisfy CASL.
- Message format: plain-text style; no tracking pixels; `List-Unsubscribe` header and a
  one-click unsubscribe link; sender name, Verixa and a mailing address in the footer.
- Bounces and complaints from the existing Resend webhook trigger suppression.
- Reply detection: the reply-to is the founder's inbox. The worker polls it over IMAP
  (an app password in the worker's `.env`), matches replies to leads by thread
  headers and reports them.

### LinkedIn
- Matching: the worker searches name + "RCIC" / company / city and scores the match.
  A match is accepted only when `matchConfidence ≥ 0.8`.
- The founder's account is LinkedIn Premium. Touch 1 is a connection invite with a
  personalized note of at most 300 characters. Touches 2 and 3 go out as messages
  once the invite is accepted. If the invite is still pending after 21 days, it is
  withdrawn and the lead is reassigned to email. InMail credits are not used in
  phase 1.
- Invites count toward the daily cap of 5.

### X
- Matching works the same way, by name + bio keywords.
- A DM is only possible when the target's DMs are open. If they are closed, the lead
  is reassigned to email (or LinkedIn) instead of falling back to follows or replies.

## 8. Safety and failure handling

- **Checkpoint, captcha or unexpected login page:** the worker stops that channel at
  once, reports `CHECKPOINT`, and Verixa emails the founder. Nothing retries
  automatically. The founder clears it in the worker's Chrome window and re-enables
  the channel in the dashboard.
- **Heartbeat:** the worker reports every run. `outreach-health` (daily cron) alerts
  when there has been no heartbeat for 24 hours on an active day.
- **Kill switch:** global and per channel in `/dashboard/admin/outreach`. The worker
  checks it before every single action, not just once per run.
- **Dry-run:** the first 5 active days run in `dryRun`. Everything is matched,
  scored, composed and scheduled, but not sent. The founder reviews the queue in the
  dashboard and approves going live.
- **Selector breakage:** an adapter that can't find an expected element reports
  `ADAPTER_BROKEN` with a screenshot path and stops the channel. It never guesses.
- **Mac availability:** a `launchd` job runs inside the send window, `pmset` wakes the
  machine, and `caffeinate` is held during the run. Missed days don't catch up. The
  scheduler simply continues on the next active day.

## 9. Prerequisites (existing code)

1. `src/lib/unsubscribe.ts` falls back to a hardcoded `UNSUBSCRIBE_SECRET` and
   compares tokens with `===`. Remove the fallback (fail closed) and use
   `crypto.timingSafeEqual`. Outreach depends on this link being unforgeable.
2. `src/app/api/cron/reminders/route.ts` falls back to `'dev_cron_secret'`. Remove the
   fallback, and do the same in every cron route, including the new ones.
3. `vercel.json` only schedules `/api/cron/backup`. Add the outreach crons, and confirm
   the Vercel plan allows the needed cron frequency.

## 10. Testing

- **Unit (vitest):** state transitions, scheduler caps and windows (including rest days
  and timezones), scoring, suppression precedence, idempotency-key collisions,
  composer fact-check rejection, and the classifier's low-confidence fallback.
- **Adapters:** run against saved HTML fixtures of LinkedIn and X pages, plus a
  checkpoint fixture that must stop the channel.
- **End-to-end:** a full week in dry-run on production data before live sends.

## 11. Open questions

Resolved:
- **Offer and prices:** managed in the admin (plans + offers work on branch
  `admin-plans-offers`). Outreach reads them through `getActiveFoundingOffer()`.
- **LinkedIn:** Premium, so invites carry notes.
- **Sending subdomain:** `outreach.getverixa.com` on Resend, with DNS on Vercel.
- **CASL mailing address:** set in `OUTREACH_MAILING_ADDRESS` (in `.env.local` and the
  Vercel project env). It is deliberately kept out of the repository.

No open questions remain for phase 1.
