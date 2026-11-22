'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search as SearchIcon, Sparkles, Trash2, Pin } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Input, LoadingBlock, Select, Tabs, Toggle, useToast } from '@/components/ui';
import { DataSourceNote, PageHeader, RangeSelect, SectionCard, StatCard, delta, useSummary } from '@/components/app/common';
import { BarsChart } from '@/components/app/charts';
import { ProductArt } from '@/components/marketing/ProductArt';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import { useCatalog } from '@/lib/useCatalog';
import { runSearch, suggestions, type Synonym } from '@/lib/search';
import type { MerchRule } from '@/lib/types';
import { fmtMoney, fmtNum, fmtPct, ratio } from '@/lib/format';

export default function SearchPage() {
  const [tab, setTab] = useState<'analytics' | 'playground' | 'synonyms'>('analytics');
  return (
    <>
      <PageHeader title="Search" description="Understand what shoppers look for, test semantic search and manage synonyms." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'analytics', label: 'Search analytics' }, { id: 'playground', label: 'Search preview' }, { id: 'synonyms', label: 'Synonyms' }]} />
      <div className="mt-5">{tab === 'analytics' ? <Analytics /> : tab === 'playground' ? <Playground /> : <Synonyms />}</div>
    </>
  );
}

function Analytics() {
  const [range, setRange] = useState('30');
  const { data, loading, error } = useSummary(Number(range));
  if (loading || !data) return error ? <Alert tone="error">{error}</Alert> : <LoadingBlock />;
  const c = data.cur.search, p = data.prev.search;
  return (
    <>
      <div className="mb-4 flex justify-end"><RangeSelect value={range} onChange={setRange} /></div>
      <DataSourceNote flags={data.cur.flags} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Searches" value={fmtNum(c.total)} delta={delta(c.total, p.total)} accent="teal" />
        <StatCard label="Search click through rate" value={fmtPct(ratio(c.with_click, c.total))} delta={delta(ratio(c.with_click, c.total), ratio(p.with_click, p.total))} />
        <StatCard label="Zero result rate" value={fmtPct(ratio(c.zero_results, c.total))} hint={`${fmtNum(c.zero_results)} searches`} />
        <StatCard label="Searches per visitor" value={ratio(c.total, data.cur.totals.visitors).toFixed(2)} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Popular queries" description="Searches and clicks per query">
          <BarsChart horizontal data={c.top_queries} x="query" series={[{ key: 'searches', name: 'Searches' }, { key: 'clicks', name: 'Clicks' }]} height={Math.max(220, c.top_queries.length * 34)} />
        </SectionCard>
        <SectionCard title="Zero result searches" description="Queries where shoppers found nothing. Add synonyms or products to close the gap.">
          {c.zero_queries.length === 0 ? <p className="text-sm text-muted">No zero result searches in this period.</p> : (
            <table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase text-muted"><th className="pb-2">Query</th><th className="pb-2 text-right">Searches</th></tr></thead>
              <tbody className="divide-y divide-charcoal/5">{c.zero_queries.map((q) => <tr key={q.query}><td className="py-2">{q.query}</td><td className="py-2 text-right"><Badge tone="danger">{fmtNum(q.searches)}</Badge></td></tr>)}</tbody></table>
          )}
        </SectionCard>
        <SectionCard title="Query details" className="xl:col-span-2">
          <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left text-xs uppercase text-muted"><th className="pb-2">Query</th><th className="pb-2 text-right">Searches</th><th className="pb-2 text-right">Average results</th><th className="pb-2 text-right">Clicks</th><th className="pb-2 text-right">Click rate</th></tr></thead>
            <tbody className="divide-y divide-charcoal/5">{c.top_queries.map((q) => <tr key={q.query}><td className="py-2">{q.query}</td><td className="py-2 text-right tabular-nums">{fmtNum(q.searches)}</td><td className="py-2 text-right tabular-nums">{q.avg_results}</td><td className="py-2 text-right tabular-nums">{fmtNum(q.clicks)}</td><td className="py-2 text-right tabular-nums">{fmtPct(ratio(q.clicks, q.searches))}</td></tr>)}</tbody></table></div>
        </SectionCard>
      </div>
    </>
  );
}

