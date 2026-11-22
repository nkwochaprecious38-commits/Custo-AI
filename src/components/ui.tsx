'use client';

import Link from 'next/link';
import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';

import { buttonClass, cn, labelize, type BtnVariant, btnSizes } from './styles';
export { buttonClass, cn, labelize };

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: keyof typeof btnSizes; loading?: boolean }>(
  function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) {
    return (
      <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);

export function ButtonLink({ href, variant = 'primary', size = 'md', className, children, external }: { href: string; variant?: BtnVariant; size?: keyof typeof btnSizes; className?: string; children: ReactNode; external?: boolean }) {
  if (external) return <a href={href} className={buttonClass(variant, size, className)} rel="noopener noreferrer">{children}</a>;
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>;
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-charcoal/10 bg-white shadow-card', className)} {...props}>{children}</div>;
}

const badgeTones = {
  neutral: 'bg-soft text-muted',
  pink: 'bg-pink-soft text-[#9b1f67]',
  teal: 'bg-teal-soft text-teal',
  success: 'bg-[#e3f3ed] text-success',
  warning: 'bg-[#fbf0dc] text-[#8a5a10]',
  danger: 'bg-[#fae5e5] text-danger',
  dark: 'bg-charcoal text-white',
};
export function Badge({ tone = 'neutral', children, className }: { tone?: keyof typeof badgeTones; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', badgeTones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, keyof typeof badgeTones> = {
    active: 'success', connected: 'success', running: 'success', accepted: 'success', granted: 'success',
    draft: 'neutral', not_connected: 'neutral', not_configured: 'neutral', inactive: 'neutral', unknown: 'neutral',
    paused: 'warning', pending: 'warning', scheduled: 'teal',
    error: 'danger', revoked: 'danger', denied: 'danger', archived: 'neutral', completed: 'dark',
  };
  return <Badge tone={map[status] ?? 'neutral'}>{labelize(status)}</Badge>;
}


export function DemoBadge() {
  return <Badge tone="warning" className="uppercase tracking-wide">Demo data</Badge>;
}

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-charcoal">
      {children}
      {hint && <span className="ml-1 font-normal text-muted">{hint}</span>}
    </label>
  );
}

const fieldClass = 'block w-full rounded-xl border border-charcoal/15 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-muted/70 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:bg-soft aria-[invalid=true]:border-danger';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(fieldClass, className)} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(fieldClass, 'min-h-[90px]', className)} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return <select ref={ref} className={cn(fieldClass, 'pr-8', className)} {...p}>{children}</select>;
});

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor} hint={hint}>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-danger" role="alert">{error}</p>}
    </div>
  );
}

export function Alert({ tone = 'info', children, className }: { tone?: 'info' | 'success' | 'warning' | 'error'; children: ReactNode; className?: string }) {
  const styles = {
    info: ['bg-teal-soft text-teal border-teal/20', Info],
    success: ['bg-[#e3f3ed] text-success border-success/20', CheckCircle2],
    warning: ['bg-[#fbf0dc] text-[#7a4f0d] border-warning/30', AlertTriangle],
    error: ['bg-[#fae5e5] text-danger border-danger/20', XCircle],
  } as const;
  const [cls, Icon] = styles[tone];
  return (
    <div className={cn('flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm', cls, className)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-muted', className)} aria-label="Loading" />;
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <Spinner /> {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-soft', className)} />;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon?: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-mauve text-charcoal"><Icon className="h-6 w-6" /></div>}
      <h3 className="font-display text-lg font-bold text-charcoal">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title" className={cn('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-lift sm:rounded-2xl', widths[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-charcoal/10 px-5 py-4 sm:px-6">
          <div>
            <h2 id="modal-title" className="font-display text-lg font-bold text-charcoal">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-soft" aria-label="Close dialog"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-charcoal/10 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

type ConfirmOpts = { title: string; message: string; confirmLabel?: string; tone?: 'danger' | 'primary' };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
type Toast = { id: number; tone: 'success' | 'error' | 'info'; message: string };
const ToastCtx = createContext<(tone: Toast['tone'], message: string) => void>(() => {});

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((tone: Toast['tone'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirm({ ...o, resolve })), []);
  const close = (v: boolean) => { confirm?.resolve(v); setConfirm(null); };

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={ask}>
        {children}
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={cn('pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lift', t.tone === 'error' ? 'bg-danger text-white' : t.tone === 'success' ? 'bg-charcoal text-white' : 'bg-teal text-white')}>
              {t.tone === 'error' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : t.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pink" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
              <span className="flex-1">{t.message}</span>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss"><X className="h-4 w-4 opacity-70" /></button>
            </div>
          ))}
        </div>
        <Modal open={!!confirm} onClose={() => close(false)} title={confirm?.title ?? ''} size="sm"
          footer={<><Button variant="secondary" onClick={() => close(false)}>Cancel</Button><Button variant={confirm?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>{confirm?.confirmLabel ?? 'Confirm'}</Button></>}>
          <p className="text-sm text-muted">{confirm?.message}</p>
        </Modal>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
export const useConfirm = () => useContext(ConfirmCtx);

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-charcoal/10 px-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn('-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition', value === t.id ? 'border-pink text-charcoal' : 'border-transparent text-muted hover:text-charcoal')}>
          {t.label}{typeof t.count === 'number' && <span className="ml-1.5 rounded-full bg-soft px-1.5 text-xs text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead><tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-muted">{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-charcoal/5">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50', checked ? 'bg-teal' : 'bg-charcoal/20')}>
      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow transition', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}
