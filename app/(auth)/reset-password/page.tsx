"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AuthShell, { Alert, Field } from "@/components/auth/Shell";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { friendlyAuthError, passwordIssues } from "@/lib/auth-errors";

export default function ResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [errs, setErrs] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured) { setReady(false); return; }
    supabaseBrowser().auth.getSession().then(({ data }: any) => setReady(!!data.session));
  }, []);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") || ""), confirm = String(f.get("confirm") || "");
    const n: typeof errs = {};
    const pw = passwordIssues(password); if (pw) n.password = pw; else if (password !== confirm) n.confirm = "Passwords do not match.";
    setErrs(n); if (Object.keys(n).length) return;
    setLoading(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.updateUser({ password });
    if (error) { setLoading(false); setError(friendlyAuthError(error.message, error.code)); return; }
    await sb.auth.signOut();
    router.replace("/login?reset=1");
  }
  return (
    <AuthShell title="Choose a new password">
      {ready === null ? <p className="text-sm text-muted">Checking your reset link...</p> : !ready ? (
        <div className="space-y-4"><Alert kind="error">This reset link is invalid or has expired.</Alert><Link href="/forgot-password" className="btn-dark">Request a new link</Link></div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field id="password" label="New password" type="password" autoComplete="new-password" error={errs.password} hint="At least 8 characters with a letter and a number." />
          <Field id="confirm" label="Confirm new password" type="password" autoComplete="new-password" error={errs.confirm} />
          <button className="btn-primary w-full !py-3" disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}Update password</button>
        </form>)}
    </AuthShell>
  );
}