function Playground() {
  const { org } = useOrg();
  const cat = useCatalog(30);
  const [q, setQ] = useState('comfortable shoes for walking');
  const [filters, setFilters] = useState({ category: '', brand: '', minPrice: '', maxPrice: '', inStock: false });
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [rules, setRules] = useState<MerchRule[]>([]);
  const [ai, setAi] = useState<{ terms: string[]; intent?: string | null; available?: boolean; error?: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [recentQ, setRecentQ] = useState<string[]>([]);
  useEffect(() => {
    const s = getSupabase();
    s.from('search_synonyms').select('terms, one_way').eq('org_id', org.id).then(({ data }) => setSynonyms(data ?? []));
    s.from('merchandising_rules').select('*').eq('org_id', org.id).eq('scope', 'search').then(({ data }) => setRules((data as MerchRule[]) ?? []));
    s.from('search_queries').select('query').eq('org_id', org.id).gt('results_count', 0).order('occurred_at', { ascending: false }).limit(300).then(({ data }) => setRecentQ([...new Set((data ?? []).map((r) => r.query.toLowerCase()))]));
  }, [org.id]);
  const res = useMemo(() => runSearch({ query: q, products: cat.products, categories: cat.categories, brands: cat.brands, synonyms, rules, perf: cat.perf, extraTerms: ai?.terms ?? [],
    filters: { category: filters.category || undefined, brand: filters.brand || undefined, minPrice: filters.minPrice ? Number(filters.minPrice) : null, maxPrice: filters.maxPrice ? Number(filters.maxPrice) : null, inStock: filters.inStock } }), [q, cat, synonyms, rules, filters, ai]);
  const sugg = useMemo(() => suggestions(q, cat.products, recentQ), [q, cat.products, recentQ]);

  async function understand() {
    setAiBusy(true);
    const r = await fetch('/api/search/understand', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ org_id: org.id, query: q }) });
    setAi(await r.json()); setAiBusy(false);
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit space-y-4 p-5">
        <h2 className="font-display font-bold">Filters</h2>
        <Field label="Category" htmlFor="fc"><Select id="fc" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All</option>{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Brand" htmlFor="fb"><Select id="fb" value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })}><option value="">All</option>{cat.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-2"><Field label="Min price" htmlFor="fmin"><Input id="fmin" inputMode="decimal" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} /></Field><Field label="Max price" htmlFor="fmax"><Input id="fmax" inputMode="decimal" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} /></Field></div>
        <div className="flex items-center justify-between text-sm"><span>In stock only</span><Toggle checked={filters.inStock} onChange={(v) => setFilters({ ...filters, inStock: v })} label="In stock only" /></div>
      </Card>
      <div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setAi(null); }} className="!h-12 !rounded-full pl-12 text-base" placeholder="Try a shopper query" aria-label="Search query" />
        </div>
        {sugg.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5 text-xs"><span className="text-muted">Autocomplete:</span>{sugg.map((s) => <button key={s} onClick={() => setQ(s)} className="rounded-full bg-white px-2.5 py-1 shadow-card hover:bg-soft">{s}</button>)}</div>}
        <Card className="mt-4 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><b>{fmtNum(res.total)} results.</b> {res.expandedTerms.length > 0 && <span className="text-muted">Semantic expansion added related terms:</span>}</div>
            <Button size="sm" variant="secondary" onClick={understand} loading={aiBusy} disabled={!q.trim()}><Sparkles className="h-4 w-4" /> AI query understanding</Button>
          </div>
          {res.expandedTerms.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{res.expandedTerms.slice(0, 20).map((t) => <Badge key={t} tone="teal">{t}</Badge>)}</div>}
          {ai && (ai.available === false ? <p className="mt-2 text-xs text-muted">AI query understanding is off. Add ANTHROPIC_API_KEY on the server to enable it. Built in concept expansion is still active.</p>
            : ai.error ? <p className="mt-2 text-xs text-danger">{ai.error}</p> : <p className="mt-2 text-xs text-muted">AI interpretation: {ai.intent}</p>)}
        </Card>
        {cat.loading ? <LoadingBlock /> : res.hits.length === 0 ? <Card className="mt-4 p-8 text-center text-sm text-muted">No products found. This query would be recorded as a zero result search.</Card> : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{res.hits.map((h) => (
            <Card key={h.product.id} className="p-2.5">
              <div className="relative aspect-square overflow-hidden rounded-xl"><ProductArt category={cat.categories.find((c) => c.id === h.product.category_id)?.name} image={h.product.image_url} />{h.pinned && <span className="absolute left-2 top-2 rounded-full bg-pink px-2 py-0.5 text-[10px] font-bold text-charcoal"><Pin className="inline h-3 w-3" /> Pinned</span>}</div>
              <div className="mt-2 line-clamp-2 text-sm font-medium">{h.product.title}</div>
              <div className="text-sm font-semibold">{fmtMoney(h.product.price)}</div>
              {h.matched.length > 0 && <div className="mt-1 text-[11px] text-muted">Matched: {h.matched.slice(0, 4).join(', ')}</div>}
            </Card>
          ))}</div>
        )}
      </div>
    </div>
  );
}

