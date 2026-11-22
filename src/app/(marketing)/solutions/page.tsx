import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { ProductArt } from '@/components/marketing/ProductArt';
import { SOLUTIONS } from '@/lib/content';

export const metadata: Metadata = { title: 'Solutions' };
const ART = ['Apparel', 'Beauty', 'Electronics', 'Home', 'Skincare', 'Footwear', 'Other'];

export default function SolutionsPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-mauve/70 to-white">
        <div className="container-site py-16 text-center sm:py-24">
          <p className="eyebrow">Solutions</p>
          <h1 className="mx-auto mt-4 max-w-4xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Personalized Commerce Solutions for Every Growing Brand.</h1>
          <p className="lead mx-auto mt-6 max-w-2xl">Every vertical has its own discovery challenges. Custo AI adapts the same platform to the way your customers shop.</p>
          <nav className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2" aria-label="Solutions">
            {SOLUTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="rounded-full border border-charcoal/15 bg-white px-4 py-2 text-sm font-medium hover:border-charcoal/40">{s.name}</a>)}
          </nav>
        </div>
      </section>
      <section className="pb-20">
        <div className="container-site space-y-8">
          {SOLUTIONS.map((s, i) => (
            <article key={s.id} id={s.id} className="scroll-mt-24 grid overflow-hidden rounded-3xl border border-charcoal/10 bg-white lg:grid-cols-5">
              <div className={`relative min-h-[180px] lg:col-span-2 ${i % 2 ? 'lg:order-2' : ''}`}>
                <ProductArt category={ART[i]} />
                <div className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-1.5 font-display text-sm font-bold">{s.name}</div>
              </div>
              <div className="p-6 sm:p-10 lg:col-span-3">
                <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{s.name}</h2>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div><h3 className="text-xs font-bold uppercase tracking-widest text-danger">The challenge</h3><p className="mt-2 text-sm leading-relaxed text-muted">{s.challenge}</p></div>
                  <div><h3 className="text-xs font-bold uppercase tracking-widest text-teal">How Custo AI helps</h3><p className="mt-2 text-sm leading-relaxed text-muted">{s.approach}</p></div>
                </div>
                <div className="mt-6 rounded-2xl bg-soft/70 p-5">
                  <h3 className="text-sm font-semibold">Relevant platform features</h3>
                  <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{s.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{f}</li>)}</ul>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="container-site mt-16 text-center">
          <h2 className="h-section">Find the right setup for your store.</h2>
          <div className="mt-8"><ButtonLink href="/signup" size="lg">Get Started</ButtonLink></div>
        </div>
      </section>
    </>
  );
}
