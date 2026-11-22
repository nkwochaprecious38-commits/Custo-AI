'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react';
import { Badge, Card, DemoBadge, Select, cn } from '@/components/ui';
import { getSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/org';

export function PageHeader({ title, description, actions, badge }: { title: string; description?: string; actions?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>{badge}</div>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, delta, hint, accent }: { label: string; value: string; delta?: number | null; hint?: string; accent?: 'pink' | 'teal' }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted sm:text-sm">{label}</span>{accent && <span className={cn('h-2 w-2 rounded-full', accent === 'pink' ? 'bg-pink' : 'bg-teal')} />}</div>
      <div className="mt-2 font-display text-xl font-extrabold tracking-tight sm:text-2xl">{value}</div>
      {typeof delta === 'number' && Number.isFinite(delta) ? (
        <div className={cn('mt-1 inline-flex items-center gap-0.5 text-xs font-semibold', delta >= 0 ? 'text-success' : 'text-danger')}>
          {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(delta * 100).toFixed(1)}% <span className="font-normal text-muted">vs previous period</span>
        </div>
      ) : hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </Card>
  );
}

export const RANGES = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '60', label: 'Last 60 days' },
  { id: '90', label: 'Last 90 days' },
];
export function RangeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Date range" className="!w-auto !py-2">
      {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
    </Select>
  );
}

export function rangeDates(days: number, offset = 0) {
  const to = new Date(Date.now() - offset * days * 86400000);
  to.setHours(23, 59, 59, 999);
  const from = new Date(to.getTime() - days * 86400000 + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export type Summary = {
  totals: Record<string, number>;
  daily: { date: string; visitors: number; product_views: number; add_to_carts: number; rec_clicks: number; orders: number; revenue: number }[];
  top_products: { id: string; title: string; price: number; category: string | null; image_url: string | null; views: number; clicks: number; add_to_carts: number; purchases: number }[];
  search: { total: number; zero_results: number; with_click: number; top_queries: { query: string; searches: number; avg_results: number; clicks: number }[]; zero_queries: { query: string; searches: number }[] };
  campaigns: { id: string; name: string; rec_type: string; placement: string; status: string; impressions: number; clicks: number; attributed_revenue: number }[];
  categories: { category: string; views: number; add_to_carts: number; purchases: number }[];
  devices: { device: string; sessions: number }[];
  flags: { has_sample: boolean; has_live: boolean; connected_stores: number };
};

/** Loads the analytics summary for the current range and the previous period for comparison. */
export function useSummary(days: number) {
  const { org } = useOrg();
  const [data, setData] = useState<{ cur: Summary; prev: Summary } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const s = getSupabase();
    const a = rangeDates(days), b = rangeDates(days, 1);
    const [cur, prev] = await Promise.all([
      s.rpc('analytics_summary', { p_org: org.id, p_from: a.from, p_to: a.to }),
      s.rpc('analytics_summary', { p_org: org.id, p_from: b.from, p_to: b.to }),
    ]);
    if (cur.error || prev.error) setError((cur.error ?? prev.error)!.message);
    else setData({ cur: cur.data as Summary, prev: prev.data as Summary });
    setLoading(false);
  }, [org.id, days]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load };
}

export const delta = (a: number, b: number) => (b > 0 ? (a - b) / b : null);

export function DataSourceNote({ flags }: { flags?: Summary['flags'] }) {
  if (!flags) return null;
  if (flags.has_sample && !flags.has_live) {
    return (
      <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-warning/30 bg-[#fdf6e9] px-4 py-3 text-sm text-[#6d470c] sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span><b>You are viewing demo data.</b> These numbers come from a generated sample store. Connect your store to see live results.</span></span>
        <a href="/app/stores" className="shrink-0 font-semibold underline">Connect a store</a>
      </div>
    );
  }
  if (flags.has_sample && flags.has_live) return <div className="mb-5"><Badge tone="warning">Includes demo data alongside live data</Badge></div>;
  return null;
}

export function SectionCard({ title, description, actions, children, className, demo }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; demo?: boolean }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-charcoal/5 px-5 py-4">
        <div><div className="flex items-center gap-2"><h2 className="font-display text-base font-bold">{title}</h2>{demo && <DemoBadge />}</div>{description && <p className="mt-0.5 text-xs text-muted">{description}</p>}</div>
        {actions}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </Card>
  );
}

export const CHART = { series1: '#1A8088', series2: '#FF66BF', ink: '#211C1F', muted: '#61575C', grid: '#EBEDEE' };
