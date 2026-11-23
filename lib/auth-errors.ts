export function friendlyAuthError(message: string | undefined, code?: string): string {
  const m = (message || "").toLowerCase();
  const c = (code || "").toLowerCase();
  if (c === "invalid_credentials" || m.includes("invalid login")) return "The email or password is incorrect. Check both and try again, or reset your password.";
  if (c === "email_not_confirmed" || m.includes("not confirmed")) return "Your email address has not been verified yet. Open the verification email we sent and follow the link, then log in.";
  if (c === "user_already_exists" || m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Log in instead, or reset your password.";
  if (c === "weak_password" || m.includes("password should")) return "That password is too weak. Use at least 8 characters with a mix of letters and numbers.";
  if (c.includes("rate_limit") || m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("same password") || c === "same_password") return "Choose a password that is different from your current one.";
  if (m.includes("failed to fetch") || m.includes("network")) return "We could not reach the authentication service. Check your connection and try again.";
  if (m.includes("signups not allowed") || c === "signup_disabled") return "New sign ups are currently disabled for this workspace.";
  if (m.includes("expired") || m.includes("invalid") && m.includes("token")) return "This link has expired or was already used. Request a new one.";
  return message || "Something went wrong. Please try again.";
}
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export function normalizeUrl(v: string): string | null {
  const t = v.trim(); if (!t) return null;
  try { const u = new URL(/^https?:\/\//i.test(t) ? t : "https://" + t); return u.hostname.includes(".") ? u.toString() : null; } catch { return null; }
}
export function passwordIssues(p: string): string | null {
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return "Password must include at least one letter and one number.";
  return null;
}
