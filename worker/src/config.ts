import { z } from "zod";

const validTz = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const envSchema = z.object({
  VERIXA_BASE_URL: z.string().url(),
  OUTREACH_WORKER_TOKEN: z.string().min(1),
  IMAP_HOST: z.string().min(1),
  IMAP_PORT: z.coerce.number().int().min(1).max(65535),
  IMAP_USER: z.string().min(1),
  IMAP_PASS: z.string().min(1),
  OPERATOR_TZ: z.string().refine(validTz, "unknown timezone").default("America/Toronto"),
  PROFILE_DIR: z.string().min(1),
});

export interface WorkerConfig {
  baseUrl: string;
  token: string;
  imap: { host: string; port: number; user: string; pass: string };
  operatorTz: string;
  profileDir: string;
}

/** Validates the environment. Error text names keys only, never values. */
export function loadConfig(env: Record<string, string | undefined>): WorkerConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    throw new Error(`Invalid worker config. Fix these env vars: ${keys.join(", ")}`);
  }
  const e = parsed.data;
  return {
    baseUrl: e.VERIXA_BASE_URL.replace(/\/+$/, ""),
    token: e.OUTREACH_WORKER_TOKEN,
    imap: { host: e.IMAP_HOST, port: e.IMAP_PORT, user: e.IMAP_USER, pass: e.IMAP_PASS },
    operatorTz: e.OPERATOR_TZ,
    profileDir: e.PROFILE_DIR,
  };
}
