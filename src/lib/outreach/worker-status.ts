import type { OutreachSettings } from "./settings";
import type { LeadState } from "./types";

export interface WorkerStatus {
  enabled: boolean;
  dryRun: boolean;
  invitedHandles: string[];
  /** Same leads with ids, so the worker can report INVITE_ACCEPTED. */
  invitedLeads: { leadId: string; handle: string }[];
}

/** What the worker may do right now. A halted channel has its flag switched off, so it reads as disabled. */
export function computeWorkerStatus(
  settings: OutreachSettings,
  channel: "LINKEDIN" | "X",
  leads: readonly { id: string; state: LeadState; externalHandle: string | null }[],
): WorkerStatus {
  const invited = leads.filter((l) => l.state === "INVITED" && l.externalHandle).map((l) => ({ leadId: l.id, handle: l.externalHandle as string }));
  return {
    enabled: settings.enabled && settings.channels[channel],
    dryRun: settings.dryRun,
    invitedHandles: [...new Set(invited.map((i) => i.handle))],
    invitedLeads: invited,
  };
}
