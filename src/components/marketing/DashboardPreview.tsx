import { BarChart3, Layers, LayoutDashboard, Search, Sparkles, Users } from 'lucide-react';
import { ProductArt } from './ProductArt';

const BARS = [38, 44, 41, 52, 48, 57, 61, 55, 66, 63, 71, 74, 69, 78];

/** Static product preview for marketing pages. Every number shown is labeled as sample data. */
export function DashboardPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-lift" role="img" aria-label="Preview of the Custo AI dashboard showing sample data">
      <div className="flex">
        <aside className="hidden w-44 shrink-0 flex-col gap-1 bg-charcoal p-3 text-xs text-white/70 md:flex">
          <div className="mb-3 px-2 pt-1 font-display text-sm font-extrabold text-white">Custo<span className="ml-0.5 text-pink">AI</span></div>
          {[['Overview', LayoutDashboard, true], ['Recommendations', Sparkles], ['Search', Search], ['Segments', Users], ['Merchandising', Layers], ['Analytics', BarChart3]].map(([l, I, a]) => {
            const Icon = I as typeof Search;
            return <div key={l as string} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${a ? 'bg-white/10 text-white' : ''}`}><Icon className={`h-3.5 w-3.5 ${a ? 'text-pink' : ''}`} />{l as string}</div>;
          })}
        </aside>
        <div className="min-w-0 flex-1 bg-[#f7f7f8] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-sm font-bold text-charcoal">Store overview</div>
            <span className="rounded-full bg-[#fbf0dc] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a5a10]">Sample data</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[['Store visitors', '48,210', '+6.2%'], ['Rec. clicks', '9,874', '+11.4%'], ['Conversion rate', '2.9%', '+0.3 pts'], ['Avg. order value', '$86.40', '+2.1%']].map(([l, v, d]) => (
              <div key={l} className="rounded-xl bg-white p-2.5 shadow-card">
                <div className="text-[10px] text-muted">{l}</div>
                <div className="mt-0.5 font-display text-base font-extrabold text-charcoal sm:text-lg">{v}</div>
                <div className="text-[10px] font-semibold text-success">{d}</div>
              </div>
            ))}
          </div>
          <div className={`mt-2 grid gap-2 ${compact ? '' : 'lg:grid-cols-5'}`}>
            <div className="rounded-xl bg-white p-3 shadow-card lg:col-span-3">
              <div className="mb-2 flex items-center justify-between text-[11px]"><span className="font-semibold text-charcoal">Revenue attributed to campaigns</span><span className="text-muted">Last 14 days</span></div>
              <div className="flex h-24 items-end gap-1">
                {BARS.map((h, i) => <div key={i} className={`flex-1 rounded-t ${i === BARS.length - 1 ? 'bg-pink' : 'bg-teal/80'}`} style={{ height: `${h}%` }} />)}
              </div>
            </div>
            {!compact && (
              <div className="rounded-xl bg-white p-3 shadow-card lg:col-span-2">
                <div className="mb-2 text-[11px] font-semibold text-charcoal">Customer segments</div>
                {[['High value customers', 72, 'bg-pink'], ['Returning customers', 58, 'bg-teal'], ['First time visitors', 41, 'bg-teal/60'], ['Abandoned cart', 23, 'bg-warning']].map(([l, w, c]) => (
                  <div key={l as string} className="mb-1.5">
                    <div className="flex justify-between text-[10px] text-muted"><span>{l}</span><span>{w}% engaged</span></div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-soft"><div className={`h-1.5 rounded-full ${c}`} style={{ width: `${w}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`mt-2 grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
            <div className="rounded-xl bg-white p-3 shadow-card">
              <div className="mb-2 text-[11px] font-semibold text-charcoal">Recommended for you</div>
              <div className="grid grid-cols-4 gap-1.5">
                {['Footwear', 'Apparel', 'Skincare', 'Electronics'].map((c) => (
                  <div key={c}><div className="aspect-square overflow-hidden rounded-lg"><ProductArt category={c} /></div><div className="mt-1 h-1.5 w-3/4 rounded bg-soft" /></div>
                ))}
              </div>
            </div>
            {!compact && (
              <div className="rounded-xl bg-white p-3 shadow-card">
                <div className="mb-2 text-[11px] font-semibold text-charcoal">Top searches</div>
                {[['comfortable walking shoes', '1,204', 'text-success'], ['linen shirt', '866', 'text-success'], ['vegan leather tote', '0 results', 'text-danger']].map(([q, n, c]) => (
                  <div key={q} className="flex items-center justify-between border-b border-charcoal/5 py-1 text-[10px] last:border-0"><span className="text-charcoal">{q}</span><span className={`font-semibold ${c}`}>{n}</span></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
