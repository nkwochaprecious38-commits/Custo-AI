import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, Check, Layers, Megaphone, PanelsTopLeft, Sparkles, Users, Database, ShieldCheck, Plug } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { PLATFORM_MODULES } from '@/lib/content';

export const metadata: Metadata = { title: 'Platform' };
const ICONS = [Users, Sparkles, Layers, PanelsTopLeft, Megaphone, BarChart3];

export default function PlatformPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-mauve/70 to-white">
        <div className="container-site py-16 text-center sm:py-24">
          <p className="eyebrow">The Custo AI platform</p>
          <h1 className="mx-auto mt-4 max-w-4xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">One Intelligent Platform for Better Commerce Experiences.</h1>
          <p className="lead mx-auto mt-6 max-w-2xl">Custo AI brings customer intelligence, personalization, product discovery and optimization together, so every module works from the same products, customers and events.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="lg">Get Started</ButtonLink>
            <ButtonLink href="/features" size="lg" variant="secondary">See all features</ButtonLink>
          </div>
        </div>
      </section>

      {/* Overview diagram */}
      <section className="py-16">
        <div className="container-site">
          <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">Platform overview</p><h2 className="h-section mt-3">How the modules work together</h2>
            <p className="lead mt-4">Store data flows into a shared commerce data layer. Every module reads from it and writes results back, so insights from one area improve the others.</p></div>
          <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1.4fr_auto_1fr]">
            <div className="rounded-2xl border border-charcoal/10 p-6">
              <div className="flex items-center gap-2 font-display font-bold"><Plug className="h-5 w-5 text-teal" /> Data sources</div>
              <ul className="mt-4 space-y-2 text-sm text-muted">{['Store platforms', 'Product catalog and CSV imports', 'Orders and carts', 'Storefront tracking events', 'Analytics and marketing tools'].map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-teal" />{x}</li>)}</ul>
            </div>
            <div className="hidden items-center lg:flex"><ArrowRight className="h-6 w-6 text-muted" /></div>
            <div className="rounded-2xl bg-charcoal p-6 text-white">
              <div className="flex items-center gap-2 font-display font-bold"><Database className="h-5 w-5 text-pink" /> Commerce data layer</div>
              <p className="mt-2 text-sm text-white/70">Products, customer profiles, segments, behavioral events and campaign results in one organization scoped workspace.</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {PLATFORM_MODULES.map((m, i) => { const I = ICONS[i]; return (
                  <a key={m.id} href={`#${m.id}`} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-xs font-semibold hover:bg-white/10"><I className="h-4 w-4 text-pink" />{m.name}</a>
                ); })}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/60"><ShieldCheck className="h-4 w-4" /> Role based access and audit logs across every module</div>
            </div>
            <div className="hidden items-center lg:flex"><ArrowRight className="h-6 w-6 text-muted" /></div>
            <div className="rounded-2xl border border-charcoal/10 p-6">
              <div className="flex items-center gap-2 font-display font-bold"><PanelsTopLeft className="h-5 w-5 text-teal" /> Storefront experiences</div>
              <ul className="mt-4 space-y-2 text-sm text-muted">{['Recommendation placements', 'Search results and autocomplete', 'Ordered category pages', 'Personalized banners and popups', 'Experiment variations'].map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-teal" />{x}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="bg-soft/60 py-16">
        <div className="container-site space-y-5">
          {PLATFORM_MODULES.map((m, i) => { const I = ICONS[i]; return (
            <article key={m.id} id={m.id} className="scroll-mt-24 grid gap-6 rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8 md:grid-cols-[auto_1fr_1fr]">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${i % 2 ? 'bg-teal-soft text-teal' : 'bg-pink-soft text-[#9b1f67]'}`}><I className="h-6 w-6" /></div>
              <div><p className="text-xs font-bold uppercase tracking-widest text-muted">Module 0{i + 1}</p><h2 className="mt-1 font-display text-2xl font-extrabold">{m.name}</h2><p className="mt-3 text-muted">{m.text}</p></div>
              <ul className="space-y-2.5 self-center text-sm">{m.points.map((p) => <li key={p} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{p}</li>)}</ul>
            </article>
          ); })}
        </div>
      </section>

      <section className="py-16">
        <div className="container-site text-center">
          <h2 className="h-section">See the platform with your own data.</h2>
          <p className="lead mx-auto mt-4 max-w-xl">Create a workspace, explore the demo dataset, then connect your store when you are ready.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><ButtonLink href="/signup" size="lg">Get Started</ButtonLink><Link href="/pricing" className="link self-center">View pricing</Link></div>
        </div>
      </section>
    </>
  );
}
