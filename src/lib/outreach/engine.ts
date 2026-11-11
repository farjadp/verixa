// src/lib/outreach/engine.ts
import { z } from "zod";
import type { Llm } from "@/lib/content-pipeline/types";
import { isActiveDay, localParts, localTimeToUtc } from "./calendar";
import { classifyReply, isObviousOptOut } from "./classifier";
import { ComposeRejectedError, composeMessage } from "./composer";
import { ALERT_UNSET_MESSAGE, OUTREACH } from "./config";
import { OutreachConfigError, type BuiltEmail } from "./email";
import { buildIntroEmail } from "./intro-email";
import { heldFollowUpsLine, isInboxReadStale } from "./health";
import type { FoundingOffer } from "./offer";
import type { LeadRow, OutreachRepo } from "./repo";
import { planTasks, type Task } from "./scheduler";
import { scoreLead } from "./scoring";
import type { OutreachSettings } from "./settings";
import { InvalidTransitionError, newBacklogLead, transition } from "./state";
import { CHANNELS, type Channel, type LeadEvent, type Step } from "./types";

export interface EngineDeps {
  now: () => Date;
  random: () => number;
  llm: Llm;
  repo: OutreachRepo;
  settings: () => Promise<OutreachSettings>;
  getOffer: () => Promise<FoundingOffer | null>;
  email: {
    build: (i: { to: string; subject: string; body: string }) => BuiltEmail;
    send: (m: BuiltEmail, at: Date | null, idempotencyKey?: string) => Promise<{ id: string }>;
    cancel: (id: string) => Promise<void>;
  };
  suppress: (profileId: string, reason: string, contact?: { email?: string | null; linkedinUrl?: string | null; xHandle?: string | null }) => Promise<void>;
  appUrl: string;
  /** When the worker last read the email inbox successfully (null = never). Email follow-ups are held while it is stale. */
  inboxReadAt: () => Promise<Date | null>;
  /** False when OUTREACH_ALERT_EMAIL is unset: no work is sent or handed out, whatever the flags say. */
  alertConfigured: boolean;
  /** Founder alert; optional so tests and callers without alerting still work. */
  alert?: (subject: string, lines: string[]) => Promise<void>;
}

/**
 * True only when the provider definitely refused the send (HTTP 400–499, e.g. validation or an invalid address),
 * so nothing was sent. 409 can mean a concurrent idempotent request that may have gone out, so it is NOT definite.
 * Timeouts, 5xx, network errors and anything unrecognised are ambiguous: the email may exist.
 */
export function isDefiniteRejection(e: unknown): boolean {
  if ((e as Error | null)?.name === "OutreachConfigError") return true; // nothing was sent
  // Resend refused to reuse the key for a different payload: the email was not sent.
  if ((e as { code?: unknown } | null)?.code === "invalid_idempotent_request") return true;
  const code = (e as { statusCode?: unknown } | null)?.statusCode;
  return typeof code === "number" && code >= 400 && code < 500 && code !== 409;
}

let alertUnsetLogged = false;
function alertGuardBlocks(deps: EngineDeps): boolean {
  if (deps.alertConfigured) return false;
  if (!alertUnsetLogged) {
    alertUnsetLogged = true;
    console.warn(`[outreach] ${ALERT_UNSET_MESSAGE}`);
  }
  return true;
}

async function raise(deps: EngineDeps, subject: string, lines: string[]): Promise<void> {
  try {
    await deps.alert?.(subject, lines);
  } catch (e) {
    console.error(`[outreach] alert failed (${(e as Error).message}): ${subject}`);
  }
}

/** How much of a reply the founder's "lead is in conversation" alert quotes. */
const CONVERSATION_ALERT_BODY_CHARS = 300;

/** Extra planned leads to try when some are skipped (failed compose, no email, full window). */
const SKIP_HEADROOM = 13;

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
  const remaining = OUTREACH.emailNewLeadsPerDay - (await deps.repo.countLeadsCreatedToday("EMAIL", now));
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
  // Touch 1 by email is the fixed, approved template: no model call, nothing to reject.
  if (lead.channel === "EMAIL" && step === 1) return { ...buildIntroEmail(input), email: ctx.email };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const m = await composeMessage(deps.llm, input);
      return { ...m, email: ctx.email };
    } catch (e) {
      // Missing config affects every lead: stop the whole run with a clear error instead of skipping leads forever.
      if (e instanceof OutreachConfigError) throw e;
      if (!(e instanceof ComposeRejectedError) || attempt === 1) {
        console.warn(`[outreach] compose failed for lead ${lead.id}: ${(e as Error).message}`);
        return null;
      }
    }
  }
  return null;
}

