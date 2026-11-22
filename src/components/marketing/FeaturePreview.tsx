import { Bot, Pin, Search, Store, ArrowUp, ArrowDown } from 'lucide-react';
import { ALL_FEATURES } from '@/lib/content';
import { ProductArt } from './ProductArt';

const Frame = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-charcoal/10 bg-[#f7f7f8] p-4" aria-hidden>
    <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-charcoal">{title}</span><span className="rounded-full bg-[#fbf0dc] px-2 py-0.5 text-[9px] font-bold uppercase text-[#8a5a10]">Sample</span></div>
    {children}
  </div>
);

/** Small interface previews for the feature directory, chosen by the feature's module. */
export function FeaturePreview({ id }: { id: string }) {
  const f = ALL_FEATURES.find((x) => x.id === id);
  const mod = f?.module ?? 'analytics';
  switch (mod) {
    case 'recommendations':
      return (
        <Frame title={f!.name}>
          <div className="grid grid-cols-4 gap-2">
            {['Footwear', 'Apparel', 'Home', 'Skincare'].map((c, i) => (
              <div key={c} className="rounded-xl bg-white p-1.5 shadow-card">
                <div className="aspect-square overflow-hidden rounded-lg"><ProductArt category={c} /></div>
                <div className="mt-1.5 h-1.5 w-4/5 rounded bg-soft" /><div className="mt-1 text-[10px] font-semibold">${[89, 64, 48, 42][i]}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]"><span className="rounded-full bg-white px-2 py-1">Placement: product page</span><span className="rounded-full bg-white px-2 py-1">Exclude out of stock</span></div>
        </Frame>
      );
    case 'search':
      return (
        <Frame title={f!.name}>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-card"><Search className="h-3.5 w-3.5 text-muted" /> comfortable shoes for walking</div>
          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">{['walking', 'cushioned', 'comfort', 'sneakers'].map((t) => <span key={t} className="rounded-full bg-teal-soft px-2 py-0.5 text-teal">{t}</span>)}</div>
          <div className="mt-2 space-y-1.5">{['CloudStride Everyday Walking Shoe', 'Pace Runner 2'].map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-lg bg-white p-1.5 text-[11px]"><div className="h-8 w-8 overflow-hidden rounded-md"><ProductArt category="Footwear" /></div>{t}</div>
          ))}</div>
        </Frame>
      );
    case 'segments':
      return (
        <Frame title="Segment rules">
          {[['Total spent', 'greater than', '300'], ['Visits', 'at least', '3']].map((r, i) => (
            <div key={i} className="mb-1.5 grid grid-cols-3 gap-1.5 text-[10px]">{r.map((x) => <div key={x} className="rounded-lg bg-white px-2 py-1.5">{x}</div>)}</div>
          ))}
          <div className="mt-3 rounded-xl bg-charcoal p-3 text-white"><div className="text-[10px] text-white/60">Matching customers</div><div className="font-display text-xl font-extrabold">1,284</div></div>
        </Frame>
      );
    case 'merchandising':
      return (
        <Frame title="Category order preview">
          {[['Walking Shoe', Pin, 'text-pink'], ['Waterproof Hiker', ArrowUp, 'text-success'], ['Leather Loafer', null, ''], ['Runner 2', ArrowDown, 'text-danger']].map(([t, I, c], i) => {
            const Icon = I as typeof Pin | null;
            return <div key={t as string} className="mb-1.5 flex items-center gap-2 rounded-lg bg-white p-1.5 text-[11px]"><span className="w-4 text-center text-muted">{i + 1}</span><div className="h-7 w-7 overflow-hidden rounded-md"><ProductArt category="Footwear" /></div><span className="flex-1">{t as string}</span>{Icon && <Icon className={`h-3.5 w-3.5 ${c}`} />}</div>;
          })}
        </Frame>
      );
    case 'content':
      return (
        <Frame title="Banner for: First time visitors">
          <div className="rounded-xl bg-charcoal p-4 text-white"><div className="font-display text-sm font-bold">New here? Start with our best sellers</div><div className="mt-1 text-[10px] text-white/70">Explore the pieces our customers reorder most.</div><div className="mt-3 inline-block rounded-full bg-pink px-3 py-1 text-[10px] font-semibold text-charcoal">Shop best sellers</div></div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]"><div className="rounded-lg bg-white p-2">Impressions <b className="block text-sm">2,904</b></div><div className="rounded-lg bg-white p-2">Clicks <b className="block text-sm">131</b></div></div>
        </Frame>
      );
    case 'campaigns':
      return (
        <Frame title="Campaign schedule">
          {[['Spring wardrobe refresh', 'w-3/4', 'bg-pink'], ['Loyalty week', 'w-1/3', 'bg-teal'], ['Clearance', 'w-1/2', 'bg-warning']].map(([n, w, c]) => (
            <div key={n} className="mb-2"><div className="text-[10px]">{n}</div><div className="mt-0.5 h-2 rounded-full bg-white"><div className={`h-2 rounded-full ${w} ${c}`} /></div></div>
          ))}
        </Frame>
      );
    case 'experiments':
      return (
        <Frame title="Carousel vs grid">
          {[['Control', 8.1, 'bg-teal/60'], ['Variation B', 9.6, 'bg-pink']].map(([n, v, c]) => (
            <div key={n as string} className="mb-2 text-[10px]"><div className="flex justify-between"><span>{n as string}</span><span className="font-semibold">{v as number}% CTR</span></div><div className="mt-0.5 h-2 rounded-full bg-white"><div className={`h-2 rounded-full ${c}`} style={{ width: `${(v as number) * 8}%` }} /></div></div>
          ))}
          <div className="mt-2 rounded-lg bg-white p-2 text-[10px] text-muted">Confidence 98.4%. Significant at the 95% level.</div>
        </Frame>
      );
    case 'assistant':
      return (
        <Frame title="AI Commerce Assistant">
          <div className="ml-auto w-4/5 rounded-xl bg-charcoal p-2 text-[10px] text-white">Which products have high views but low add to cart?</div>
          <div className="mt-2 flex gap-2"><Bot className="h-4 w-4 shrink-0 text-teal" /><div className="rounded-xl bg-white p-2 text-[10px]"><b>From your data:</b> 4K Streaming Webcam had 1,303 views and 79 add to cart events.<div className="mt-1 text-muted"><b>Suggestion:</b> review pricing and product images.</div></div></div>
        </Frame>
      );
    case 'stores':
      return (
        <Frame title="Stores">
          {[['Main storefront', 'Connected', 'text-success'], ['EU storefront', 'Connected', 'text-success'], ['Outlet', 'Setup required', 'text-warning']].map(([n, s, c]) => (
            <div key={n} className="mb-1.5 flex items-center gap-2 rounded-lg bg-white p-2 text-[11px]"><Store className="h-3.5 w-3.5 text-muted" /><span className="flex-1">{n}</span><span className={`font-semibold ${c}`}>{s}</span></div>
          ))}
        </Frame>
      );
    default:
      return (
        <Frame title={f?.name ?? 'Analytics'}>
          <div className="flex h-24 items-end gap-1">{[30, 42, 38, 51, 47, 58, 63, 60, 69, 74].map((h, i) => <div key={i} className="flex-1 rounded-t bg-teal/80" style={{ height: `${h}%` }} />)}</div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">{[['Views', '11.4k'], ['Add to cart', '656'], ['Orders', '159']].map(([l, v]) => <div key={l} className="rounded-lg bg-white p-2">{l}<b className="block text-sm">{v}</b></div>)}</div>
        </Frame>
      );
  }
}
