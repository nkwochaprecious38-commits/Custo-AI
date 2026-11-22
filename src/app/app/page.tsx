'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Activity, Search as SearchIcon } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, LoadingBlock, Skeleton, labelize } from '@/components/ui';
import { DataSourceNote, PageHeader, RangeSelect, SectionCard, StatCard, delta, useSummary } from '@/components/app/common';
import { TrendChart } from '@/components/app/charts';
import { ProductArt } from '@/components/marketing/ProductArt';
import { getSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/org';
import { fmtMoney, fmtNum, fmtPct, ratio, timeAgo } from '@/lib/format';

type Seg = { id: string; name: string; customers: number; revenue: number; total_customers: number };
type Log = { id: number; action: string; entity_type: string | null; created_at: string; details: Record<string, unknown> };

export default function OverviewPage() {
  const { org, profile, role } = useOrg();
  const [range, setRange] = useState('30');
  const { data, error, loading, reload } = useSummary(Number(range));
  const [segments, setSegments] = useState<Seg[] | null>(null);
  const [logs, setLogs] = useState<Log[] | null>(null);
  const canSeeAudit = ['org_admin', 'store_manager', 'analyst'].includes(role);

  useEffect(() => {
    const s = getSupabase();
    s.rpc('segment_performance', { p_org: org.id }).then(({ data }) => setSegments((data as Seg[]) ?? []));
    if (canSeeAudit) s.from('audit_logs').select('id, action, entity_type, created_at, details').eq('org_id', org.id).order('created_at', { ascending: false }).limit(8).then(({ data }) => setLogs((data as Log[]) ?? []));
  }, [org.id, canSeeAudit]);

  const first = profile?.full_name?.split(' ')[0];
  const c = data?.cur.totals, p = data?.prev.totals;
  const demo = !!data?.cur.flags.has_sample && !data?.cur.flags.has_live;
  const noData = data && !data.cur.flags.has_sample && !data.cur.flags.has_live;

  return (
    <>
      <PageHeader title={first ? `Welcome back, ${first}` : 'Overview'} description={`Performance for ${org.name}.`} actions={<RangeSelect value={range} onChange={setRange} />} />
      {error && <Alert tone="error" className="mb-5">Could not load analytics: {error} <button className="font-semibold underline" onClick={reload}>Retry</button></Alert>}
      <DataSourceNote flags={data?.cur.flags} />
      {noData && (
        <Card className="mb-6"><EmptyState icon={Activity} title="No store data yet" description="Connect a store or install the tracking snippet to start collecting product views, searches and orders. You can also load the demo dataset from Settings."
          action={<div className="flex gap-2"><Link href="/app/stores"><Button>Connect a store</Button></Link><Link href="/app/settings"><Button variant="secondary">Settings</Button></Link></div>} /></Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {loading || !c || !p ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-[112px]" />) : (
          <>
            <StatCard label="Store visitors" value={fmtNum(c.visitors)} delta={delta(c.visitors, p.visitors)} accent="teal" />
            <StatCard label="Product views" value={fmtNum(c.product_views)} delta={delta(c.product_views, p.product_views)} />
            <StatCard label="Recommendation clicks" value={fmtNum(c.rec_clicks)} delta={delta(c.rec_clicks, p.rec_clicks)} accent="pink" />
            <StatCard label="Conversion rate" value={fmtPct(ratio(c.orders, c.visitors), 2)} delta={delta(ratio(c.orders, c.visitors), ratio(p.orders, p.visitors))} />
            <StatCard label="Average order value" value={fmtMoney(ratio(c.revenue, c.orders))} delta={delta(ratio(c.revenue, c.orders), ratio(p.revenue, p.orders))} />
            <StatCard label="Revenue" value={fmtMoney(c.revenue)} delta={delta(c.revenue, p.revenue)} hint="From recorded orders" />
            <StatCard label="Active campaigns" value={fmtNum(c.active_campaigns)} hint="Recommendations, content and rules" />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <SectionCard title="Visitors and product views" description="Daily unique sessions and product detail views" className="xl:col-span-2" demo={demo}>
          {data ? <TrendChart data={data.cur.daily} series={[{ key: 'visitors', name: 'Visitors' }, { key: 'product_views', name: 'Product views' }]} /> : <LoadingBlock />}
        </SectionCard>
        <SectionCard title="Revenue" description={c ? `${fmtMoney(c.attributed_revenue)} attributed to recommendation campaigns` : 'Daily order revenue'} demo={demo}>
          {data ? <TrendChart data={data.cur.daily} series={[{ key: 'revenue', name: 'Revenue' }]} format={(v) => fmtMoney(v)} height={240} /> : <LoadingBlock />}
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <SectionCard title="Top performing products" description="Ranked by product views" className="xl:col-span-2" demo={demo} actions={<Link href="/app/analytics" className="link text-sm">Full report</Link>}>
          {!data ? <LoadingBlock /> : data.cur.top_products.length === 0 ? <p className="text-sm text-muted">No product activity in this period.</p> : (
            <div className="-mx-5 -my-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-muted"><th className="px-5 py-3">Product</th><th className="px-3 py-3 text-right">Views</th><th className="px-3 py-3 text-right">Clicks</th><th className="px-3 py-3 text-right">Add to cart</th><th className="px-5 py-3 text-right">Purchases</th></tr></thead>
                <tbody className="divide-y divide-charcoal/5">
                  {data.cur.top_products.slice(0, 6).map((t) => (
                    <tr key={t.id}><td className="px-5 py-2.5"><div className="flex items-center gap-3"><div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg"><ProductArt category={t.category} image={t.image_url} /></div><div className="min-w-0"><div className="truncate font-medium">{t.title}</div><div className="text-xs text-muted">{t.category}</div></div></div></td>
                      <td className="px-3 text-right tabular-nums">{fmtNum(t.views)}</td><td className="px-3 text-right tabular-nums">{fmtNum(t.clicks)}</td><td className="px-3 text-right tabular-nums">{fmtNum(t.add_to_carts)}</td><td className="px-5 text-right tabular-nums">{fmtNum(t.purchases)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
        <SectionCard title="Search performance" demo={demo} actions={<Link href="/app/search" className="link text-sm">Open search</Link>}>
          {!data ? <LoadingBlock /> : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-soft/70 p-3"><div className="text-xs text-muted">Searches</div><div className="font-display text-lg font-extrabold">{fmtNum(data.cur.search.total)}</div></div>
                <div className="rounded-xl bg-soft/70 p-3"><div className="text-xs text-muted">Click rate</div><div className="font-display text-lg font-extrabold">{fmtPct(ratio(data.cur.search.with_click, data.cur.search.total))}</div></div>
                <div className="rounded-xl bg-soft/70 p-3"><div className="text-xs text-muted">No results</div><div className="font-display text-lg font-extrabold text-danger">{fmtPct(ratio(data.cur.search.zero_results, data.cur.search.total))}</div></div>
              </div>
              <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Searches returning no results</h3>
              {data.cur.search.zero_queries.length === 0 ? <p className="text-sm text-muted">None in this period.</p> : (
                <ul className="space-y-1.5">{data.cur.search.zero_queries.slice(0, 5).map((q) => <li key={q.query} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><SearchIcon className="h-3.5 w-3.5 text-muted" />{q.query}</span><Badge tone="danger">{fmtNum(q.searches)}</Badge></li>)}</ul>
              )}
            </>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <SectionCard title="Customer segment insights" description="Customers and lifetime revenue per segment" demo={demo} actions={<Link href="/app/segments" className="link text-sm">Manage</Link>}>
          {!segments ? <LoadingBlock /> : segments.length === 0 ? <p className="text-sm text-muted">No segments yet.</p> : (
            <ul className="space-y-3">{segments.slice(0, 6).map((s) => (
              <li key={s.id}><div className="flex justify-between text-sm"><span className="font-medium">{s.name}</span><span className="tabular-nums text-muted">{fmtNum(s.customers)} customers</span></div>
                <div className="mt-1 h-2 rounded-full bg-soft"><div className="h-2 rounded-full bg-[#1A8088]" style={{ width: `${Math.max(2, ratio(s.customers, s.total_customers) * 100)}%` }} /></div>
                <div className="mt-0.5 text-xs text-muted">{fmtPct(ratio(s.customers, s.total_customers))} of customers · {fmtMoney(s.revenue)} lifetime revenue</div></li>
            ))}</ul>
          )}
        </SectionCard>
        <SectionCard title="Active recommendation campaigns" demo={demo} actions={<Link href="/app/recommendations" className="link text-sm">Manage</Link>}>
          {!data ? <LoadingBlock /> : data.cur.campaigns.length === 0 ? <p className="text-sm text-muted">No recommendation campaigns yet.</p> : (
            <ul className="divide-y divide-charcoal/5">{data.cur.campaigns.map((cp) => (
              <li key={cp.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><div className="truncate font-medium">{cp.name}</div><div className="text-xs text-muted">{labelize(cp.rec_type)} · {fmtNum(cp.clicks)} clicks</div></div><div className="text-right"><div className="font-semibold tabular-nums">{fmtPct(ratio(cp.clicks, cp.impressions))}</div><div className="text-xs text-muted">CTR</div></div></li>
            ))}</ul>
          )}
        </SectionCard>
        <SectionCard title="Recent activity">
          {!canSeeAudit ? <p className="text-sm text-muted">Activity history is available to admins, store managers and analysts.</p> : !logs ? <LoadingBlock /> : logs.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : (
            <ul className="space-y-3">{logs.map((l) => (
              <li key={l.id} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink" /><div><div className="font-medium">{labelize(l.action.replace('.', ' '))}{typeof l.details?.name === 'string' && <span className="font-normal text-muted">: {l.details.name as string}</span>}</div><div className="text-xs text-muted">{timeAgo(l.created_at)}</div></div></li>
            ))}</ul>
          )}
        </SectionCard>
      </div>
      <p className="mt-6 flex items-center gap-1 text-xs text-muted">Need a deeper view? <Link href="/app/analytics" className="link inline-flex items-center gap-1">Open analytics <ArrowRight className="h-3 w-3" /></Link></p>
    </>
  );
}