/**
 * Hands out send slots as ONE chain per run: each send is 5–13 minutes after the previous one,
 * whatever the recipient's zone, then clamped into the recipient's own 08:00–13:00 window.
 */
function slotAllocator(deps: EngineDeps) {
  let prev: Date | null = null;
  const { min, max } = OUTREACH.gapMinutes;
  return (tz: string): Date | null => {
    const now = deps.now();
    const ymd = localParts(now, tz).ymd;
    const open = localTimeToUtc(ymd, OUTREACH.sendWindow.startHour, 0, tz);
    const close = localTimeToUtc(ymd, OUTREACH.sendWindow.endHour, 0, tz);
    let next = prev
      ? new Date(prev.getTime() + Math.round(min + deps.random() * (max - min)) * 60_000)
      : new Date(open.getTime() + Math.round(deps.random() * max) * 60_000);
    if (next.getTime() < now.getTime() + min * 60_000) next = new Date(now.getTime() + min * 60_000);
    if (next < open) next = open; // later than the chain time, so the gap still holds
    if (next >= close) return null; // skip this lead for today
    prev = next;
    return next;
  };
}

export interface EmailDayResult {
  status: "disabled" | "rest_day" | "ok";
  scheduled: number;
  dryRun: number;
  failed: number;
  /** Present only when follow-ups were held because the inbox has not been read recently. */
  followUpsHeld?: number;
  detail?: string;
}

