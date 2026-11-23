import type { Metadata } from "next";
import Link from "next/link";
import { Check, Database, Plug } from "lucide-react";
import { PageHero, Section, FinalCta } from "@/components/marketing/bits";
import DashboardPreview from "@/components/marketing/DashboardPreview";
import { MODULES, PLATFORMS } from "@/lib/content";

export const metadata: Metadata = { title: "Platform" };

export default function PlatformPage() {
  return (
    <>
      <PageHero eyebrow="Platform" title="One Intelligent Platform for Better Commerce Experiences." text="Custo AI brings customer intelligence, personalization, product discovery and optimization together, so every part of the storefront works from the same understanding of your shoppers.">
        <Link href="/signup" className="btn-primary">Get Started</Link><Link href="/features" className="btn-ghost">Browse features</Link>
      </PageHero>

      <Section eyebrow="How the modules work together" title="A connected loop, not a set of separate tools" text="Product and store data feeds customer intelligence. Insights shape experiences. Results flow back into analytics.">
        <div className="card p-6 sm:p-8">
          <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.4fr_auto_1fr]">
            <div className="rounded-xl bg-soft p-5"><p className="eyebrow">Inputs</p><p className="mt-2 flex items-center gap-2 font-bold"><Plug size={18} className="text-teal" />Store and data connections</p><p className="mt-1 text-sm text-muted">Catalog, orders and behavioral events from your store.</p></div>
            <div className="hidden items-center text-2xl text-pink lg:flex" aria-hidden>→</div>
            <div className="rounded-xl bg-charcoal p-5 text-white"><p className="eyebrow !text-pink">Experience layer</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {["Customer Intelligence", "Product Experience", "Merchandising Intelligence", "Content Experience"].map((m) => <span key={m} className="rounded-lg bg-white/10 px-3 py-2">{m}</span>)}
              </div></div>
            <div className="hidden items-center text-2xl text-pink lg:flex" aria-hidden>→</div>
            <div className="rounded-xl bg-teal-light p-5"><p className="eyebrow">Learning</p><p className="mt-2 flex items-center gap-2 font-bold"><Database size={18} className="text-teal" />Campaigns and analytics</p><p className="mt-1 text-sm text-muted">Test, measure and feed results back into the next decision.</p></div>
          </div>
        </div>
      </Section>

      <Section tone="soft" eyebrow="Platform modules" title="Six modules, one workspace">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <article key={m.name} className="card p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mauve text-teal"><m.icon size={24} /></span>
              <h3 className="mt-5 text-xl font-bold">{m.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.text}</p>
              <ul className="mt-4 space-y-2">{m.points.map((p) => <li key={p} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-success" />{p}</li>)}</ul>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Data connections" title="API based and honest about status" text="Connections show their real state: not connected, testing, connected or error. Nothing is marked active until credentials are saved and a connection test passes.">
        <div className="flex flex-wrap gap-2">{PLATFORMS.map((p) => <span key={p} className="rounded-full border border-charcoal/15 px-4 py-2 text-sm font-medium">{p}</span>)}</div>
        <p className="mt-4 max-w-2xl text-sm text-muted">Shopify is the first connector available for product import. Other platforms are listed in the integration directory with setup guidance and their current availability.</p>
      </Section>

      <Section tone="soft" eyebrow="Product preview" title="The workspace your team will use"><DashboardPreview /></Section>
      <FinalCta />
    </>
  );
}
