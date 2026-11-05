/** Only same-site relative paths; blocks open redirects like //evil.com or /\evil.com. */
export function safeCallbackPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || /[\r\n]/.test(value)) return fallback;
  return value;
}

export function loginErrorMessage(code: string | null | undefined): string {
  if (!code) return "";
  if (code === "CredentialsSignin") return "Incorrect email or password.";
  if (code.startsWith("Too many")) return code;
  return "We couldn't sign you in. Please try again.";
}
