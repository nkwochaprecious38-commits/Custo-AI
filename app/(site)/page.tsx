import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import DashboardPreview from "@/components/marketing/DashboardPreview";
import { Section, FinalCta } from "@/components/marketing/bits";
import { AUDIENCES, PLATFORM_FEATURE_CARDS, PROBLEMS, STEPS } from "@/lib/content";

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-b from-mauve/70 via-white to-white">
        <div className="container-x pt-14 sm:pt-20">
          <div className="max-w-3xl">
            <p className="eyebrow">E-commerce personalization platform</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-6xl">Every Customer Deserves a More Personal Shopping Experience.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">Custo AI helps e-commerce brands understand customer behavior, personalize product discovery, optimize shopping experiences, and uncover more opportunities to convert visitors into customers.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary !px-6 !py-3">Get Started <ArrowRight size={18} /></Link>
              <Link href="/platform" className="btn-ghost !px-6 !py-3">Explore the Platform</Link>
            </div>
          </div>
          <div className="mt-12 -mb-10 sm:-mb-16"><DashboardPreview /></div>
        </div>
      </section>

      <Section eyebrow="The challenge" title="Why online stores struggle to personalize" text="Most retailers already collect the data they need. The difficulty is turning it into a better experience for each shopper." >
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map(([t, d]) => (<div key={t} className="card p-6"><h3 className="text-base font-bold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{d}</p></div>))}
          <div className="rounded-2xl bg-teal p-6 text-white">
            <h3 className="text-base font-bold !text-white">How Custo AI responds</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/80">Custo AI brings behavior, catalog and campaign data into one workspace, so recommendations, search, merchandising and content all draw on the same understanding of your shoppers.</p>
          </div>
        </div>
      </Section>

      <Section tone="soft" eyebrow="Core platform" title="Everything connected in one workspace" text="Each capability uses the same product and customer data, so teams are not stitching tools together.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_FEATURE_CARDS.map((f) => (
            <Link key={f.slug} href={`/features#${f.slug}`} className="card group p-6 transition hover:-translate-y-0.5 hover:border-teal/40">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mauve text-teal"><f.icon size={22} /></span>
              <h3 className="mt-4 text-base font-bold">{f.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal">Learn more <ArrowRight size={14} className="transition group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="How Custo AI works" title="From connected store to continuous optimization">
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-6"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal font-heading text-sm font-bold text-pink">{i + 1}</span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p></li>
          ))}
        </ol>
      </Section>

      <Section tone="soft" eyebrow="Who uses Custo AI" title="Built for teams that sell online">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.name} className="card flex gap-4 p-6"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-light text-teal"><a.icon size={22} /></span>
              <div><h3 className="text-base font-bold">{a.name}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted">{a.text}</p></div></div>
          ))}
        </div>
        <p className="mt-6"><Link href="/solutions" className="inline-flex items-center gap-1 text-sm font-semibold text-teal">See all solutions <ArrowRight size={14} /></Link></p>
      </Section>

      <Section tone="dark" eyebrow="Inside the dashboard" title="One view of customers, products and campaigns" text="The dashboard shows visitors, recommendation clicks, conversion rate, average order value, attributed revenue, top products, segments, search performance and active campaigns. Until you connect a store, every figure is labeled sample data.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["Total store visitors", "Product recommendation clicks", "Conversion rate", "Average order value", "Revenue attributed to campaigns", "Top performing products", "Customer segments", "Search performance", "Active personalization campaigns"].map((t) => (
            <li key={t} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm"><Check size={16} className="text-pink" />{t}</li>
          ))}
        </ul>
      </Section>
      <FinalCta />
    </>
  );
}
