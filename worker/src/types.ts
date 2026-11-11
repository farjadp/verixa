// Worker-side copies of the Verixa wire types. The worker is a separate package and cannot import from the app.
// Source of truth: `workerReportSchema` and `WorkerTask` in src/lib/outreach/engine.ts.
// Drift is caught by src/lib/outreach/__tests__/worker-contract.test.ts in the root project.

export type SocialChannel = "LINKEDIN" | "X";
export type ReportChannel = "LINKEDIN" | "X" | "EMAIL";

export interface WorkerTask {
  touchId: string;
  leadId: string;
  kind: "INVITE" | "TOUCH";
  step: 1 | 2 | 3;
  handle: string;
  body: string;
  dryRun: boolean;
  timezone: string;
}

export interface Candidate {
  consultantProfileId: string;
  fullName: string;
  company: string | null;
  city: string | null;
  province: string | null;
  licenseNumber: string | null;
  timezone: string;
}

export interface Signals {
  postedAboutMarketing: boolean;
  soloOrSmallFirm: boolean;
  activeLast21Days: boolean;
  socialProfileComplete: boolean;
  hadProfileViews30d: boolean;
}

export interface WorkerStatus {
  enabled: boolean;
  dryRun: boolean;
  invitedHandles: string[];
  invitedLeads: { leadId: string; handle: string }[];
}

export type WorkerReport =
  | { type: "TOUCH_RESULT"; touchId: string; status: "SENT" | "FAILED" | "UNCERTAIN"; externalMessageId?: string; error?: string }
  | { type: "INVITE_ACCEPTED"; leadId: string }
  | { type: "REPLY"; channel: ReportChannel; handle?: string; email?: string; body: string; messageIds?: string[] }
  | { type: "LEAD_MATCHED"; consultantProfileId: string; channel: SocialChannel; handle: string; matchConfidence: number; timezone: string; signals: Signals }
  | { type: "DMS_CLOSED"; leadId: string }
  | { type: "CHANNEL_HALT"; channel: ReportChannel; reason: "CHECKPOINT" | "ADAPTER_BROKEN"; detail: string };
