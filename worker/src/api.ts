import type { Candidate, SocialChannel, WorkerReport, WorkerStatus, WorkerTask } from "./types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/** 401: the token is wrong or missing. Retrying cannot help; the run must stop. */
export class FatalApiError extends ApiError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "FatalApiError";
  }
}

export interface Api {
  getTasks(channel: SocialChannel): Promise<WorkerTask[]>;
  getCandidates(limit: number): Promise<Candidate[]>;
  getStatus(channel: SocialChannel): Promise<WorkerStatus>;
  report(r: WorkerReport): Promise<void>;
  heartbeat(): Promise<void>;
}

export interface ApiOptions {
  baseUrl: string;
  token: string;
  fetch?: typeof fetch;
}

export function createApi(opts: ApiOptions): Api {
  const doFetch = opts.fetch ?? fetch;
  const root = `${opts.baseUrl.replace(/\/+$/, "")}/api/outreach/worker`;

  async function call<T extends { ok: boolean }>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${opts.token}` };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    const res = await doFetch(`${root}/${path}`, { method: init.method, headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    let json: (T & { error?: string }) | null = null;
    try {
      json = (await res.json()) as T & { error?: string };
    } catch {
      json = null;
    }
    const label = `${init.method} ${path.split("?")[0]}`;
    if (res.status === 401) throw new FatalApiError(`${label}: unauthorized (check OUTREACH_WORKER_TOKEN)`, 401);
    if (!res.ok) throw new ApiError(`${label}: HTTP ${res.status}${json?.error ? ` ${json.error}` : ""}`, res.status);
    if (!json || json.ok !== true) throw new ApiError(`${label}: ${json?.error ?? "response not ok"}`, res.status);
    return json;
  }

  return {
    async getTasks(channel) {
      return (await call<{ ok: boolean; tasks: WorkerTask[] }>(`tasks?channel=${channel}`, { method: "GET" })).tasks;
    },
    async getCandidates(limit) {
      return (await call<{ ok: boolean; candidates: Candidate[] }>(`candidates?limit=${limit}`, { method: "GET" })).candidates;
    },
    async getStatus(channel) {
      const { enabled, dryRun, invitedHandles, invitedLeads } = await call<{ ok: boolean } & WorkerStatus>(`status?channel=${channel}`, { method: "GET" });
      return { enabled, dryRun, invitedHandles, invitedLeads };
    },
    async report(r) {
      await call("report", { method: "POST", body: r });
    },
    async heartbeat() {
      await call("heartbeat", { method: "POST" });
    },
  };
}
