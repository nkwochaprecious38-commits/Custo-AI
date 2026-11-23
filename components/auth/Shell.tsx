import Link from "next/link";
import Logo from "@/components/Logo";
import { AlertTriangle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" aria-label="Back to Custo AI home"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          {!isSupabaseConfigured && (
            <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
              <p>Authentication is not configured on this server yet. Set <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart. See the README.</p>
            </div>
          )}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
        </div>
      </div>
      <aside className="hidden bg-charcoal p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <p className="eyebrow !text-pink">Custo AI</p>
        <p className="mt-3 max-w-md font-heading text-3xl font-extrabold leading-tight !text-white">Turn Customer Insights Into Better Shopping Experiences.</p>
        <p className="mt-4 max-w-md text-sm text-white/60">Your workspace keeps each organization&apos;s stores, catalog and campaigns separate.</p>
      </aside>
    </div>
  );
}

export function Field({ label, id, error, hint, ...rest }: { label: string; id: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={id} className={`input ${error ? "!border-danger" : ""}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...rest} />
      {error ? <p id={`${id}-err`} className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const cls = kind === "error" ? "border-danger/40 bg-danger/10" : kind === "success" ? "border-success/40 bg-success/10" : "border-teal/30 bg-teal-light";
  return <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border p-3.5 text-sm ${cls}`}>{children}</div>;
}
