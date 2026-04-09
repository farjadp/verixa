"use server";

import { logSystemEvent } from "@/lib/logger";

export async function logClientError(action: string, errorMsg: string, stack?: string) {
  await logSystemEvent(action, { error: errorMsg, stack });
}