function Synonyms() {
  const { org, user, canEdit } = useOrg();
  const toast = useToast();
  const [items, setItems] = useState<{ id: string; terms: string[]; one_way: boolean }[] | null>(null);
  const [terms, setTerms] = useState(''); const [oneWay, setOneWay] = useState(false);
  const load = useCallback(async () => { const { data } = await getSupabase().from('search_synonyms').select('id, terms, one_way').eq('org_id', org.id).order('created_at', { ascending: false }); setItems(data ?? []); }, [org.id]);
  useEffect(() => { load(); }, [load]);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = [...new Set(terms.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))];
    if (t.length < 2) return toast('error', 'Enter at least two terms separated by commas.');
    const { data, error } = await getSupabase().from('search_synonyms').insert({ org_id: org.id, terms: t, one_way: oneWay }).select('id').single();
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'search.synonym_added', 'search_synonym', data.id, { name: t.join(', ') });
    setTerms(''); load(); toast('success', 'Synonym group added.');
  }
  async function del(id: string) { const { error } = await getSupabase().from('search_synonyms').delete().eq('id', id); if (error) toast('error', error.message); else load(); }
  return (
    <Card>
      {canEdit && <form onSubmit={add} className="flex flex-col gap-3 border-b border-charcoal/5 p-5 md:flex-row md:items-end">
        <div className="flex-1"><Field label="Synonym group" htmlFor="syn" hint="(comma separated)"><Input id="syn" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="tote, handbag, shoulder bag" /></Field></div>
        <label className="flex items-center gap-2 pb-2.5 text-sm"><Toggle checked={oneWay} onChange={setOneWay} label="One way" /> One way (first term expands to others)</label>
        <Button type="submit"><Plus className="h-4 w-4" /> Add</Button></form>}
      {!items ? <LoadingBlock /> : items.length === 0 ? <p className="p-8 text-center text-sm text-muted">No synonyms yet. Synonyms help zero result searches find relevant products.</p> : (
        <ul className="divide-y divide-charcoal/5">{items.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3"><div className="flex flex-wrap items-center gap-1">{s.terms.map((t) => <Badge key={t} tone="teal">{t}</Badge>)}{s.one_way && <span className="text-xs text-muted">one way</span>}</div>
            {canEdit && <button onClick={() => del(s.id)} className="text-muted hover:text-danger" aria-label="Delete synonym group"><Trash2 className="h-4 w-4" /></button>}</li>
        ))}</ul>
      )}
    </Card>
  );
}
