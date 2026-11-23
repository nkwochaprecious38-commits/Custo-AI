"use client";
import { useEffect, useMemo, useState } from "react";
import ResourcePage, { type Row } from "@/components/dashboard/ResourcePage";
import { DemoTag, Kpi, PageHeader, Spinner } from "@/components/dashboard/ui";
import { DEMO_PRODUCTS, DEMO_QUERIES, fmt, money } from "@/lib/demo";
import { expand, rank } from "@/lib/semantic";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useOrg } from "@/lib/dashboard/context";

export default function SearchPage() {
  const { orgId, dbReady } = useOrg();
  const [products, setProducts] = useState<any[] | null>(null); const [syn, setSyn] = useState<Row[]>([]); const [real, setReal] = useState<any[]>([]); const [q, setQ] = useState("comfortable shoes for walking");
  const [filters, setFilters] = useState({ category: "all", brand: "all", maxPrice: "" });
  useEffect(() => {
    if (!orgId || !dbReady) { setProducts(DEMO_PRODUCTS); return; }
    const sb = supabaseBrowser();
    sb.from("products").select("id,name,price,category,brand,tags,description,inventory").eq("org_id", orgId).eq("status", "active").limit(1000).then(({ data }: any) => setProducts(data && data.length ? data : DEMO_PRODUCTS));
    sb.from("search_queries").select("query,results_count,clicked").eq("org_id", orgId).limit(2000).then(({ data }: any) => setReal(data || []));
  }, [orgId, dbReady]);
  const demoProducts = products === DEMO_PRODUCTS;
  const synMap = useMemo(() => { const m: Record<string, string[]> = {}; syn.forEach((s) => { m[String(s.term).toLowerCase()] = String(s.synonyms).split(",").map((x) => x.trim()).filter(Boolean); }); return m; }, [syn]);
  const cats = useMemo(() => Array.from(new Set((products || []).map((p) => p.category).filter(Boolean))), [products]);
  const brands = useMemo(() => Array.from(new Set((products || []).map((p) => p.brand).filter(Boolean))), [products]);
  const results = useMemo(() => rank(products || [], q, synMap).filter(({ item }) => (filters.category === "all" || item.category === filters.category) && (filters.brand === "all" || item.brand === filters.brand) && (!filters.maxPrice || Number(item.price) <= Number(filters.maxPrice))), [products, q, synMap, filters]);
  const ex = useMemo(() => expand(q, synMap), [q, synMap]);
  const suggestions = useMemo(() => (q.length < 2 ? [] : Array.from(new Set((products || []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase().split(" ").pop() || "")).map((p) => p.name))).slice(0, 4)), [q, products]);
  const hasReal = real.length > 0;
  const queries = hasReal ? Object.values(real.reduce((a: any, r) => { const k = r.query.toLowerCase(); a[k] ??= { query: k, searches: 0, clicks: 0, results: r.results_count }; a[k].searches++; a[k].clicks += r.clicked ? 1 : 0; a[k].results = r.results_count; return a; }, {})).map((x: any) => ({ ...x, ctr: x.clicks / x.searches })).sort((a: any, b: any) => b.searches - a.searches) as typeof DEMO_QUERIES : DEMO_QUERIES;
  const zero = queries.filter((x) => x.results === 0);
  const total = queries.reduce((t, x) => t + x.searches, 0);
  const ctr = total ? queries.reduce((t, x) => t + x.ctr * x.searches, 0) / total : 0;
  return (
    <>
      <PageHeader title="Search" text="Search activity, zero result tracking, synonyms, and a semantic search playground that runs on your catalog." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Searches" value={fmt(total)} sub={hasReal ? "Your data" : "Demo data"} /><Kpi label="Search click through rate" value={(ctr * 100).toFixed(1) + "%"} sub={hasReal ? "Your data" : "Demo data"} />
        <Kpi label="Zero result queries" value={String(zero.length)} sub={hasReal ? "Your data" : "Demo data"} /><Kpi label="Zero result share" value={total ? ((zero.reduce((t, x) => t + x.searches, 0) / total) * 100).toFixed(1) + "%" : "0%"} sub={hasReal ? "Your data" : "Demo data"} />
      </div>
      <section className="card mt-6 p-5">
        <div className="mb-3 flex items-center gap-2"><h2 className="text-lg font-bold">Semantic search playground</h2>{demoProducts && <DemoTag>Sample catalog</DemoTag>}</div>
        <p className="mb-4 text-sm text-muted">Try a natural language query. Matches come from product titles, tags, categories and the intent concepts behind each word. Add synonyms below to teach the search your vocabulary.</p>
        <div className="grid gap-3 sm:grid-cols-4"><input className="input sm:col-span-4" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search query" />
          <select className="input" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} aria-label="Category filter"><option value="all">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
          <select className="input" value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })} aria-label="Brand filter"><option value="all">All brands</option>{brands.map((c) => <option key={c}>{c}</option>)}</select>
          <input className="input" type="number" min={0} placeholder="Max price" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} aria-label="Maximum price" /></div>
        {suggestions.length > 0 && <p className="mt-3 text-xs text-muted">Suggestions: {suggestions.join(", ")}</p>}
        {ex.extra.length > 0 && <p className="mt-1 text-xs text-muted">Understood intent also covers: {ex.extra.slice(0, 10).join(", ")}</p>}
        {products === null ? <Spinner /> : results.length === 0 ? <p className="mt-6 rounded-xl bg-soft p-4 text-sm">No results for this query. In production, this would be recorded as a zero result search.</p> : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{results.slice(0, 9).map(({ item, score, why }) => (
            <li key={item.id} className="rounded-xl border border-charcoal/10 p-3.5"><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-muted">{item.category} · {item.brand} · {item.price != null ? money(Number(item.price)) : "No price"}</p>
              <p className="mt-2 text-[11px] text-teal">Relevance {score.toFixed(1)}: {why.join(", ")}</p></li>))}</ul>)}
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><div className="mb-3 flex items-center gap-2"><h2 className="text-base font-bold">Popular queries</h2>{!hasReal && <DemoTag />}</div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Query</th><th>Searches</th><th>CTR</th></tr></thead><tbody className="divide-y divide-charcoal/10">
            {queries.filter((x) => x.results > 0).slice(0, 8).map((x) => <tr key={x.query}><td className="py-2">{x.query}</td><td>{x.searches.toLocaleString()}</td><td>{(x.ctr * 100).toFixed(0)}%</td></tr>)}</tbody></table></div></section>
        <section className="card p-5"><div className="mb-3 flex items-center gap-2"><h2 className="text-base font-bold">Zero result searches</h2>{!hasReal && <DemoTag />}</div>
          {zero.length === 0 ? <p className="text-sm text-muted">No zero result searches recorded.</p> : <ul className="divide-y divide-charcoal/10 text-sm">{zero.map((x) => <li key={x.query} className="flex justify-between py-2"><span>{x.query}</span><span className="text-muted">{x.searches.toLocaleString()} searches</span></li>)}</ul>}
          <p className="mt-3 text-xs text-muted">Fix these with catalog tags, new products, or synonyms.</p></section>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Synonym management</h2>
      <ResourcePage table="search_synonyms" noun="Synonym" onRows={setSyn} emptyText="Map a shopper's word to the words your catalog uses, for example trainers to sneakers."
        fields={[{ key: "term", label: "Shopper term", required: true }, { key: "synonyms", label: "Synonyms", required: true, hint: "Separate with commas." }]} columns={[{ key: "term", label: "Term" }, { key: "synonyms", label: "Synonyms" }]} />
    </>
  );
}
