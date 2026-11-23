"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Kpi, PageHeader, DemoTag, StatusBadge } from "@/components/dashboard/ui";
import { BarsChart, TrendChart } from "@/components/dashboard/charts";
import { DEMO_CAMPAIGNS, DEMO_PRODUCTS, DEMO_QUERIES, DEMO_SEGMENTS, buildSeries, fmt, money, sum } from "@/lib/demo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useOrg } from "@/lib/dashboard/context";

type Activity = { id: string; action: string; entity: string; created_at: string; details: any };

export default function Overview() {
  const { orgId, dbReady, fullName, orgName } = useOrg();
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [stores, setStores] = useState<number | null>(null);
  const s = useMemo(() => buildSeries(30, "all", "all"), []);
  useEffect(() => {
    if (!orgId || !dbReady) { setActivity([]); return; }
    const sb = supabaseBrowser();
    sb.from("audit_logs").select("id, action, entity, created_at, details").eq("org_id", orgId).order("created_at", { ascending: false }).limit(8).then(({ data }: any) => setActivity((data as Activity[]) || []));
    Promise.all(["rec_campaigns", "content_campaigns", "campaigns"].map((t) => sb.from(t).select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "active"))).then((r) => setActive(r.reduce((t, x) => t + (x.count || 0), 0)));
    sb.from("stores").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "connected").then(({ count }: any) => setStores(count || 0));
  }, [orgId, dbReady]);
  const visitors = sum(s, "visitors"), orders = sum(s, "orders"), revenue = sum(s, "revenue");
  const top = [...DEMO_PRODUCTS].sort((a, b) => b.carts - a.carts).slice(0, 5);
  return (
    <>
      <PageHeader title={`Welcome${fullName ? `, ${fullName.split(" ")[0]}` : ""}`} text={`Overview for ${orgName}.`} actions={<Link href="/dashboard/stores" className="btn-primary">Connect a store</Link>} />
      <div className="mb-6 flex gap-3 rounded-xl border border-teal/25 bg-teal-light p-4 text-sm"><Info size={18} className="mt-0.5 shrink-0 text-teal" />
        <p>The figures on this page are <b>demo data</b>. {stores ? `${stores} store connected, but behavioral event collection is not set up yet, so metrics stay as demo data.` : "Connect a store to import your catalog."} Campaign and store counts below come from your real records.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Total store visitors" value={fmt(visitors)} sub="Last 30 days, demo data" />
        <Kpi label="Product views" value={fmt(sum(s, "views"))} sub="Last 30 days, demo data" />
        <Kpi label="Recommendation clicks" value={fmt(sum(s, "recClicks"))} sub="Last 30 days, demo data" />
        <Kpi label="Conversion rate" value={((orders / visitors) * 100).toFixed(2) + "%"} sub="Demo data" />
        <Kpi label="Average order value" value={money(revenue / orders)} sub="Demo data" />
        <Kpi label="Attributed revenue" value={money(revenue)} sub="Demo data" />
        <Kpi label="Active campaigns" value={active === null ? "..." : String(active)} sub="Your records" />
        <Kpi label="Connected stores" value={stores === null ? "..." : String(stores)} sub="Your records" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Visitors and recommendation clicks</h2><DemoTag /></div>
          <TrendChart area data={s} keys={[{ key: "visitors", color: "#0F5257", name: "Visitors" }, { key: "recClicks", color: "#FF66BF", name: "Recommendation clicks" }]} /></section>
        <section className="card p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Customer segments</h2><DemoTag /></div>
          <BarsChart layout="vertical" data={DEMO_SEGMENTS} x="name" keys={[{ key: "members", color: "#0F5257", name: "Shoppers" }]} height={260} /></section>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Top performing products</h2><DemoTag /></div>
          <ul className="divide-y divide-charcoal/10 text-sm">{top.map((p) => <li key={p.id} className="flex justify-between py-2.5"><span className="truncate pr-3">{p.name}</span><span className="font-semibold text-teal">{fmt(p.carts)} adds</span></li>)}</ul></section>
        <section className="card p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Search performance</h2><DemoTag /></div>
          <ul className="divide-y divide-charcoal/10 text-sm">{DEMO_QUERIES.slice(0, 5).map((q) => <li key={q.query} className="flex justify-between py-2.5"><span className="truncate pr-3">{q.query}</span><span className="text-muted">{q.results === 0 ? "No results" : `${Math.round(q.ctr * 100)}% CTR`}</span></li>)}</ul></section>
        <section className="card p-5"><h2 className="mb-3 text-base font-bold">Recent activity</h2>
          {activity === null ? <p className="text-sm text-muted">Loading...</p> : activity.length === 0 ? <p className="text-sm text-muted">No activity yet. Actions you take in the workspace are recorded here.</p> :
            <ul className="divide-y divide-charcoal/10 text-sm">{activity.map((a) => <li key={a.id} className="py-2.5"><p className="font-medium">{a.action.replace(/[._]/g, " ")}</p><p className="text-xs text-muted">{a.details?.name ? `${a.details.name} · ` : ""}{new Date(a.created_at).toLocaleString()}</p></li>)}</ul>}</section>
      </div>
      <section className="card mt-4 p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Campaign performance</h2><DemoTag /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Campaign</th><th>Type</th><th>Clicks</th><th>Attributed revenue</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-charcoal/10">{DEMO_CAMPAIGNS.map((c) => <tr key={c.name}><td className="py-2.5 font-medium">{c.name}</td><td>{c.type}</td><td>{fmt(c.clicks)}</td><td>{money(c.revenue)}</td><td><StatusBadge value={c.status} /></td></tr>)}</tbody></table></div></section>
    </>
  );
}
