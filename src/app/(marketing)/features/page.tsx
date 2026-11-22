import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { FeaturePreview } from '@/components/marketing/FeaturePreview';
import { FEATURE_GROUPS, ALL_FEATURES } from '@/lib/content';

export const metadata: Metadata = { title: 'Features' };

export default function FeaturesPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-mauve/70 to-white">
        <div className="container-site py-16 text-center sm:py-24">
          <p className="eyebrow">{ALL_FEATURES.length} features in six categories</p>
          <h1 className="mx-auto mt-4 max-w-4xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Everything You Need to Make Your Store More Intelligent.</h1>
          <p className="lead mx-auto mt-6 max-w-2xl">A complete directory of Custo AI capabilities, from recommendations and search to experimentation and analytics.</p>
        </div>
      </section>
      <div className="container-site grid gap-10 pb-20 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-5 text-sm" aria-label="Feature categories">
            {FEATURE_GROUPS.map((g) => (
              <div key={g.id}>
                <a href={`#${g.id}`} className="font-display font-bold text-charcoal hover:text-teal">{g.name}</a>
                <ul className="mt-2 space-y-1.5 border-l border-charcoal/10 pl-3">{g.features.map((f) => <li key={f.id}><a href={`#${f.id}`} className="text-muted hover:text-charcoal">{f.name}</a></li>)}</ul>
              </div>
            ))}
          </nav>
        </aside>
        <div className="space-y-16">
          {FEATURE_GROUPS.map((g) => (
            <section key={g.id} id={g.id} className="scroll-mt-24">
              <div className="border-b border-charcoal/10 pb-4"><h2 className="font-display text-2xl font-extrabold sm:text-3xl">{g.name}</h2><p className="mt-2 text-muted">{g.description}</p></div>
              <div className="mt-6 space-y-5">
                {g.features.map((f) => (
                  <article key={f.id} id={f.id} className="scroll-mt-24 grid gap-6 rounded-2xl border border-charcoal/10 bg-white p-6 md:grid-cols-2">
                    <div>
                      <h3 className="font-display text-xl font-bold">{f.name}</h3>
                      <p className="mt-2 font-medium text-charcoal">{f.summary}</p>
                      <p className="mt-3 text-sm leading-relaxed text-muted">{f.detail}</p>
                      <ul className="mt-4 space-y-1.5 text-sm">{f.benefits.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{b}</li>)}</ul>
                    </div>
                    <FeaturePreview id={f.id} />
                  </article>
                ))}
              </div>
            </section>
          ))}
          <div className="rounded-3xl bg-charcoal p-10 text-center text-white">
            <h2 className="font-display text-3xl font-extrabold">Try every feature in your own workspace.</h2>
            <div className="mt-6"><ButtonLink href="/signup" size="lg">Get Started</ButtonLink></div>
          </div>
        </div>
      </div>
    </>
  );
}
