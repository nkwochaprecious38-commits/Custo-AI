import Link from 'next/link';
import { ArrowRight, BarChart3, Boxes, FlaskConical, Layers, Megaphone, PanelsTopLeft, Plug, Search, Sparkles, Target, Users, Eye, Wand2, LineChart } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { DashboardPreview } from '@/components/marketing/DashboardPreview';
import { ProductArt } from '@/components/marketing/ProductArt';
import { HOME_FEATURES } from '@/lib/content';

const FEATURE_ICONS = [Sparkles, Search, Users, Layers, PanelsTopLeft, Megaphone, FlaskConical, BarChart3];

const PROBLEMS = [
  ['Customers struggle to discover relevant products', 'Large catalogs and literal search leave shoppers scrolling instead of buying.'],
  ['Generic experiences reduce engagement', 'Every visitor sees the same homepage, whatever they came for.'],
  ['Merchandising is manual', 'Teams reorder categories by hand and still miss inventory changes.'],
  ['Recommendations miss the mark', 'Static widgets show the same best sellers to everyone.'],
  ['Customer behavior is hard to read', 'Data sits across tools, so marketing teams guess at what shoppers want.'],
  ['Shopping data goes unused', 'Views, searches and carts are collected but rarely acted on.'],
  ['Testing is difficult', 'Without controlled experiments it is hard to know which experience performs better.'],
];

const STEPS = [
  [Plug, 'Connect', 'Connect your online store and available commerce data: products, orders and storefront events.'],
  [Eye, 'Understand', 'Understand customer behavior and product interactions with profiles, segments and analytics.'],
  [Wand2, 'Personalize', 'Create personalized shopping experiences, recommendations, search and content for each audience.'],
  [LineChart, 'Optimize', 'Measure performance, run experiments and continuously optimize results.'],
] as const;

const AUDIENCES = [
  ['Online retailers', 'Apparel', 'Bring structure to large catalogs with automated ranking and relevant recommendations.'],
  ['Fashion brands', 'Footwear', 'Match shoppers with styles, sizes and collections they are likely to love.'],
  ['Beauty brands', 'Beauty', 'Guide shoppers by skin type and routine, then remind them when it is time to reorder.'],
  ['Electronics stores', 'Electronics', 'Make specifications searchable and surface the accessories that complete a purchase.'],
  ['DTC businesses', 'Home', 'Personalize the journey from first visit to repeat purchase on your own storefront.'],
  ['E-commerce marketing teams', 'Skincare', 'Target content and campaigns to segments and measure what changes behavior.'],
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-gradient-to-b from-mauve/70 via-white to-white" />
        <div className="pointer-events-none absolute -right-40 top-10 h-96 w-96 rounded-full bg-pink/20 blur-3xl" />
        <div className="container-site relative pb-16 pt-14 sm:pt-20 lg:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">E-commerce personalization platform</p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
              Every Customer Deserves a More Personal Shopping Experience.
            </h1>
            <p className="lead mx-auto mt-6 max-w-2xl">
              Custo AI helps e-commerce brands understand customer behavior, personalize product discovery, optimize shopping experiences, and uncover more opportunities to convert visitors into customers.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg">Get Started <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href="/platform" size="lg" variant="secondary">Explore the Platform</ButtonLink>
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-5xl"><DashboardPreview /></div>
          <p className="mt-3 text-center text-xs text-muted">Product preview with illustrative sample data.</p>
        </div>
      </section>

      {/* Problem and solution */}
      <section className="bg-soft/60 py-20">
        <div className="container-site grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">The challenge</p>
            <h2 className="h-section mt-3">Online stores collect plenty of data. Few turn it into better experiences.</h2>
            <p className="lead mt-5">Shoppers expect stores to understand them. Most storefronts still show the same products, in the same order, to everyone.</p>
            <div className="mt-8 rounded-2xl bg-charcoal p-7 text-white">
              <p className="eyebrow !text-pink">How Custo AI helps</p>
              <p className="mt-3 text-lg leading-relaxed text-white/90">
                Custo AI connects product data, customer behavior and storefront activity in one workspace. Teams use it to recommend relevant products, power intent aware search, target content to segments, automate merchandising and test every change against real results.
              </p>
            </div>
          </div>
          <ul className="grid gap-3 self-start">
            {PROBLEMS.map(([t, d], i) => (
              <li key={t} className="flex gap-4 rounded-2xl border border-charcoal/10 bg-white p-5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mauve font-display text-sm font-extrabold text-charcoal">{i + 1}</span>
                <div><h3 className="font-semibold text-charcoal">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container-site">
          <div className="max-w-2xl">
            <p className="eyebrow">Core platform features</p>
            <h2 className="h-section mt-3">Everything your team needs to personalize commerce.</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOME_FEATURES.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <Link key={f.id} href={`/features#${f.id}`} className="group flex flex-col rounded-2xl border border-charcoal/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-charcoal/20 hover:shadow-lift">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${i % 3 === 0 ? 'bg-pink-soft text-[#9b1f67]' : i % 3 === 1 ? 'bg-teal-soft text-teal' : 'bg-mauve text-charcoal'}`}><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-5 font-display text-lg font-bold text-charcoal">{f.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal">Learn more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-charcoal py-20 text-white">
        <div className="container-site">
          <p className="eyebrow !text-pink">How Custo AI works</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">From store data to better shopping experiences in four steps.</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([Icon, t, d], i) => (
              <li key={t} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center justify-between"><Icon className="h-6 w-6 text-pink" /><span className="font-display text-4xl font-extrabold text-white/10">0{i + 1}</span></div>
                <h3 className="mt-6 font-display text-xl font-bold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Audiences */}
      <section className="py-20">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl"><p className="eyebrow">Who uses Custo AI</p><h2 className="h-section mt-3">Built for teams that sell online.</h2></div>
            <Link href="/solutions" className="link inline-flex items-center gap-1">View all solutions <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map(([t, c, d]) => (
              <div key={t} className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
                <div className="h-28"><ProductArt category={c} /></div>
                <div className="p-6"><h3 className="font-display text-lg font-bold">{t}</h3><p className="mt-2 text-sm text-muted">{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="bg-mauve/60 py-20">
        <div className="container-site grid items-center gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="eyebrow">Product dashboard</p>
            <h2 className="h-section mt-3">One view of your store performance.</h2>
            <p className="lead mt-5">Follow visitors, recommendation clicks, conversion rate, average order value and attributed revenue alongside top products, segments, search and active campaigns.</p>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-charcoal">
              {['Total store visitors', 'Recommendation clicks', 'Conversion rate', 'Average order value', 'Attributed revenue', 'Top products', 'Customer segments', 'Search performance', 'Active campaigns'].map((x) => (
                <li key={x} className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-teal" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3"><DashboardPreview compact /><p className="mt-3 text-xs text-muted">Illustrative sample data.</p></div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container-site">
          <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-16 text-center text-white sm:px-12">
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-pink/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-teal/50 blur-3xl" />
            <Boxes className="relative mx-auto h-8 w-8 text-pink" />
            <h2 className="relative mx-auto mt-5 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">Give Your Customers a Better Way to Discover Products.</h2>
            <div className="relative mt-8"><ButtonLink href="/signup" size="lg">Start With Custo AI</ButtonLink></div>
          </div>
        </div>
      </section>
    </>
  );
}
