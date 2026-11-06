# Outreach Worker (Plan B) Implementation Plan

> Spec: `docs/superpowers/specs/2026-11-05-consultant-outreach-design.md` (sections 6, 7, 8). Plan A (core) is built; this plan builds the local worker that executes LinkedIn/X tasks and reads inboxes.
> Execute with subagent-driven-development. TDD for everything that is pure logic.

**Goal:** a Node + Playwright program on Farjad's Mac that pulls tasks from Verixa, executes LinkedIn/X invites and DMs inside the send window with random gaps, discovers/matches profiles, reads LinkedIn/X/IMAP replies, and reports back. Verixa stays the brain; the worker never decides who or what to send.

**Honest limit:** Playwright adapters touch live sites. They cannot be unit-tested and their selectors can only be proven with the founder's logged-in sessions. So adapters are thin, use role/text locators, never guess, and ship with a `probe` command (read-only) the founder runs once per site. Everything else is pure and tested with fakes.

## Contract with Verixa (already built, `src/app/api/outreach/worker/`)
Bearer `OUTREACH_WORKER_TOKEN`. `GET tasks?channel=LINKEDIN|X` → `{tasks: WorkerTask[]}` (`touchId, leadId, kind INVITE|TOUCH, step, handle, body, dryRun`). `GET candidates?limit=` → `{candidates:[{consultantProfileId, fullName, company, city, province, licenseNumber, timezone}]}`. `POST report` with `TOUCH_RESULT | INVITE_ACCEPTED | REPLY | LEAD_MATCHED | DMS_CLOSED | CHANNEL_HALT` (zod `workerReportSchema` in `src/lib/outreach/engine.ts`). `POST heartbeat`.

## Hard rules for the worker
1. Kill switch checked **before every single action** (B1 endpoint). Disabled/halted → stop that channel immediately.
2. `dryRun: true` task → do nothing, report nothing.
3. Any checkpoint/captcha/login wall → stop the channel, `CHANNEL_HALT/CHECKPOINT`. Missing expected element → `CHANNEL_HALT/ADAPTER_BROKEN` + screenshot path. Never retry, never guess.
4. Only run inside the send window (08:00–13:00 Toronto, Mon–Thu), gaps 5–13 min random, ≤ caps from Verixa (tasks list already capped).
5. Before sending, check the thread for the exact body (crash-resend guard); if present report SENT without resending.
6. No secrets in git. `worker/.env` and `worker/.state/` are git-ignored.

---

## Task B1: Server — worker status endpoint
**Files:** create `src/app/api/outreach/worker/status/route.ts`, `src/lib/outreach/worker-status.ts`, test `src/lib/outreach/__tests__/worker-status.test.ts`.
`GET status?channel=LINKEDIN|X` (worker auth) → `{ok, enabled: boolean, dryRun: boolean, invitedHandles: string[]}`. `enabled` = global && channel flag && not halted. `invitedHandles` = handles of leads in state INVITED on that channel (so the worker can detect acceptance). Pure function `computeWorkerStatus(settings, invitedLeads)` tested; route thin.
- [ ] test (enabled matrix, dryRun passthrough, handles) → fail → implement → pass → tsc → commit `feat(outreach): worker status endpoint`.

## Task B2: Worker package scaffold
**Files:** `worker/package.json` (type module; deps `playwright`, `imapflow`, `mailparser`, `zod`, `tsx`, `vitest`, `typescript`), `worker/tsconfig.json`, `worker/vitest.config.ts`, `worker/.env.example`, `worker/src/config.ts` + test; root `tsconfig.json` exclude `worker`; `.gitignore` add `worker/.env`, `worker/.state/`, `worker/node_modules/`, `worker/.profile/`.
`loadConfig(env)` (zod): `VERIXA_BASE_URL`, `OUTREACH_WORKER_TOKEN`, `IMAP_HOST/PORT/USER/PASS`, `OPERATOR_TZ` (default America/Toronto), `PROFILE_DIR`. Fails loudly listing missing keys. Root `npm test` and `tsc` must be unaffected.
- [ ] commit `chore(worker): scaffold`.

## Task B3: Verixa API client
**Files:** `worker/src/api.ts`, `worker/src/api.test.ts`.
Typed methods `getTasks(channel)`, `getCandidates(limit)`, `getStatus(channel)`, `report(r)`, `heartbeat()`. Bearer header; non-2xx → typed `ApiError`; 401 → fatal. Injectable `fetch`. Report type imported by copy of the schema (worker is a separate package: duplicate the union type in `worker/src/types.ts`, with a comment pointing at `workerReportSchema`; B3 also adds a root test asserting every worker report example parses against the real schema, to catch drift).
- [ ] tests with fake fetch (headers, errors, 401) → implement → commit.