export async function planEmailDay(deps: EngineDeps): Promise<EmailDayResult> {
  const result: EmailDayResult = { status: "ok", scheduled: 0, dryRun: 0, failed: 0 };
  const settings = await deps.settings();
  if (!settings.enabled || !settings.channels.EMAIL) return { ...result, status: "disabled" };
  if (alertGuardBlocks(deps)) return { ...result, status: "disabled", detail: ALERT_UNSET_MESSAGE };

  await runMaintenance(deps, "EMAIL");
  const now = deps.now();
  if (!isActiveDay(now, OUTREACH.operatorTimezone)) return { ...result, status: "rest_day" };

  await discoverEmailLeads(deps);
  const leads = (await deps.repo.listLeads("EMAIL")).filter((l) => !l.profileClaimed && !l.suppressed);
  const offer = await deps.getOffer();
  const sentToday = await deps.repo.countTouchesToday("EMAIL", now);
  const capacity = Math.max(0, OUTREACH.emailTouchesPerDay - sentToday);

  // A follow-up to someone whose reply we have not read could land on top of an opt-out: hold step >= 2 until the inbox is read.
  const inboxReadAt = await deps.inboxReadAt();
  const holdFollowUps = isInboxReadStale(inboxReadAt, now);
  const isFollowUpState = (l: LeadRow) => l.state === "TOUCH_1" || l.state === "TOUCH_2";
  const plan = (ls: LeadRow[], limit: number) => planTasks({ channel: "EMAIL", leads: ls, now, sentToday, offerAvailable: offer !== null, activeDayOnly: true, limit });
  // Held follow-ups are left out of the plan so they cannot crowd new leads out of the day's slots.
  const tasks = plan(holdFollowUps ? leads.filter((l) => !isFollowUpState(l)) : leads, capacity + SKIP_HEADROOM);
  let followUpsHeld = holdFollowUps ? plan(leads.filter(isFollowUpState), leads.length).filter((t) => t.kind === "TOUCH" && t.step >= 2).length : 0;
  const nextSlot = slotAllocator(deps);
  const today = localParts(now, OUTREACH.operatorTimezone).ymd;

  for (const task of tasks) {
    if (task.kind !== "TOUCH") continue;
    if (holdFollowUps && task.step >= 2) { followUpsHeld++; continue; } // backstop; the plan above already excludes them
    if (result.scheduled + result.dryRun >= capacity) break;
    const lead = leads.find((l) => l.id === task.leadId)!;
    const msg = await composeWithRetry(deps, lead, task.step, offer);
    if (!msg) { result.failed++; continue; }
    const email = msg.email?.trim() ?? "";
    if (!email) {
      // No address will ever appear: stop retrying this lead every day.
      await deps.suppress(lead.consultantProfileId, "no_email");
      await apply(deps, lead, { type: "SUPPRESSED" });
      continue;
    }
    if (!msg.subject) { result.failed++; continue; }
    const cycle = lead.recontactUsed ? 1 : 0;

    // The kill switch may have been flipped while the LLM was working.
    const current = await deps.settings();
    if (!current.enabled || !current.channels.EMAIL || (current.dryRun && !settings.dryRun)) break;

    if (settings.dryRun) {
      await deps.repo.createTouch({ leadId: lead.id, channel: "EMAIL", step: task.step, cycle, subject: msg.subject, body: msg.body, status: "DRY_RUN", dryRunDay: today });
      result.dryRun++;
      continue;
    }

    // An overlapping run may have taken capacity since we computed it; re-read right before claiming a lead.
    if ((await deps.repo.countTouchesToday("EMAIL", deps.now())) >= OUTREACH.emailTouchesPerDay) break;
    const at = nextSlot(lead.timezone);
    if (!at) continue; // window already full for this timezone today
    const touch = await deps.repo.createTouch({ leadId: lead.id, channel: "EMAIL", step: task.step, cycle, subject: msg.subject, body: msg.body, status: "QUEUED" });
    if (!touch.created) continue; // already handled; never send twice

    let id: string;
    let built: BuiltEmail;
    try {
      built = deps.email.build({ to: email, subject: msg.subject, body: msg.body, ...("html" in msg && msg.html ? { html: msg.html } : {}) });
    } catch (e) {
      await deps.repo.updateTouch(touch.id, { status: "FAILED", error: (e as Error).message.slice(0, 500) });
      result.failed++;
      continue;
    }
    try {
      ({ id } = await deps.email.send(built, at, `${touch.id}:${at.getTime()}`));
    } catch (e) {
      const message = (e as Error).message.slice(0, 500);
      if (isDefiniteRejection(e)) {
        await deps.repo.updateTouch(touch.id, { status: "FAILED", error: message });
      } else {
        // The email may exist at Resend. Keep the row (blocks re-send, counts toward the cap) and tell the founder.
        await deps.repo.updateTouch(touch.id, { status: "UNCERTAIN", error: message, scheduledFor: at });
        await raise(deps, "Email send outcome unknown", [`Sending to ${email} failed ambiguously: ${message}`, "Check Resend for a possible send; the touch is held as UNCERTAIN and will not be retried."]);
      }
      result.failed++;
      continue;
    }

    // The email now exists at Resend. Never downgrade it to FAILED; the kill switch must be able to find it.
    let persisted = false;
    for (let attempt = 0; attempt < 2 && !persisted; attempt++) {
      try {
        await deps.repo.updateTouch(touch.id, { status: "SCHEDULED", externalMessageId: id, scheduledFor: at });
        persisted = true;
      } catch (e) {
        console.error(`[outreach] CRITICAL: email ${id} is scheduled at Resend but touch ${touch.id} could not be saved (attempt ${attempt + 1}): ${(e as Error).message}`);
      }
    }
    if (!persisted) {
      await raise(deps, "Scheduled email not recorded", [`Email ${id} to ${email} is scheduled at Resend but touch ${touch.id} could not be saved. The kill switch cannot find it; cancel it in the Resend dashboard if needed.`]);
    }
    try {
      await apply(deps, lead, { type: "TOUCH_SENT", step: task.step });
    } catch (e) {
      console.error(`[outreach] state update failed after send for lead ${lead.id}: ${(e as Error).message}`);
    }
    result.scheduled++;
  }
  if (followUpsHeld > 0) {
    const detail = heldFollowUpsLine(inboxReadAt);
    console.warn(`[outreach] ${followUpsHeld} email follow-up(s) held. ${detail}`);
    return { ...result, followUpsHeld, detail };
  }
  return result;
}

/** Kill switch: pull back every email that hasn't left Resend yet. */
export async function cancelScheduledEmails(deps: EngineDeps): Promise<{ cancelled: number; failed: number }> {
  const pending = await deps.repo.listFutureScheduledEmailTouches(deps.now());
  let cancelled = 0;
  let failed = 0;
  for (const t of pending) {
    try {
      await deps.email.cancel(t.externalMessageId);
      await deps.repo.updateTouch(t.id, { status: "CANCELLED" });
      const lead = await deps.repo.getLead(t.leadId);
      if (lead) await apply(deps, lead, { type: "TOUCH_CANCELLED", step: t.step });
      cancelled++;
    } catch (e) {
      failed++;
      console.error(`[outreach] cancel failed for touch ${t.id}: ${(e as Error).message}`);
    }
  }
  return { cancelled, failed };
}

