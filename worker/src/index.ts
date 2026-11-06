import { resolve } from "node:path";
import { LinkedInAdapter } from "./adapters/linkedin";
import { XAdapter } from "./adapters/x";
import { ApiError, FatalApiError, createApi } from "./api";
import { openContext } from "./browser";
import { loadConfig } from "./config";
import { collectReplies, parseMail, withImapSource } from "./imap";
import { describePlan, EXIT, runWork, type WorkDeps } from "./jobs/work";
import { acquireLock, LockedError } from "./lock";
import { FileState } from "./state";
import { realSleep } from "./timing";

const STATE_DIR = resolve(process.cwd(), ".state");
const log = (m: string) => console.log(`[${new Date().toISOString()}] ${m}`);

async function main(): Promise<number> {
  const dryProbe = process.argv.includes("--dry-probe");
  const cfg = loadConfig(process.env);
  const api = createApi({ baseUrl: cfg.baseUrl, token: cfg.token });
  const base = { api, now: () => new Date(), tz: cfg.operatorTz, candidateLimit: 13 };

  if (dryProbe) {
    for (const line of await describePlan(base, true)) console.log(line);
    return EXIT.OK;
  }

  let release: () => void;
  try {
    release = acquireLock(resolve(STATE_DIR, "run.lock"));
  } catch (e) {
    if (e instanceof LockedError) {
      log(e.message);
      return EXIT.LOCKED;
    }
    throw e;
  }

  const state = new FileState(resolve(STATE_DIR, "state.json"));
  const ctx = await openContext(cfg.profileDir);
  try {
    const linkedinPage = ctx.pages()[0] ?? (await ctx.newPage());
    const xPage = await ctx.newPage();
    const deps: WorkDeps = {
      ...base,
      adapters: { LINKEDIN: new LinkedInAdapter(linkedinPage), X: new XAdapter(xPage) },
      state,
      sleep: realSleep,
      rng: Math.random,
      log,
      imap: async () => withImapSource(cfg.imap, (src) => collectReplies(src, state, [cfg.imap.user], parseMail)),
    };
    const summary = await runWork(deps);
    log(`done: exit ${summary.exitCode}; ${JSON.stringify(summary.channels)}; imap ${summary.imap}`);
    return summary.exitCode;
  } finally {
    await ctx.close().catch(() => {});
    release();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    if (e instanceof FatalApiError) {
      console.error(e.message);
      process.exit(EXIT.AUTH);
    }
    console.error(e instanceof ApiError || e instanceof Error ? e.message : String(e));
    process.exit(EXIT.ERROR);
  },
);
