"use client";
import { useMemo, useState } from "react";
import { DemoTag, Kpi, PageHeader } from "@/components/dashboard/ui";
import { BarsChart, TrendChart } from "@/components/dashboard/charts";
import { DEMO_CAMPAIGNS, DEMO_PRODUCTS, DEMO_QUERIES, DEMO_SEGMENTS, buildSeries, fmt, money, sum, seeded } from "@/lib/demo";

const delta = (cur: number, prev: number) => { if (!prev) return ""; const d = ((cur - prev) / prev) * 100; return `${d >= 0 ? "+" : ""}${d.toFixed(1)}% vs previous period`; };

export default function Analytics() {
  const [days, setDays] = useState(30); const [campaign, setCampaign] = useState("all"); const [category, setCategory] = useState("all"); const [compare, setCompare] = useState(true); const [pq, setPq] = useState("");
  const s = useMemo(() => buildSeries(days, campaign, category), [days, campaign, category]);
  const v = sum(s, "visitors"), pv = sum(s, "prevVisitors"), o = sum(s, "orders"), rev = sum(s, "revenue"), prev = sum(s, "prevRevenue");
  const cats = Array.from(new Set(DEMO_PRODUCTS.map((p) => p.category)));
  const products = useMemo(() => DEMO_PRODUCTS.filter((p) => (category === "all" || p.category === category) && p.name.toLowerCase().includes(pq.toLowerCase())).map((p) => { const r = seeded(p.name.length * days + 3); const f = days / 30; return { ...p, views: Math.round(p.views * f), carts: Math.round(p.carts * f), purchases: Math.round(p.carts * f * (0.35 + r() * 0.2)) }; }), [category, pq, days]);
  const funnel = [{ step: "Views", n: sum(s, "views") }, { step: "Rec clicks", n: sum(s, "recClicks") }, { step: "Add to cart", n: sum(s, "carts") }, { step: "Purchases", n: o }];
  const camps = DEMO_CAMPAIGNS.filter((c) => campaign === "all" || c.name === campaign);
  return (
    <>
      <PageHeader title="Analytics" text="Customer behavior, product performance, recommendation engagement, search activity and campaign results." actions={<DemoTag />} />
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div><label className="label" htmlFor="rng">Date range</label><select id="rng" className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></div>
        <div><label className="label" htmlFor="cmp">Campaign</label><select id="cmp" className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)}><option value="all">All campaigns</option>{DEMO_CAMPAIGNS.map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="cat">Product category</label><select id="cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
        <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="accent-teal" />Compare with previous period</label>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Store traffic" value={fmt(v)} sub={compare ? delta(v, pv) : undefined} /><Kpi label="Product views" value={fmt(sum(s, "views"))} /><Kpi label="Add to cart events" value={fmt(sum(s, "carts"))} /><Kpi label="Purchases" value={fmt(o)} />
        <Kpi label="Conversion rate" value={((o / v) * 100).toFixed(2) + "%"} /><Kpi label="Average order value" value={money(rev / o)} /><Kpi label="Revenue" value={money(rev)} sub={compare ? delta(rev, prev) : undefined} /><Kpi label="Recommendation clicks" value={fmt(sum(s, "recClicks"))} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-3 text-base font-bold">Store traffic</h2><TrendChart area data={s} keys={[{ key: "visitors", color: "#0F5257", name: "Visitors" }, ...(compare ? [{ key: "prevVisitors", color: "#61575C", name: "Previous period", dashed: true }] : [])]} /></section>
        <section className="card p-5"><h2 className="mb-3 text-base font-bold">Revenue trend</h2><TrendChart data={s} keys={[{ key: "revenue", color: "#FF66BF", name: "Revenue" }, ...(compare ? [{ key: "prevRevenue", color: "#61575C", name: "Previous period", dashed: true }] : [])]} /></section>
        <section className="card p-5"><h2 className="mb-3 text-base font-bold">Shopping funnel</h2><BarsChart data={funnel} x="step" keys={[{ key: "n", color: "#0F5257", name: "Events" }]} /></section>
        <section className="card p-5"><h2 className="mb-3 text-base font-bold">Customer segment performance</h2><BarsChart data={DEMO_SEGMENTS} x="name" layout="vertical" keys={[{ key: "conversion", color: "#FF66BF", name: "Conversion rate %" }]} /></section>
      </div>
      <section className="card mt-4 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 p-5"><h2 className="text-base font-bold">Product performance</h2><input className="input !w-56" placeholder="Filter products" value={pq} onChange={(e) => setPq(e.target.value)} aria-label="Filter products" /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead className="bg-soft/70 text-left text-xs uppercase text-muted"><tr><th className="px-5 py-3">Product</th><th>Views</th><th>Add to cart</th><th>Purchases</th><th>Cart rate</th></tr></thead><tbody className="divide-y divide-charcoal/10">
          {products.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No products match.</td></tr> : products.map((p) => <tr key={p.id}><td className="px-5 py-2.5 font-medium">{p.name}</td><td>{fmt(p.views)}</td><td>{fmt(p.carts)}</td><td>{fmt(p.purchases)}</td><td>{((p.carts / p.views) * 100).toFixed(1)}%</td></tr>)}</tbody></table></div></section>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-3 text-base font-bold">Campaign and recommendation performance</h2><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Campaign</th><th>Clicks</th><th>Revenue</th></tr></thead><tbody className="divide-y divide-charcoal/10">{camps.map((c) => <tr key={c.name}><td className="py-2.5">{c.name}</td><td>{fmt(Math.round((c.clicks * days) / 30))}</td><td>{money(Math.round((c.revenue * days) / 30))}</td></tr>)}</tbody></table></section>
        <section className="card p-5"><h2 className="mb-3 text-base font-bold">Search performance</h2><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Query</th><th>Searches</th><th>CTR</th></tr></thead><tbody className="divide-y divide-charcoal/10">{DEMO_QUERIES.slice(0, 6).map((q) => <tr key={q.query}><td className="py-2.5">{q.query}</td><td>{fmt(Math.round((q.searches * days) / 30))}</td><td>{q.results ? Math.round(q.ctr * 100) + "%" : "No results"}</td></tr>)}</tbody></table></section>
      </div>
    </>
  );
}