export interface WorkerTask {
  touchId: string;
  leadId: string;
  kind: "INVITE" | "TOUCH";
  step: Step;
  handle: string;
  body: string;
  dryRun: boolean;
  /** The lead's IANA zone; the worker only sends inside the send window there as well. */
  timezone: string;
}

export async function buildSocialTasks(deps: EngineDeps, channel: "LINKEDIN" | "X"): Promise<WorkerTask[]> {
  const settings = await deps.settings();
  if (!settings.enabled || !settings.channels[channel] || alertGuardBlocks(deps)) return [];
  await runMaintenance(deps, channel);
  const now = deps.now();
  const leads = (await deps.repo.listLeads(channel)).filter((l) => !l.profileClaimed && !l.suppressed && l.externalHandle);
  const offer = await deps.getOffer();
  const sentToday = await deps.repo.countTouchesToday(channel, now);
  const capacity = Math.max(0, OUTREACH.touchesPerChannelPerDay - sentToday);
  const tasks = planTasks({ channel, leads, now, sentToday, offerAvailable: offer !== null, limit: capacity + SKIP_HEADROOM });
  const today = localParts(now, OUTREACH.operatorTimezone).ymd;
  const out: WorkerTask[] = [];
  let newlyCreated = 0;
  // Outstanding QUEUED touches are always re-handed; they are already counted in sentToday and take no new capacity.
  const queued = new Map((await deps.repo.listQueuedTouches(channel)).map((q) => [`${q.leadId}:${q.step}`, q]));

  for (const t of tasks) {
    if (t.kind !== "TOUCH" && t.kind !== "INVITE") continue;
    const lead = leads.find((l) => l.id === t.leadId)!;
    const existing = queued.get(`${lead.id}:${t.step}`);
    if (existing && settings.dryRun) continue; // dry-run: nothing live goes out; the QUEUED touch waits for go-live
    if (!existing && newlyCreated >= capacity) continue;

    // Kill switch or dry-run flipped while we were working: stop handing out live work.
    const current = await deps.settings();
    if (!current.enabled || !current.channels[channel] || (current.dryRun && !settings.dryRun)) break;

    if (existing) {
      out.push({ touchId: existing.id, leadId: lead.id, kind: t.kind, step: t.step, handle: lead.externalHandle!, body: existing.body, dryRun: false, timezone: lead.timezone });
      continue;
    }
    const msg = await composeWithRetry(deps, lead, t.step, offer);
    if (!msg) continue;
    // An overlapping run may have taken capacity since we computed it.
    if (!settings.dryRun && (await deps.repo.countTouchesToday(channel, deps.now())) >= OUTREACH.touchesPerChannelPerDay) break;
    const touch = await deps.repo.createTouch({
      leadId: lead.id, channel, step: t.step, cycle: lead.recontactUsed ? 1 : 0, subject: null, body: msg.body,
      status: settings.dryRun ? "DRY_RUN" : "QUEUED", dryRunDay: today,
    });
    if (touch.status !== "QUEUED" && touch.status !== "DRY_RUN") continue; // already sent or failed
    if (touch.created) newlyCreated++;
    out.push({ touchId: touch.id, leadId: lead.id, kind: t.kind, step: t.step, handle: lead.externalHandle!, body: touch.body, dryRun: touch.status === "DRY_RUN", timezone: lead.timezone });
  }
  return out;
}

const channelEnum = z.enum(CHANNELS);
const signalsSchema = z.object({
  postedAboutMarketing: z.boolean(), soloOrSmallFirm: z.boolean(), activeLast21Days: z.boolean(),
  socialProfileComplete: z.boolean(), hadProfileViews30d: z.boolean(),
});

