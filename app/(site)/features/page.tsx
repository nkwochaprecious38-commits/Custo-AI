import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, FinalCta } from "@/components/marketing/bits";
import { FEATURES, FEATURE_CATEGORIES } from "@/lib/content";
import { DEMO_PRODUCTS, DEMO_QUERIES, DEMO_SEGMENTS, money } from "@/lib/demo";

export const metadata: Metadata = { title: "Features" };

function Preview({ slug }: { slug: string }) {
  const p = DEMO_PRODUCTS;
  if (slug.includes("search") || slug === "product-discovery") return (
    <div className="space-y-2"><div className="rounded-lg border border-charcoal/15 bg-white px-3 py-2 text-xs text-muted">comfortable shoes for walking</div>
      {p.slice(0, 2).map((x) => <div key={x.id} className="flex justify-between rounded-lg bg-white px-3 py-2 text-xs"><span>{x.name}</span><b>{money(x.price)}</b></div>)}
      <p className="text-[11px] text-muted">Sample matches by intent</p></div>);
  if (slug.includes("segment") || slug.includes("journey") || slug.includes("behavioral")) return (
    <div className="space-y-2">{DEMO_SEGMENTS.slice(0, 3).map((s) => <div key={s.name} className="rounded-lg bg-white px-3 py-2 text-xs"><div className="flex justify-between"><span>{s.name}</span><b>{s.members.toLocaleString()}</b></div><div className="mt-1.5 h-1.5 rounded bg-soft"><div className="h-1.5 rounded bg-teal" style={{ width: `${(s.members / 18240) * 100}%` }} /></div></div>)}<p className="text-[11px] text-muted">Sample data</p></div>);
  if (slug.includes("analytics") || slug.includes("conversion") || slug === "ab-testing") return (
    <div className="space-y-2">{DEMO_QUERIES.slice(0, 3).map((q) => <div key={q.query} className="flex justify-between rounded-lg bg-white px-3 py-2 text-xs"><span>{q.query}</span><b className="text-teal">{q.searches.toLocaleString()}</b></div>)}<p className="text-[11px] text-muted">Sample data</p></div>);
  return (
    <div><div className="grid grid-cols-3 gap-2">{p.slice(0, 3).map((x) => <div key={x.id}><div className="aspect-square rounded-lg bg-gradient-to-br from-mauve to-pink/40" /><p className="mt-1 truncate text-[11px] font-medium">{x.name}</p><p className="text-[11px] text-muted">{money(x.price)}</p></div>)}</div><p className="mt-2 text-[11px] text-muted">Sample storefront preview</p></div>);
}

export default function FeaturesPage() {
  return (
    <>
      <PageHero eyebrow="Features" title="Everything You Need to Make Your Store More Intelligent." text="Twenty four capabilities, organized by the job they do. Each one uses the same catalog and customer data.">
        <Link href="/signup" className="btn-primary">Get Started</Link>
      </PageHero>
      <div className="container-x flex flex-wrap gap-2 pb-4">
        {FEATURE_CATEGORIES.map((c) => <a key={c} href={`#cat-${c.replace(/\W+/g, "-")}`} className="rounded-full border border-charcoal/15 px-4 py-1.5 text-sm font-medium hover:bg-mauve">{c}</a>)}
      </div>
      {FEATURE_CATEGORIES.map((c, ci) => (
        <section key={c} id={`cat-${c.replace(/\W+/g, "-")}`} className={`scroll-mt-20 py-12 ${ci % 2 ? "bg-soft/60" : "bg-white"}`}>
          <div className="container-x">
            <h2 className="mb-8 text-2xl font-extrabold sm:text-3xl">{c}</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              {FEATURES.filter((f) => f.category === c).map((f) => (
                <article key={f.slug} id={f.slug} className="card scroll-mt-24 grid gap-5 p-6 sm:grid-cols-[1.2fr_1fr]">
                  <div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mauve text-teal"><f.icon size={20} /></span>
                    <h3 className="mt-4 text-lg font-bold">{f.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{f.description}</p>
                    <p className="mt-3 text-sm"><span className="font-semibold text-teal">Why it helps: </span>{f.benefit}</p>
                  </div>
                  <div className="rounded-xl bg-soft p-3.5"><Preview slug={f.slug} /></div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
      <FinalCta />
    </>
  );
}
