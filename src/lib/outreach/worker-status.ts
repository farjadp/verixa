import type { OutreachSettings } from "./settings";
import { TERMINAL_STATES } from "./types";
import { timezoneForProvince } from "./timezone";

export interface WorkerStatus {
  enabled: boolean;
  dryRun: boolean;
  invitedHandles: string[];
  /** Same leads with ids, so the worker can report INVITE_ACCEPTED. */
  invitedLeads: { leadId: string; handle: string }[];
}

/**
 * What the worker may do right now. A halted channel has its flag switched off, so it reads as disabled.
 * Without a configured founder alert address nothing runs, whatever the flags say.
 */
export function computeWorkerStatus(
  settings: OutreachSettings,
  channel: "LINKEDIN" | "X",
  invited: readonly { id: string; externalHandle: string | null }[],
  alertConfigured: boolean,
): WorkerStatus {
  const leads = invited.filter((l) => l.externalHandle).map((l) => ({ leadId: l.id, handle: l.externalHandle as string }));
  return {
    enabled: alertConfigured && settings.enabled && settings.channels[channel],
    dryRun: settings.dryRun,
    invitedHandles: [...new Set(leads.map((l) => l.handle))],
    invitedLeads: leads,
  };
}

/** Last-moment check before one send: the touch must still be queued and the person still contactable. */
export function computeSendable(i: { touchStatus: string; leadState: string; claimed: boolean; suppressed: boolean }): { sendable: boolean; reason?: string } {
  if (i.touchStatus !== "QUEUED") return { sendable: false, reason: `touch is ${i.touchStatus}` };
  if ((TERMINAL_STATES as readonly string[]).includes(i.leadState)) return { sendable: false, reason: `lead is ${i.leadState}` };
  if (i.claimed) return { sendable: false, reason: "profile claimed" };
  if (i.suppressed) return { sendable: false, reason: "person suppressed" };
  return { sendable: true };
}

export interface CandidateProfile {
  id: string; fullName: string; company: string | null; city: string | null;
  province: string | null; country: string | null; licenseNumber: string | null;
}

export interface WorkerCandidate {
  consultantProfileId: string; fullName: string; company: string | null; city: string | null;
  province: string | null; licenseNumber: string | null; timezone: string;
}

/** Social discovery candidates. The zone comes from the province exactly as for email leads; profiles without one are dropped. */
export function toWorkerCandidates(profiles: readonly CandidateProfile[]): WorkerCandidate[] {
  const out: WorkerCandidate[] = [];
  for (const { id, country, ...rest } of profiles) {
    const timezone = timezoneForProvince(rest.province, country);
    if (!timezone) continue;
    out.push({ consultantProfileId: id, ...rest, timezone });
  }
  return out;
}
