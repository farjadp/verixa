// Pure helpers behind the integration test's "never the live database" guard. Not a test file itself.

/** Lowercased hostname with `-pooler` removed, so an endpoint's pooled and direct hosts compare equal. */
export function normalizeHost(url: string): string {
  try {
    const host = new URL(url.replace(/^postgres(ql)?:/, "http:")).hostname.toLowerCase();
    return host.replace(/-pooler(?=\.)/, "");
  } catch {
    return "";
  }
}

const URL_ASSIGNMENT = /^\s*(?:export\s+)?[A-Za-z0-9_]+\s*=\s*["']?(postgres(?:ql)?:\/\/[^"'\s]+)/gm;

/** Hosts of every postgres URL assigned in a dotenv-style text, whatever the variable is called. Comments are ignored. */
export function hostsInEnvText(text: string): string[] {
  return [...text.matchAll(URL_ASSIGNMENT)].map((m) => normalizeHost(m[1])).filter(Boolean);
}

/**
 * Returns a message when any target URL resolves to a host that appears in the project's env files or process env
 * (apart from the OUTREACH_IT_* variables themselves); null when it is safe to proceed.
 */
export function findLiveConflict(targets: string[], envFiles: Record<string, string>, processEnv: Record<string, string | undefined>): string | null {
  const targetHosts = targets.map(normalizeHost);
  if (targetHosts.some((h) => !h)) return "Refusing to run: could not parse a target database URL.";
  for (const [file, text] of Object.entries(envFiles)) {
    const hit = hostsInEnvText(text).find((h) => targetHosts.includes(h));
    if (hit) return `Refusing to run: ${file} already points at host ${hit}. Use a separate Neon branch.`;
  }
  for (const [key, value] of Object.entries(processEnv)) {
    if (key.startsWith("OUTREACH_IT_") || !value || !/^postgres(ql)?:\/\//.test(value)) continue;
    const h = normalizeHost(value);
    if (h && targetHosts.includes(h)) return `Refusing to run: ${key} in the environment already points at host ${h}.`;
  }
  return null;
}
