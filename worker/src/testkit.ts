// Test doubles shared by job tests. Not imported by production code.
import { vi } from "vitest";
import type { AdapterResult, ChannelAdapter, InboxEvents } from "./adapters/types";
import type { Api } from "./api";
import type { ActionEntry } from "./state";
import type { Candidate, WorkerReport, WorkerStatus, WorkerTask } from "./types";

export const MONDAY_9AM = new Date("2026-11-09T14:00:00Z"); // 09:00 Toronto
export const SATURDAY = new Date("2026-11-14T14:00:00Z");
export const ok = <T,>(value: T): AdapterResult<T> => ({ status: "ok", value });

export const candidate = (n: number, over: Partial<Candidate> = {}): Candidate => ({
  consultantProfileId: `c${n}`, fullName: "Jose Alvarez", company: null, city: "Toronto", province: "ON", licenseNumber: "R1", timezone: "America/Toronto", ...over,
});

export const task = (n: number, over: Partial<WorkerTask> = {}): WorkerTask => ({ touchId: `t${n}`, leadId: `l${n}`, kind: "TOUCH", step: 2, handle: `h${n}`, body: `hello ${n}`, dryRun: false, ...over });

export function memState() {
  const actions: { day: string; channel: string; touchId: string }[] = [];
  let uid: number | null = null;
  return {
    hasAction: (id: string) => actions.some((a) => a.touchId === id),
    recordAction: (day: string, e: ActionEntry) => void actions.push({ day, channel: e.channel, touchId: e.touchId }),
    countActions: (day: string, ch: ActionEntry["channel"]) => actions.filter((a) => a.day === day && a.channel === ch).length,
    getImapLastUid: () => uid,
    setImapLastUid: (u: number) => { uid = u; },
  };
}

export interface FakeApiOpts {
  status?: Partial<WorkerStatus> | Partial<WorkerStatus>[];
  tasks?: WorkerTask[] | ((channel: "LINKEDIN" | "X") => WorkerTask[]);
  candidates?: Candidate[];
}

export function fakeApi(opts: FakeApiOpts = {}) {
  const reports: WorkerReport[] = [];
  const statuses = Array.isArray(opts.status) ? opts.status : [opts.status ?? {}];
  let si = 0;
  const api: Api = {
    getStatus: vi.fn(async () => ({ enabled: true, dryRun: false, invitedHandles: [], invitedLeads: [], ...statuses[Math.min(si++, statuses.length - 1)] })),
    getTasks: vi.fn(async (ch: "LINKEDIN" | "X") => (typeof opts.tasks === "function" ? opts.tasks(ch) : opts.tasks ?? [])),
    getCandidates: vi.fn(async () => opts.candidates ?? []),
    report: vi.fn(async (r: WorkerReport) => { reports.push(r); }),
    heartbeat: vi.fn(async () => {}),
  };
  return { api, reports };
}

export function fakeAdapter(channel: "LINKEDIN" | "X", over: Partial<ChannelAdapter> = {}): ChannelAdapter {
  return {
    channel,
    findProfile: vi.fn(async () => ok([])),
    invite: vi.fn(async () => ok({})),
    sendMessage: vi.fn(async () => ok({ externalMessageId: "m" })),
    hasSentText: vi.fn(async () => ok(false)),
    readInbox: vi.fn(async (): Promise<AdapterResult<InboxEvents>> => ok({ acceptedHandles: [], replies: [] })),
    detectCheckpoint: vi.fn(async () => false),
    ...over,
  };
}