## Task B4: Pure helpers
**Files:** `worker/src/timing.ts`, `worker/src/match.ts`, `worker/src/state.ts` (+ tests).
- `inSendWindow(now, tz)`, `isActiveDay`, `randomGapMs(rng)` ∈ [5,13] min, `sleep` injectable.
- `scoreMatch(candidate, profile)` → confidence 0..1 from name similarity (normalized, diacritics-insensitive, token match), "RCIC"/"immigration consultant" keywords, company and city overlap; ≥0.8 accepted; ties/ambiguity (two ≥0.8) → reject. Also `deriveSignals(profileText)` → the five booleans conservatively (unknown → false).
- `state.ts`: JSON file store for IMAP last-seen UID and per-day action log (crash-resend guard bookkeeping).
- [ ] TDD each.

## Task B5: Adapter interface + runner
**Files:** `worker/src/adapters/types.ts`, `worker/src/runner.ts`, `worker/src/runner.test.ts`.
`ChannelAdapter { findProfile(candidate) ; invite(handle, note); sendMessage(handle, body); hasSentText(handle, body); readInbox(invitedHandles); detectCheckpoint() }` returning discriminated results (`ok | dmsClosed | checkpoint | broken{screenshot}`).
`runChannel(channel, deps)`: status check → window check → getTasks → for each task: re-check status, skip dryRun, `hasSentText` guard, execute, report TOUCH_RESULT (SENT with external id / FAILED), random gap; checkpoint → CHANNEL_HALT + stop; broken → CHANNEL_HALT ADAPTER_BROKEN + stop; DMs closed → DMS_CLOSED. Always heartbeat at end.
Tests with a fake adapter/api: kill switch mid-run stops; dryRun untouched; checkpoint halts and nothing further runs; already-sent text not resent; FAILED reported on error; gap called between tasks; outside window does nothing.
- [ ] commit.

## Task B6: Browser session + LinkedIn adapter
**Files:** `worker/src/browser.ts`, `worker/src/adapters/linkedin.ts`, `worker/src/cli/login.ts`, `worker/src/cli/probe.ts`.
`openContext()` = `chromium.launchPersistentContext(PROFILE_DIR, {channel:"chrome", headless:false})`. `login linkedin` opens the site for manual sign-in (no credentials stored in code). Adapter: search people by name + "RCIC" (+ company/city), open profile, `invite` with ≤300-char note, `sendMessage`, `hasSentText`, `readInbox` (accepted connections for invited handles + unread conversations), `detectCheckpoint` (URL/text patterns: checkpoint, captcha, authwall, login). Locators by role/text; missing → return `broken` with screenshot in `worker/.state/shots/`. `probe linkedin` is read-only: verifies logged-in, search works, selectors resolve; prints a pass/fail table. Reviewer must check no write action exists outside `invite`/`sendMessage`.
- [ ] commit. **Founder gate:** run `probe linkedin` once.

## Task B7: X adapter
Same shape as B6: `findProfile` (people search), `sendMessage` (DM; detect closed DMs → `dmsClosed`), `hasSentText`, `readInbox`, `detectCheckpoint`; `invite` unsupported (throws). `probe x`.
- [ ] commit. **Founder gate:** `probe x`.

## Task B8: IMAP reply reader
**Files:** `worker/src/imap.ts`, `worker/src/imap.test.ts`.
`fetchNewReplies()` via imapflow since last UID; parse with mailparser; keep only messages whose sender is not ourselves, strip quoted text, truncate 8000; return `{email, body}`; ignore bounces/no-reply senders (Verixa handles bounces via the Resend webhook). Pure `extractReplyBody(parsed)` and `isIgnorableSender()` tested with fixtures. Reports `REPLY` with `channel: "EMAIL"`.
- [ ] commit.

## Task B9: Entry points and discovery
**Files:** `worker/src/index.ts`, `worker/src/jobs/discover.ts`, `worker/src/jobs/inbox.ts`, tests for job orchestration with fakes.
`npm run work` = per channel (LinkedIn, X) → discover (pull candidates, `findProfile`, `scoreMatch`, report `LEAD_MATCHED` only when ≥0.8) → run tasks (B5) → inbox (INVITE_ACCEPTED, REPLY, DMS_CLOSED) → IMAP replies → heartbeat. Locked so two runs can't overlap (lock file). `--dry-probe` prints what would run. Exit codes distinguish halt vs error.
- [ ] commit.

## Task B10: Scheduling and docs
**Files:** `worker/launchd/com.verixa.outreach-worker.plist` (runs 08:05 Mon–Thu local, `caffeinate -i`), `worker/scripts/install.sh` (copies plist, `launchctl load`, prints the `sudo pmset repeat wakeorpoweron MTWR 07:55:00` line for the founder to run), `worker/README.md` (setup, login, probe, env, halt recovery, uninstall).
- [ ] commit.

## Final: whole-branch review, then founder checklist
Whole-branch code review of `worker/` + B1; root gates (`npm test`, `tsc` = 4 pre-existing). Founder: `npm i` in `worker/`, fill `.env`, `login`, `probe`, run `work` with `outreach.dryRun` on.
