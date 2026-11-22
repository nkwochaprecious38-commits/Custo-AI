/** Map auth provider errors to clear, human messages. */
export function authMessage(err: { message?: string; code?: string; status?: number } | null | undefined): string {
  if (!err) return '';
  const m = (err.message || '').toLowerCase();
  const code = err.code || '';
  if (code === 'invalid_credentials' || m.includes('invalid login credentials')) return 'The email or password is incorrect. Check your details and try again.';
  if (code === 'email_not_confirmed' || m.includes('email not confirmed')) return 'Please verify your email address before logging in. Check your inbox for the verification link.';
  if (code === 'user_already_exists' || m.includes('already registered')) return 'An account with this email already exists. Log in or reset your password.';
  if (code === 'weak_password' || m.includes('password should')) return 'Choose a stronger password: at least 8 characters with letters and numbers.';
  if (code === 'over_email_send_rate_limit' || m.includes('rate limit') || err.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (code === 'same_password' || m.includes('different from the old')) return 'Your new password must be different from your current password.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'New registrations are currently disabled.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'We could not reach the server. Check your connection and try again.';
  if (code === 'validation_failed' || m.includes('invalid format') || m.includes('unable to validate email')) return 'Enter a valid email address.';
  return err.message || 'Something went wrong. Please try again.';
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function passwordIssues(p: string): string | null {
  if (p.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Include at least one letter and one number.';
  return null;
}

export function safeNext(next: string | null | undefined, fallback = '/app') {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}