export const workerReportSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TOUCH_RESULT"), touchId: z.string(), status: z.enum(["SENT", "FAILED", "UNCERTAIN"]), externalMessageId: z.string().optional(), error: z.string().max(500).optional() }),
  z.object({ type: z.literal("INVITE_ACCEPTED"), leadId: z.string() }),
  z.object({ type: z.literal("REPLY"), channel: channelEnum, handle: z.string().optional(), email: z.string().email().optional(), body: z.string().max(8000), messageIds: z.array(z.string().min(1).max(300)).max(20).optional(), autoReply: z.boolean().optional() })
    .refine((r) => Boolean(r.email || r.handle), { message: "email or handle required" }),
  z.object({ type: z.literal("LEAD_MATCHED"), consultantProfileId: z.string(), channel: z.enum(["LINKEDIN", "X"]), handle: z.string().min(1), matchConfidence: z.number().min(0).max(1), timezone: z.string(), signals: signalsSchema }),
  z.object({ type: z.literal("DMS_CLOSED"), leadId: z.string() }),
  z.object({ type: z.literal("CHANNEL_HALT"), channel: z.enum(["LINKEDIN", "X", "EMAIL"]), reason: z.enum(["CHECKPOINT", "ADAPTER_BROKEN"]), detail: z.string().max(1000) }),
]);
export type WorkerReport = z.infer<typeof workerReportSchema>;

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ids we may have stored for the touch a reply answers: the id itself without brackets, and its local part,
 * since a provider id often appears as `<storedId@domain>` in the RFC Message-ID.
 */
export function messageIdCandidates(ids: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim().replace(/^<+/, "").replace(/>+$/, "").trim();
    if (!id) continue;
    out.add(id);
    const at = id.lastIndexOf("@");
    if (at > 0) out.add(id.slice(0, at));
  }
  return [...out];
}

async function leadFromThread(deps: EngineDeps, r: Extract<WorkerReport, { type: "REPLY" }>): Promise<LeadRow | null> {
  if (r.channel !== "EMAIL" || !r.messageIds?.length) return null;
  const touch = await deps.repo.findEmailTouchByMessageIds(messageIdCandidates(r.messageIds));
  return touch ? deps.repo.getLead(touch.leadId) : null;
}

