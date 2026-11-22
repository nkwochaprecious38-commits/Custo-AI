'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { Alert, Button, Field, LoadingBlock } from '@/components/ui';
import { getSupabase } from '@/lib/supabase/client';
import { authMessage, passwordIssues } from '../authErrors';
import { PasswordInput, PasswordStrength } from '../PasswordInput';

function ResetPasswordInner() {
  const router = useRouter();
  const invited = useSearchParams().get('invited') === '1';
  const [ready, setReady] = useState<'checking' | 'ok' | 'missing'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => setReady(data.user ? 'ok' : 'missing'));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const errs: typeof errors = {};
    const p = passwordIssues(password);
    if (p) errs.password = p;
    if (confirm !== password) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setLoading(false); setError(authMessage(error)); return; }
    if (invited) { router.replace('/app'); return; }
    await supabase.auth.signOut();
    router.replace('/login?notice=reset');
  }

  if (ready === 'checking') return <LoadingBlock label="Checking your reset link" />;
  if (ready === 'missing') {
    return (
      <>
        <h1 className="font-display text-3xl font-extrabold">Reset link expired</h1>
        <p className="mt-3 text-muted">This password reset link is invalid or has expired. Request a new one to continue.</p>
        <Link href="/forgot-password" className="mt-6 inline-block"><Button>Request a new link</Button></Link>
      </>
    );
  }
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{invited ? 'Set your password' : 'Choose a new password'}</h1>
      <p className="mt-2 text-muted">Use at least 8 characters with letters and numbers.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="New password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
          <PasswordStrength value={password} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" error={errors.confirm}>
          <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Update password</Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordInner /></Suspense>;
}
