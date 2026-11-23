"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DEMO_PRODUCTS, DEMO_SEGMENTS, buildSeries, fmt, money, sum } from "@/lib/demo";

export default function DashboardPreview() {
  const s = buildSeries(30, "all", "all");
  const visitors = sum(s, "visitors"), orders = sum(s, "orders"), revenue = sum(s, "revenue");
  const kpis = [
    ["Store visitors", fmt(visitors)], ["Recommendation clicks", fmt(sum(s, "recClicks"))],
    ["Conversion rate", ((orders / visitors) * 100).toFixed(2) + "%"], ["Average order value", money(revenue / orders)],
  ];
  const top = [...DEMO_PRODUCTS].sort((a, b) => b.carts - a.carts).slice(0, 4);
  return (
    <div className="card overflow-hidden" aria-label="Custo AI dashboard preview with sample data">
      <div className="flex items-center justify-between border-b border-charcoal/10 bg-charcoal px-4 py-2.5">
        <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-pink" /><i className="h-2.5 w-2.5 rounded-full bg-white/30" /><i className="h-2.5 w-2.5 rounded-full bg-white/30" /></div>
        <span className="rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-medium text-white/80">Sample data</span>
      </div>
      <div className="grid gap-4 bg-soft/50 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(([l, v]) => (
            <div key={l} className="rounded-xl bg-white p-3.5 shadow-card"><p className="text-[11px] font-medium text-muted">{l}</p><p className="mt-1 font-heading text-xl font-extrabold">{v}</p></div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-card lg:col-span-2">
            <p className="text-sm font-semibold">Revenue attributed to campaigns <span className="font-normal text-muted">(30 days)</span></p>
            <div className="mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={s}><defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF66BF" stopOpacity={0.35} /><stop offset="100%" stopColor="#FF66BF" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="#EBEDEE" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip /><Area dataKey="revenue" stroke="#FF66BF" strokeWidth={2} fill="url(#gp)" /></AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-card">
            <p className="text-sm font-semibold">Customer segments</p>
            <div className="mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEMO_SEGMENTS.slice(0, 5)} layout="vertical" margin={{ left: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="members" fill="#0F5257" radius={4} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-card">
            <p className="text-sm font-semibold">Recommended for you</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {top.map((p) => (<div key={p.id}><div className="aspect-square rounded-lg bg-gradient-to-br from-mauve to-pink/40" /><p className="mt-1.5 truncate text-[11px] font-medium">{p.name}</p><p className="text-[11px] text-muted">{money(p.price)}</p></div>))}
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-card">
            <p className="text-sm font-semibold">Top performing products</p>
            <ul className="mt-3 space-y-2">
              {top.map((p) => (<li key={p.id} className="flex items-center justify-between text-xs"><span className="truncate pr-2">{p.name}</span><span className="font-semibold text-teal">{fmt(p.carts)} adds</span></li>))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
