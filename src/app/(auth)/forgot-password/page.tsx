'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { getSupabase } from '@/lib/supabase/client';
import { EMAIL_RE, authMessage } from '../authErrors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) { setFieldError('Enter a valid email address.'); return; }
    setFieldError('');
    setLoading(true);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    // Rate limits and network errors are shown; otherwise respond the same way whether or not the account exists.
    if (error && (error.status === 429 || /rate|fetch|network/i.test(error.message))) { setError(authMessage(error)); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-soft text-teal"><MailCheck className="h-7 w-7" /></div>
        <h1 className="mt-6 font-display text-3xl font-extrabold">Check your email</h1>
        <p className="mt-3 text-muted">If an account exists for <span className="font-semibold text-charcoal">{email.trim()}</span>, you will receive a link to reset your password shortly.</p>
        <Link href="/login" className="link mt-6 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to log in</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-muted">Enter the email you use for Custo AI and we will send you a reset link.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Email" htmlFor="email" error={fieldError}>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldError} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
      </form>
      <Link href="/login" className="link mt-6 inline-flex items-center gap-1 text-sm"><ArrowLeft className="h-4 w-4" /> Back to log in</Link>
    </>
  );
}
