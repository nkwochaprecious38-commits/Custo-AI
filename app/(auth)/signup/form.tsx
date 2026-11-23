"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import AuthShell, { Alert, Field } from "@/components/auth/Shell";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailOk, friendlyAuthError, normalizeUrl, passwordIssues } from "@/lib/auth-errors";

type Errors = Partial<Record<"name" | "email" | "company" | "website" | "password" | "confirm" | "terms", string>>;

export default function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const invitedEmail = params.get("email") || "";
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    const name = v("name"), email = v("email").toLowerCase(), company = v("company"), website = v("website");
    const password = String(f.get("password") || ""), confirm = String(f.get("confirm") || "");
    const errs: Errors = {};
    if (name.length < 2) errs.name = "Enter your full name.";
    if (!emailOk(email)) errs.email = "Enter a valid work email address.";
    if (company.length < 2) errs.company = "Enter your company name.";
    const url = normalizeUrl(website);
    if (!url) errs.website = "Enter a valid website or store URL, for example mystore.com.";
    const pw = passwordIssues(password); if (pw) errs.password = pw;
    if (!errs.password && password !== confirm) errs.confirm = "Passwords do not match.";
    if (!f.get("terms")) errs.terms = "Please accept the terms and conditions to continue.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!isSupabaseConfigured) { setFormError("Authentication is not configured on this server yet."); return; }

    setLoading(true);
    const { data, error } = await supabaseBrowser().auth.signUp({
      email, password,
      options: { data: { full_name: name, company, website: url }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    setLoading(false);
    if (error) { setFormError(friendlyAuthError(error.message, error.code)); return; }
    // Supabase returns an empty identities list when the email is already registered (to avoid account enumeration).
    if (data.user && data.user.identities && data.user.identities.length === 0) { setFormError(friendlyAuthError("already registered")); return; }
    if (data.session) { router.replace("/dashboard"); router.refresh(); return; }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email">
        <div className="card p-6">
          <MailCheck className="text-teal" size={28} />
          <p className="mt-4 text-sm leading-relaxed">We sent a verification link to <b>{sentTo}</b>. Open it to confirm your address and finish creating your workspace. The link opens your dashboard.</p>
          <p className="mt-3 text-xs text-muted">No email after a few minutes? Check spam, or <button className="font-semibold text-teal underline" onClick={() => setSentTo("")}>try again</button>.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your Custo AI workspace" subtitle="Set up your organization in a minute. No store connection needed to look around."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-teal underline">Log in</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert kind="error">{formError}</Alert>}
        <Field id="name" label="Full name" autoComplete="name" error={errors.name} />
        <Field id="email" label="Work email" type="email" autoComplete="email" defaultValue={invitedEmail} readOnly={!!invitedEmail} error={errors.email} hint={invitedEmail ? "Use the invited email to join your team's workspace." : undefined} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="company" label="Company name" autoComplete="organization" error={errors.company} />
          <Field id="website" label="Website or store URL" placeholder="mystore.com" autoComplete="url" error={errors.website} />
        </div>
        <Field id="password" label="Password" type="password" autoComplete="new-password" error={errors.password} hint="At least 8 characters with a letter and a number." />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm} />
        <div>
          <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 accent-teal" aria-invalid={!!errors.terms} />
            <span>I agree to the terms and conditions and the privacy policy.</span></label>
          {errors.terms && <p className="mt-1.5 text-xs text-danger">{errors.terms}</p>}
        </div>
        <button className="btn-primary w-full !py-3" disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}{loading ? "Creating workspace" : "Create workspace"}</button>
      </form>
    </AuthShell>
  );
}
