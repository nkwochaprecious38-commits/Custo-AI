'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { getSupabase, setRememberPreference } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { EMAIL_RE, authMessage, safeNext } from '../authErrors';
import { PasswordInput } from '../PasswordInput';

const NOTICES: Record<string, ['success' | 'info' | 'error' | 'warning', string]> = {
  verified: ['success', 'Your email is verified. Log in to open your workspace.'],
  reset: ['success', 'Your password has been updated. Log in with your new password.'],
  signed_out: ['info', 'You have been logged out.'],
  link: ['error', 'That link is invalid or has expired. If you were verifying your email, try logging in. Otherwise request a new link.'],
  config: ['warning', 'Authentication is not configured yet. Add the Supabase environment variables to enable log in.'],
  session: ['info', 'Your session has ended. Please log in again.'],
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const notice = NOTICES[params.get('error') ?? params.get('notice') ?? ''];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(''); setUnconfirmed(false);
    const errs: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = 'Enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!isSupabaseConfigured) { setServerError(NOTICES.config[1]); return; }
    setLoading(true);
    try {
      setRememberPreference(remember);
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        setServerError(authMessage(error));
        setUnconfirmed(error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message));
        return;
      }
      router.replace(safeNext(params.get('next')));
      router.refresh();
    } catch (err) {
      setServerError(authMessage(err as Error));
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResend('sending');
    const { error } = await getSupabase().auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app` } });
    setResend(error ? 'error' : 'sent');
  }

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-muted">Log in to your Custo AI workspace.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        {notice && !serverError && <Alert tone={notice[0]}>{notice[1]}</Alert>}
        {serverError && (
          <Alert tone="error">
            {serverError}
            {unconfirmed && (
              <div className="mt-2">
                {resend === 'sent' ? <span className="font-semibold">A new verification email has been sent.</span>
                  : resend === 'error' ? <span>Could not resend right now. Try again shortly.</span>
                  : <button type="button" onClick={resendVerification} className="font-semibold underline" disabled={resend === 'sending'}>{resend === 'sending' ? 'Sending' : 'Resend verification email'}</button>}
              </div>
            )}
          </Alert>
        )}
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} placeholder="you@yourstore.com" />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
        </Field>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded accent-teal" /> Remember me
          </label>
          <Link href="/forgot-password" className="link text-sm">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>{loading ? 'Logging in' : 'Log in'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">New to Custo AI? <Link href="/signup" className="link">Create an account</Link></p>
    </>
  );
}
