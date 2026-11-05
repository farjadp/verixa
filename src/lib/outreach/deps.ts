import { createOpenAiLlm } from "@/lib/content-pipeline/llm";
import type { Llm } from "@/lib/content-pipeline/types";
import { sendEmail } from "@/lib/mailer";
import { addCalendarDays } from "./calendar";
import { OUTREACH } from "./config";
import { buildOutreachEmail, cancelOutreachEmail, sendOutreachEmail } from "./email";
import { cancelScheduledEmails, type EngineDeps } from "./engine";
import { checkHealth } from "./health";
import { getFoundingOfferForOutreach } from "./offer";
import { prismaRepo } from "./repo";
import { getHeartbeat, getOutreachSettings, setOutreachFlag } from "./settings";
import { suppress } from "./suppression";
import type { Channel } from "./types";

/**
 * Builds the OpenAI client on first use, so callers that never compose
 * (Resend webhook, admin toggle) don't need OPENAI_API_KEY.
 */
function lazyLlm(model: string): Llm {
  let client: Llm | null = null;
  return {
    json: (...args) => {
      client ??= createOpenAiLlm(model);
      return client.json(...args);
    },
  };
}

export function realDeps(): EngineDeps {
  return {
    now: () => new Date(),
    random: Math.random,
    llm: lazyLlm(process.env.OUTREACH_LLM_MODEL || "gpt-4o-mini"),
    repo: prismaRepo,
    settings: getOutreachSettings,
    getOffer: getFoundingOfferForOutreach,
    email: { build: (i) => buildOutreachEmail(i), send: sendOutreachEmail, cancel: cancelOutreachEmail },
    suppress,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://www.getverixa.com",
    alert: (subject, lines) => alertFounder(subject, lines),
  };
}

async function alertFounder(subject: string, lines: string[]): Promise<void> {
  const to = process.env.OUTREACH_ALERT_EMAIL;
  if (!to) {
    console.error(`[outreach] OUTREACH_ALERT_EMAIL unset; alert dropped: ${subject} — ${lines.join(" | ")}`);
    return;
  }
  try {
    const res = await sendEmail({ to, subject: `[Verixa outreach] ${subject}`, html: lines.map((l) => `<p>${l.replace(/</g, "&lt;")}</p>`).join(""), type: "OUTREACH_ALERT" });
    if (!res?.success) console.error(`[outreach] ALERT NOT DELIVERED: ${subject} — ${lines.join(" | ")}`);
  } catch (e) {
    console.error(`[outreach] ALERT NOT DELIVERED (${(e as Error).message}): ${subject} — ${lines.join(" | ")}`);
  }
}

function cancelFailureLine(failed: number): string {
  return `${failed} scheduled email(s) could not be cancelled at Resend. They may still send; cancel them in the Resend dashboard.`;
}

export async function haltChannel(c: Channel, reason: string, detail: string): Promise<void> {
  const lines = [`The ${c} channel was turned off automatically.`, detail];
  try {
    await setOutreachFlag(c, false);
    if (c === "EMAIL") {
      const { failed } = await cancelScheduledEmails(realDeps());
      if (failed > 0) lines.push(cancelFailureLine(failed));
    }
  } catch (e) {
    lines.push(`Halting failed part-way: ${(e as Error).message}. Check the channel flag and scheduled emails manually.`);
    console.error("[outreach] haltChannel error", e);
  } finally {
    lines.push("Fix it, then turn the channel back on in /dashboard/admin/outreach.");
    await alertFounder(`${c} halted: ${reason}`, lines);
  }
}

export async function runHealth(): Promise<{ alerts: string[]; paused: boolean }> {
  const now = new Date();
  const [settings, heartbeat, stats] = await Promise.all([
    getOutreachSettings(), getHeartbeat(), prismaRepo.negativeStats(addCalendarDays(now, -OUTREACH.autoPause.windowDays)),
  ]);
  const { alerts, pause } = checkHealth({ now, settings, heartbeat, stats });
  let stuck = 0;
  if (pause) await setOutreachFlag("enabled", false);
  // Backstop, independent of checkHealth: whenever sending is off, retry pulling back anything still scheduled.
  if (pause || !settings.enabled || !settings.channels.EMAIL) {
    stuck = (await cancelScheduledEmails(realDeps())).failed;
    if (stuck > 0) alerts.push(cancelFailureLine(stuck));
  }
  if (alerts.length) await alertFounder(pause ? "Auto-paused" : "Health warning", alerts);
  return { alerts, paused: pause };
}
