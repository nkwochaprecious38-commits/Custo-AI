"use client";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import AuthShell, { Alert, Field } from "@/components/auth/Shell";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailOk, friendlyAuthError } from "@/lib/auth-errors";

export default function ForgotPassword() {
  const [error, setError] = useState(""); const [fieldErr, setFieldErr] = useState("");
  const [sent, setSent] = useState(""); const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const email = String(new FormData(e.currentTarget).get("email") || "").trim().toLowerCase();
    if (!emailOk(email)) { setFieldErr("Enter a valid email address."); return; }
    setFieldErr("");
    if (!isSupabaseConfigured) { setError("Authentication is not configured on this server yet."); return; }
    setLoading(true);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setLoading(false);
    if (error) { setError(friendlyAuthError(error.message, error.code)); return; }
    setSent(email);
  }
  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we will send you a reset link." footer={<Link href="/login" className="font-semibold text-teal underline">Back to log in</Link>}>
      {sent ? <Alert kind="success">If an account exists for <b>{sent}</b>, a reset link is on its way. The link expires after a short time.</Alert> : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field id="email" label="Email" type="email" autoComplete="email" error={fieldErr} />
          <button className="btn-primary w-full !py-3" disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}Send reset link</button>
        </form>)}
    </AuthShell>
  );
}
