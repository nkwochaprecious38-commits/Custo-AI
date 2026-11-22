'use client';
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Alert, Badge, Button, Card, LoadingBlock, Select, Tabs, labelize } from '@/components/ui';
import { DataSourceNote, PageHeader, RangeSelect, SectionCard, StatCard, delta, useSummary } from '@/components/app/common';
import { BarsChart, TrendChart } from '@/components/app/charts';
import { getSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/org';
import { fmtMoney, fmtNum, fmtPct, ratio } from '@/lib/format';
import { useEffect } from 'react';

type Seg = { id: string; name: string; customers: number; orders: number; revenue: number; avg_spent: number };

export default function AnalyticsPage() {
  const { org } = useOrg();
  const [range, setRange] = useState('30');
  const [compare, setCompare] = useState(true);
  const [tab, setTab] = useState<'overview' | 'products' | 'recommendations' | 'search' | 'segments'>('overview');
  const [productFilter, setProductFilter] = useState(''); const [campaignFilter, setCampaignFilter] = useState('');
  const { data, loading, error } = useSummary(Number(range));
  const [segs, setSegs] = useState<Seg[]>([]);
  useEffect(() => { getSupabase().rpc('segment_performance', { p_org: org.id }).then(({ data }) => setSegs((data as Seg[]) ?? [])); }, [org.id]);

  const cur = data?.cur, prev = data?.prev;
  const funnel = useMemo(() => cur ? [['Visitors', cur.totals.visitors], ['Product views', cur.totals.product_views], ['Add to cart', cur.totals.add_to_carts], ['Orders', cur.totals.orders]].map(([name, value]) => ({ name: name as string, value: value as number })) : [], [cur]);
  const products = useMemo(() => (cur?.top_products ?? []).filter((p) => !productFilter || p.id === productFilter), [cur, productFilter]);
  const campaigns = useMemo(() => (cur?.campaigns ?? []).filter((c) => !campaignFilter || c.id === campaignFilter), [cur, campaignFilter]);

  function exportCsv() {
    if (!cur) return;
    const lines = ['date,visitors,product_views,add_to_carts,recommendation_clicks,orders,revenue', ...cur.daily.map((d) => [d.date, d.visitors, d.product_views, d.add_to_carts, d.rec_clicks, d.orders, d.revenue].join(','))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = `custo-analytics-${range}d.csv`; a.click();
  }

  const t = cur?.totals, p = prev?.totals;
  const d = (k: string) => (compare && t && p ? delta(t[k], p[k]) : undefined);
  const conv = t ? ratio(t.orders, t.visitors) : 0, convP = p ? ratio(p.orders, p.visitors) : 0;
  const mergedDaily = useMemo(() => cur ? cur.daily.map((x, i) => ({ ...x, prev_visitors: compare ? prev?.daily[i]?.visitors ?? 0 : undefined, prev_revenue: compare ? prev?.daily[i]?.revenue ?? 0 : undefined })) : [], [cur, prev, compare]);

  return (
    <>
      <PageHeader title="Analytics" description="Customer behavior, product performance, recommendations, search and campaign results."
        actions={<><RangeSelect value={range} onChange={setRange} /><label className="flex items-center gap-2 rounded-full border border-charcoal/15 bg-white px-3 text-sm"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="accent-teal" /> Compare to previous period</label><Button variant="secondary" onClick={exportCsv} disabled={!cur}><Download className="h-4 w-4" /> Export CSV</Button></>} />
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      <DataSourceNote flags={cur?.flags} />
      {loading || !cur || !t || !p ? <LoadingBlock /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <StatCard label="Store traffic" value={fmtNum(t.visitors)} delta={d('visitors')} accent="teal" />
            <StatCard label="Product views" value={fmtNum(t.product_views)} delta={d('product_views')} />
            <StatCard label="Product clicks" value={fmtNum(t.product_clicks)} delta={d('product_clicks')} />
            <StatCard label="Add to cart events" value={fmtNum(t.add_to_carts)} delta={d('add_to_carts')} />
            <StatCard label="Purchases" value={fmtNum(t.orders)} delta={d('orders')} />
            <StatCard label="Conversion rate" value={fmtPct(conv, 2)} delta={compare ? delta(conv, convP) : undefined} accent="pink" />
            <StatCard label="Average order value" value={fmtMoney(ratio(t.revenue, t.orders))} delta={compare ? delta(ratio(t.revenue, t.orders), ratio(p.revenue, p.orders)) : undefined} />
            <StatCard label="Revenue" value={fmtMoney(t.revenue)} delta={d('revenue')} />
            <StatCard label="Attributed revenue" value={fmtMoney(t.attributed_revenue)} hint="Orders linked to recommendation campaigns" />
            <StatCard label="Recommendation CTR" value={fmtPct(ratio(t.rec_clicks, t.rec_impressions), 2)} delta={compare ? delta(ratio(t.rec_clicks, t.rec_impressions), ratio(p.rec_clicks, p.rec_impressions)) : undefined} />
          </div>
          <div className="mt-6"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'products', label: 'Products' }, { id: 'recommendations', label: 'Recommendations' }, { id: 'search', label: 'Search' }, { id: 'segments', label: 'Segments' }]} /></div>
          <div className="mt-5 space-y-5">
            {tab === 'overview' && <>
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Traffic" description={compare ? 'Visitors compared with the previous period' : 'Daily unique sessions'}><TrendChart data={mergedDaily} series={compare ? [{ key: 'visitors', name: 'This period' }, { key: 'prev_visitors', name: 'Previous period', color: '#61575C' }] : [{ key: 'visitors', name: 'Visitors' }]} type="line" /></SectionCard>
                <SectionCard title="Revenue trend" description={compare ? 'Revenue compared with the previous period' : 'Daily order revenue'}><TrendChart data={mergedDaily} series={compare ? [{ key: 'revenue', name: 'This period' }, { key: 'prev_revenue', name: 'Previous period', color: '#61575C' }] : [{ key: 'revenue', name: 'Revenue' }]} format={(v) => fmtMoney(v)} type="line" /></SectionCard>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Conversion funnel" description="From visit to purchase">
                  <div className="space-y-3">{funnel.map((f, i) => (
                    <div key={f.name}><div className="flex justify-between text-sm"><span>{f.name}</span><span className="tabular-nums">{fmtNum(f.value)}{i > 0 && <span className="ml-2 text-xs text-muted">{fmtPct(ratio(f.value, funnel[i - 1].value))} of previous step</span>}</span></div>
                      <div className="mt-1 h-3 rounded-full bg-soft"><div className="h-3 rounded-full bg-[#1A8088]" style={{ width: `${Math.max(1.5, ratio(f.value, funnel[0].value) * 100)}%` }} /></div></div>))}</div>
                </SectionCard>
                <SectionCard title="Sessions by device"><BarsChart data={cur.devices} x="device" series={[{ key: 'sessions', name: 'Sessions' }]} /></SectionCard>
              </div>
            </>}
            {tab === 'products' && <>
              <div className="flex justify-end"><Select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="!w-auto" aria-label="Product filter"><option value="">All top products</option>{(cur.top_products).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</Select></div>
              <SectionCard title="Top products" description="Views, clicks, add to cart events and purchases">
                <div className="overflow-x-auto -mx-5"><table className="w-full min-w-[640px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-muted"><th className="px-5 pb-2">Product</th><th className="px-3 pb-2 text-right">Views</th><th className="px-3 pb-2 text-right">Clicks</th><th className="px-3 pb-2 text-right">Add to cart</th><th className="px-3 pb-2 text-right">Cart rate</th><th className="px-5 pb-2 text-right">Purchases</th></tr></thead>
                  <tbody className="divide-y divide-charcoal/5">{products.map((x) => <tr key={x.id}><td className="px-5 py-2.5"><div className="font-medium">{x.title}</div><div className="text-xs text-muted">{x.category}</div></td><td className="px-3 text-right tabular-nums">{fmtNum(x.views)}</td><td className="px-3 text-right tabular-nums">{fmtNum(x.clicks)}</td><td className="px-3 text-right tabular-nums">{fmtNum(x.add_to_carts)}</td><td className="px-3 text-right tabular-nums">{fmtPct(ratio(x.add_to_carts, x.views))}</td><td className="px-5 text-right tabular-nums">{fmtNum(x.purchases)}</td></tr>)}</tbody></table></div>
              </SectionCard>
              <SectionCard title="Category performance"><BarsChart data={cur.categories} x="category" series={[{ key: 'views', name: 'Views' }, { key: 'add_to_carts', name: 'Add to cart' }]} /></SectionCard>
            </>}
            {tab === 'recommendations' && <>
              <div className="flex justify-end"><Select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="!w-auto" aria-label="Campaign filter"><option value="">All campaigns</option>{cur.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
              <SectionCard title="Recommendation campaign performance" description="Click through rate measures engagement. Attributed revenue counts orders linked to the campaign and is not proof of causation.">
                <div className="overflow-x-auto -mx-5"><table className="w-full min-w-[680px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-muted"><th className="px-5 pb-2">Campaign</th><th className="px-3 pb-2">Type</th><th className="px-3 pb-2">Status</th><th className="px-3 pb-2 text-right">Impressions</th><th className="px-3 pb-2 text-right">Clicks</th><th className="px-3 pb-2 text-right">CTR</th><th className="px-5 pb-2 text-right">Attributed revenue</th></tr></thead>
                  <tbody className="divide-y divide-charcoal/5">{campaigns.map((c) => <tr key={c.id}><td className="px-5 py-2.5 font-medium">{c.name}</td><td className="px-3">{labelize(c.rec_type)}</td><td className="px-3"><Badge>{labelize(c.status)}</Badge></td><td className="px-3 text-right tabular-nums">{fmtNum(c.impressions)}</td><td className="px-3 text-right tabular-nums">{fmtNum(c.clicks)}</td><td className="px-3 text-right tabular-nums">{c.impressions ? fmtPct(ratio(c.clicks, c.impressions), 2) : 'n/a'}</td><td className="px-5 text-right tabular-nums">{fmtMoney(c.attributed_revenue)}</td></tr>)}</tbody></table></div>
              </SectionCard>
              <SectionCard title="Clicks by campaign"><BarsChart horizontal data={campaigns} x="name" series={[{ key: 'impressions', name: 'Impressions' }, { key: 'clicks', name: 'Clicks' }]} height={Math.max(200, campaigns.length * 60)} /></SectionCard>
            </>}
            {tab === 'search' && <div className="grid gap-5 xl:grid-cols-2">
              <SectionCard title="Search performance"><dl className="grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-soft/70 p-3"><dt className="text-xs text-muted">Searches</dt><dd className="font-display text-xl font-extrabold">{fmtNum(cur.search.total)}</dd></div><div className="rounded-xl bg-soft/70 p-3"><dt className="text-xs text-muted">Click rate</dt><dd className="font-display text-xl font-extrabold">{fmtPct(ratio(cur.search.with_click, cur.search.total))}</dd></div><div className="rounded-xl bg-soft/70 p-3"><dt className="text-xs text-muted">No results</dt><dd className="font-display text-xl font-extrabold">{fmtPct(ratio(cur.search.zero_results, cur.search.total))}</dd></div></dl></SectionCard>
              <SectionCard title="Top queries"><BarsChart horizontal data={cur.search.top_queries} x="query" series={[{ key: 'searches', name: 'Searches' }]} height={Math.max(220, cur.search.top_queries.length * 32)} /></SectionCard>
            </div>}
            {tab === 'segments' && <SectionCard title="Customer segment performance" description="Lifetime values of customers in each segment">
              {segs.length === 0 ? <p className="text-sm text-muted">No segments yet.</p> : <><BarsChart data={segs} x="name" series={[{ key: 'customers', name: 'Customers' }]} />
                <div className="mt-4 overflow-x-auto -mx-5"><table className="w-full min-w-[560px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-muted"><th className="px-5 pb-2">Segment</th><th className="px-3 pb-2 text-right">Customers</th><th className="px-3 pb-2 text-right">Orders</th><th className="px-3 pb-2 text-right">Revenue</th><th className="px-5 pb-2 text-right">Avg spent</th></tr></thead>
                  <tbody className="divide-y divide-charcoal/5">{segs.map((s) => <tr key={s.id}><td className="px-5 py-2.5 font-medium">{s.name}</td><td className="px-3 text-right tabular-nums">{fmtNum(s.customers)}</td><td className="px-3 text-right tabular-nums">{fmtNum(s.orders)}</td><td className="px-3 text-right tabular-nums">{fmtMoney(s.revenue)}</td><td className="px-5 text-right tabular-nums">{fmtMoney(s.avg_spent)}</td></tr>)}</tbody></table></div></>}
            </SectionCard>}
          </div>
        </>
      )}
    </>
  );
}
