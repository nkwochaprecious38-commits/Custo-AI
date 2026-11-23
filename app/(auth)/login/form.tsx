"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import AuthShell, { Alert, Field } from "@/components/auth/Shell";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailOk, friendlyAuthError } from "@/lib/auth-errors";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackError = params.get("error");
  const reset = params.get("reset");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState(callbackError ? friendlyAuthError(callbackError) : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "").trim().toLowerCase();
    const password = String(f.get("password") || "");
    const remember = !!f.get("remember");
    const errs: typeof errors = {};
    if (!emailOk(email)) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!isSupabaseConfigured) { setFormError("Authentication is not configured on this server yet."); return; }

    setLoading(true);
    // Remember me off: the middleware keeps auth cookies as browser session cookies.
    document.cookie = remember ? "custo_session_only=; Max-Age=0; Path=/; SameSite=Lax" : "custo_session_only=1; Path=/; SameSite=Lax";
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); setFormError(friendlyAuthError(error.message, error.code)); return; }
    const next = params.get("next");
    router.replace(next && next.startsWith("/dashboard") ? next : "/dashboard");
    router.refresh();
  }

  return (
    <AuthShell title="Log in to Custo AI" subtitle="Welcome back. Enter your details to open your workspace."
      footer={<>New to Custo AI? <Link href="/signup" className="font-semibold text-teal underline">Create a workspace</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {reset && <Alert kind="success">Your password has been updated. Log in with the new password.</Alert>}
        {params.get("verified") && <Alert kind="success">Email verified. Log in to continue.</Alert>}
        {formError && <Alert kind="error">{formError}</Alert>}
        <Field id="email" label="Email" type="email" autoComplete="email" error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-teal" />Remember me</label>
          <Link href="/forgot-password" className="font-semibold text-teal underline">Forgot password?</Link>
        </div>
        <button className="btn-primary w-full !py-3" disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}{loading ? "Logging in" : "Log in"}</button>
      </form>
    </AuthShell>
  );
}
