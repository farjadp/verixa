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