export async function applyReport(
  deps: EngineDeps,
  r: WorkerReport,
  hooks: { haltChannel: (c: Channel, reason: string, detail: string) => Promise<void> },
): Promise<{ ok: boolean; detail?: string }> {
  switch (r.type) {
    case "TOUCH_RESULT": {
      const touch = await deps.repo.getTouch(r.touchId);
      if (!touch) return { ok: false, detail: "unknown touch" };
      if (touch.channel !== "LINKEDIN" && touch.channel !== "X") return { ok: false, detail: "not a social touch" };
      if (touch.status === "SENT") return { ok: true, detail: "already recorded" };
      if (touch.status === "DRY_RUN") return { ok: true, detail: "dry run" };
      if (touch.status !== "QUEUED") return { ok: false, detail: `touch is ${touch.status}, not QUEUED` };
      if (r.status === "FAILED") {
        // Definitely not sent. For social channels the row is never revived, so a changed body can never double send.
        await deps.repo.updateTouch(touch.id, { status: "FAILED", error: r.error });
        return { ok: true };
      }
      if (r.status === "UNCERTAIN") {
        await deps.repo.updateTouch(touch.id, { status: "UNCERTAIN", error: r.error });
        await raise(deps, `${touch.channel} send outcome unknown`, [`The ${touch.channel} message for touch ${touch.id} may or may not have gone out: ${r.error ?? "no detail"}`, "Check the conversation by hand. The touch is held as UNCERTAIN and will not be retried."]);
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
      // Terminal-state leads are included on purpose: an opt-out from someone already archived must still suppress.
      const lead = (await leadFromThread(deps, r)) ?? (await deps.repo.findLeadByContact({ ...(r.email ? { email: r.email } : { handle: r.handle }), channel: r.channel, includeTerminal: true }));
      if (!lead) {
        if (r.channel === "EMAIL" && isObviousOptOut(r.body)) {
          await raise(deps, "Unmatched opt-out reply", [`From: ${r.email ?? "unknown"}`, `Body: ${r.body.trim().slice(0, 200)}`, "No outreach lead matched this sender or thread. Suppress them by hand if they were contacted."]);
          return { ok: true, detail: "skipped: no lead for contact (opt-out alerted)" };
        }
        return { ok: true, detail: "skipped: no lead for contact" };
      }
      const { label, confidence } = await classifyReply(deps.llm, r.body, { autoReply: r.autoReply === true });
      // Suppress before recording: if we crash in between, the replay still finds the opt-out to honour (suppress is idempotent).
      if (label === "negative") {
        const contact = r.channel === "EMAIL" ? { email: r.email } : r.channel === "X" ? { xHandle: r.handle } : { linkedinUrl: r.handle };
        await deps.suppress(lead.consultantProfileId, "negative_reply", contact);
      }
      const isNew = await deps.repo.recordReply({ leadId: lead.id, body: r.body, label, confidence });
      if (!isNew) return { ok: true, detail: "duplicate reply ignored" };
      const before = lead.state;
      const applied = await apply(deps, lead, { type: "REPLY", label });
      if (applied && before !== "CONVERSATION" && lead.state === "CONVERSATION") {
        // raise() swallows alert failures, so a broken alert never fails the report.
        await raise(deps, `Outreach reply: ${r.channel} lead is in conversation`, [
          `Channel: ${r.channel}`,
          `Lead: ${lead.id}`,
          `Contact: ${r.email ?? r.handle ?? "unknown"}`,
          `Label: ${label} (confidence ${confidence.toFixed(2)})`,
          `Reply: ${r.body.trim().slice(0, CONVERSATION_ALERT_BODY_CHARS)}`,
          `Admin: ${deps.appUrl}/dashboard/admin/outreach`,
        ]);
      }
      // Never ok:false here: a reply that cannot move the lead is still recorded, and failing would stall the worker's batch.
      return { ok: true, detail: applied ? undefined : `recorded; lead is ${lead.state}` };
    }

    case "LEAD_MATCHED": {
      if (r.matchConfidence < OUTREACH.minMatchConfidence) return { ok: true, detail: "below confidence threshold" };
      if ((await deps.repo.countLeadsCreatedToday(r.channel, deps.now())) >= OUTREACH.newLeadsPerChannelPerDay) return { ok: true, detail: "daily cap reached" };
      if (!isValidTimeZone(r.timezone)) return { ok: true, detail: "invalid timezone" };
      const elig = await deps.repo.getProfileEligibility(r.consultantProfileId);
      if (!elig.exists) return { ok: true, detail: "profile not found" };
      if (elig.claimed) return { ok: true, detail: "profile already claimed" };
      if (!elig.ciccActive) return { ok: true, detail: "licence not active" };
      if (elig.suppressed) return { ok: true, detail: "profile suppressed" };
      const score = scoreLead({ ciccActive: elig.ciccActive, ...r.signals });
      const created = await deps.repo.createLead({
        consultantProfileId: r.consultantProfileId, score, externalHandle: r.handle, matchConfidence: r.matchConfidence,
        snapshot: newBacklogLead(r.channel, r.timezone, deps.now()),
      });
      return { ok: true, detail: created ? "created" : "already a lead" };
    }

    case "DMS_CLOSED": {
      const lead = await deps.repo.getLead(r.leadId);
      if (!lead) return { ok: true, detail: "skipped: unknown lead" };
      const queued = (await deps.repo.listQueuedTouches(lead.channel)).filter((q) => q.leadId === lead.id);
      if (lead.state === "BACKLOG") {
        // Cancelled (not failed) so the same lead/step key can be reused by the email touch, and the cap is freed.
        for (const q of queued) await deps.repo.updateTouch(q.id, { status: "CANCELLED", error: "DMs closed" });
        return { ok: await apply(deps, lead, { type: "REASSIGN", channel: "EMAIL" }) };
      }
      // Mid-sequence a lead cannot change channel. Fail the touch so it is not handed out again, and report success so the queue never stalls.
      for (const q of queued) await deps.repo.updateTouch(q.id, { status: "FAILED", error: "DMs closed" });
      return { ok: true, detail: `skipped: lead is ${lead.state}; touch failed` };
    }

    case "CHANNEL_HALT":
      await hooks.haltChannel(r.channel, r.reason, r.detail);
      return { ok: true };
  }
}

export async function handleEmailEvent(deps: EngineDeps, resendId: string, status: "DELIVERED" | "BOUNCED" | "COMPLAINED"): Promise<boolean> {
  const touch = await deps.repo.findTouchByExternalId(resendId);
  if (!touch) return false;
  if (status === "DELIVERED") {
    await deps.repo.updateTouch(touch.id, touch.sentAt ? { status: "SENT" } : { status: "SENT", sentAt: deps.now() });
    return true;
  }
  const lead = await deps.repo.getLead(touch.leadId);
  if (!lead) return true;
  const ctx = await deps.repo.getComposeContext(lead.id);
  await deps.suppress(lead.consultantProfileId, status === "BOUNCED" ? "bounced" : "complained", { email: ctx?.email ?? null });
  await apply(deps, lead, { type: "SUPPRESSED" });
  return true;
}
