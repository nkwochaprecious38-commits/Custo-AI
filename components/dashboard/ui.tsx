"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, X } from "lucide-react";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted" role="status"><Loader2 className="animate-spin" size={18} />{label}</div>;
}
export function PageHeader({ title, text, actions }: { title: string; text?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>{text && <p className="mt-1 max-w-2xl text-sm text-muted">{text}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function DemoTag({ children = "Demo data" }: { children?: ReactNode }) {
  return <span className="badge bg-warning/15 text-[#8a5a10]">{children}</span>;
}
const STATUS: Record<string, string> = {
  active: "bg-success/15 text-success", connected: "bg-success/15 text-success", running: "bg-success/15 text-success", accepted: "bg-success/15 text-success",
  paused: "bg-warning/15 text-[#8a5a10]", scheduled: "bg-teal-light text-teal", testing: "bg-teal-light text-teal", pending: "bg-warning/15 text-[#8a5a10]",
  draft: "bg-soft text-muted", not_connected: "bg-soft text-muted", archived: "bg-soft text-muted", completed: "bg-teal-light text-teal",
  error: "bg-danger/15 text-danger", revoked: "bg-danger/15 text-danger", out: "bg-danger/15 text-danger", low: "bg-warning/15 text-[#8a5a10]", in_stock: "bg-success/15 text-success",
};
export function StatusBadge({ value }: { value: string }) {
  return <span className={`badge capitalize ${STATUS[value] || "bg-soft text-muted"}`}>{value.replace(/_/g, " ")}</span>;
}
export function Kpi({ label, value, sub, demo }: { label: string; value: string; sub?: string; demo?: boolean }) {
  return (
    <div className="card p-4 sm:p-5"><p className="text-xs font-medium text-muted">{label}</p><p className="mt-1.5 font-heading text-2xl font-extrabold">{value}</p>
      {(sub || demo) && <p className="mt-1 text-xs text-muted">{sub}{demo && !sub ? "Demo data" : ""}</p>}</div>
  );
}
export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center gap-2 p-10 text-center"><p className="font-heading text-base font-bold">{title}</p>{text && <p className="max-w-sm text-sm text-muted">{text}</p>}{action && <div className="mt-2">{action}</div>}</div>;
}
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h); ref.current?.focus();
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="sticky top-0 flex items-center justify-between border-b border-charcoal/10 bg-white px-5 py-4"><h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-soft"><X size={18} /></button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
export function Confirm({ title, text, confirmLabel = "Confirm", danger, busy, onConfirm, onCancel }: { title: string; text: string; confirmLabel?: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-muted">{text}</p>
      <div className="mt-6 flex justify-end gap-2"><button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}{confirmLabel}</button></div>
    </Modal>
  );
}
type Toast = { id: number; kind: "success" | "error" | "info"; text: string };
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random(); setItems((i) => [...i, { id, kind, text }]);
    setTimeout(() => setItems((i) => i.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>{children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-xl border border-charcoal/10 bg-white p-3.5 text-sm shadow-card">
            {t.kind === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" /> : t.kind === "error" ? <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" /> : <Info size={18} className="mt-0.5 shrink-0 text-teal" />}
            <p>{t.text}</p></div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export function ErrorBox({ message }: { message: string }) {
  const missing = /does not exist|PGRST205|schema cache/i.test(message);
  return (
    <div role="alert" className="m-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
      <p className="font-semibold">{missing ? "Database tables are not set up yet" : "Something went wrong"}</p>
      <p className="mt-1 text-muted">{missing ? "Run supabase/schema.sql in your Supabase SQL editor, then reload this page." : message}</p>
    </div>
  );
}
