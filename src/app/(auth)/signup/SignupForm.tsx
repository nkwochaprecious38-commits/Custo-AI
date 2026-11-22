'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { getSupabase, setRememberPreference } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { EMAIL_RE, authMessage, passwordIssues } from '../authErrors';
import { PasswordInput, PasswordStrength } from '../PasswordInput';

type Errors = Partial<Record<'fullName' | 'email' | 'company' | 'website' | 'password' | 'confirm' | 'terms', string>>;

function normalizeUrl(v: string) {
  const t = v.trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteToken = params.get('invite');
  const inviteEmail = params.get('email') ?? '';
  const [form, setForm] = useState({ fullName: '', email: inviteEmail, company: '', website: '', password: '', confirm: '', terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function validate(): Errors {
    const e: Errors = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid work email address.';
    if (!inviteToken) {
      if (form.company.trim().length < 2) e.company = 'Enter your company name.';
      const url = normalizeUrl(form.website);
      try {
        if (!url) throw new Error();
        const u = new URL(url);
        if (!u.hostname.includes('.')) throw new Error();
      } catch { e.website = 'Enter a valid website or store URL, for example yourstore.com.'; }
    }
    const pw = passwordIssues(form.password);
    if (pw) e.password = pw;
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match.';
    if (!form.terms) e.terms = 'You need to accept the terms to create an account.';
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!isSupabaseConfigured) { setServerError('Authentication is not configured. Add your Supabase URL and anon key to the environment.'); return; }
    setLoading(true);
    try {
      setRememberPreference(true);
      const email = form.email.trim().toLowerCase();
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
          data: {
            full_name: form.fullName.trim(),
            company_name: inviteToken ? undefined : form.company.trim(),
            website: inviteToken ? undefined : normalizeUrl(form.website),
            invite_token: inviteToken ?? undefined,
          },
        },
      });
      if (error) { setServerError(authMessage(error)); return; }
      // With email confirmation enabled, an existing address returns a user without identities.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setServerError('An account with this email already exists. Log in or reset your password.');
        return;
      }
      if (data.session) { router.replace('/app'); router.refresh(); return; }
      setSentTo(email);
    } catch (err) {
      setServerError(authMessage(err as Error));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!sentTo) return;
    setResendState('sending');
    const { error } = await getSupabase().auth.resend({ type: 'signup', email: sentTo, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app` } });
    setResendState(error ? 'error' : 'sent');
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pink-soft text-[#9b1f67]"><MailCheck className="h-7 w-7" /></div>
        <h1 className="mt-6 font-display text-3xl font-extrabold">Check your inbox</h1>
        <p className="mt-3 text-muted">We sent a verification link to <span className="font-semibold text-charcoal">{sentTo}</span>. Open it to activate your Custo AI workspace.</p>
        <div className="mt-6 space-y-3">
          {resendState === 'sent' && <Alert tone="success">A new verification email is on its way.</Alert>}
          {resendState === 'error' && <Alert tone="error">We could not resend the email right now. Please wait a minute and try again.</Alert>}
          <Button variant="secondary" className="w-full" onClick={resend} loading={resendState === 'sending'}>Resend verification email</Button>
          <p className="text-sm text-muted">Already verified? <Link href="/login" className="link">Log in</Link></p>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{inviteToken ? 'Join your team on Custo AI' : 'Create your Custo AI workspace'}</h1>
      <p className="mt-2 text-muted">{inviteToken ? 'You have been invited to a workspace. Create your account to accept.' : 'Start personalizing your store. No credit card required to explore.'}</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        {serverError && <Alert tone="error">{serverError} {serverError.includes('already exists') && <><Link href="/login" className="font-semibold underline">Log in</Link> or <Link href="/forgot-password" className="font-semibold underline">reset your password</Link>.</>}</Alert>}
        <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
          <Input id="fullName" autoComplete="name" value={form.fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName} placeholder="Alex Morgan" />
        </Field>
        <Field label="Work email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} placeholder="alex@yourstore.com" readOnly={!!inviteToken && !!inviteEmail} />
        </Field>
        {!inviteToken && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="company" error={errors.company}>
              <Input id="company" autoComplete="organization" value={form.company} onChange={set('company')} aria-invalid={!!errors.company} placeholder="Your Store Inc." />
            </Field>
            <Field label="Website or store URL" htmlFor="website" error={errors.website}>
              <Input id="website" inputMode="url" autoComplete="url" value={form.website} onChange={set('website')} aria-invalid={!!errors.website} placeholder="yourstore.com" />
            </Field>
          </div>
        )}
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-invalid={!!errors.password} placeholder="At least 8 characters" />
          <PasswordStrength value={form.password} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
          <PasswordInput id="confirm" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
        </Field>
        <div>
          <label className="flex items-start gap-2.5 text-sm text-muted">
            <input type="checkbox" checked={form.terms} onChange={set('terms')} className="mt-0.5 h-4 w-4 rounded border-charcoal/30 accent-teal" aria-invalid={!!errors.terms} />
            <span>I agree to the <Link href="/terms" target="_blank" className="link">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="link">Privacy Policy</Link>.</span>
          </label>
          {errors.terms && <p className="mt-1 text-xs font-medium text-danger" role="alert">{errors.terms}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>{loading ? 'Creating account' : 'Create account'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/login" className="link">Log in</Link></p>
    </>
  );
}
