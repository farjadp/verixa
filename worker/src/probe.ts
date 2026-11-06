export class CheckpointError extends Error {
  override name = "CheckpointError";
}

export interface ProbeCheck {
  name: string;
  run: () => Promise<string | void>;
}
export interface ProbeRow {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
}

/** Runs read-only checks in order and renders a table. A checkpoint (error named CheckpointError) skips the rest. */
export async function runProbe(checks: ProbeCheck[]): Promise<{ ok: boolean; rows: ProbeRow[]; text: string }> {
  const rows: ProbeRow[] = [];
  let stop = false;
  for (const c of checks) {
    if (stop) {
      rows.push({ name: c.name, status: "SKIP", detail: "skipped after checkpoint" });
      continue;
    }
    try {
      rows.push({ name: c.name, status: "PASS", detail: (await c.run()) || "" });
    } catch (e) {
      const err = e as Error;
      if (err.name === "CheckpointError") stop = true;
      rows.push({ name: c.name, status: "FAIL", detail: err.message });
    }
  }
  const w = Math.max(4, ...rows.map((r) => r.name.length));
  const text = rows.map((r) => `${r.status.padEnd(4)}  ${r.name.padEnd(w)}  ${r.detail}`.trimEnd()).join("\n");
  return { ok: rows.every((r) => r.status === "PASS"), rows, text };
}
