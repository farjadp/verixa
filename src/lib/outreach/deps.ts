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
  };
}

async function alertFounder(subject: string, lines: string[]): Promise<void> {
  const to = process.env.OUTREACH_ALERT_EMAIL;
  if (!to) {
    console.error(`[outreach] OUTREACH_ALERT_EMAIL unset; alert dropped: ${subject} — ${lines.join(" | ")}`);
    return;
  }
  await sendEmail({ to, subject: `[Verixa outreach] ${subject}`, html: lines.map((l) => `<p>${l.replace(/</g, "&lt;")}</p>`).join(""), type: "OUTREACH_ALERT" });
}

export async function haltChannel(c: Channel, reason: string, detail: string): Promise<void> {
  await setOutreachFlag(c, false);
  if (c === "EMAIL") await cancelScheduledEmails(realDeps());
  await alertFounder(`${c} halted: ${reason}`, [`The ${c} channel was turned off automatically.`, detail, "Fix it, then turn the channel back on in /dashboard/admin/outreach."]);
}

export async function runHealth(): Promise<{ alerts: string[]; paused: boolean }> {
  const now = new Date();
  const [settings, heartbeat, stats] = await Promise.all([
    getOutreachSettings(), getHeartbeat(), prismaRepo.negativeStats(addCalendarDays(now, -OUTREACH.autoPause.windowDays)),
  ]);
  const { alerts, pause } = checkHealth({ now, settings, heartbeat, stats });
  if (pause) {
    await setOutreachFlag("enabled", false);
    await cancelScheduledEmails(realDeps());
  }
  if (alerts.length) await alertFounder(pause ? "Auto-paused" : "Health warning", alerts);
  return { alerts, paused: pause };
}
