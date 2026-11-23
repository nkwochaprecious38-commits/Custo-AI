import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, FinalCta } from "@/components/marketing/bits";
import { FEATURES, SOLUTIONS } from "@/lib/content";

export const metadata: Metadata = { title: "Solutions" };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default function SolutionsPage() {
  return (
    <>
      <PageHero eyebrow="Solutions" title="Personalized Commerce Solutions for Every Growing Brand." text="Every catalog and customer base is different. See how Custo AI applies to your kind of store.">
        <Link href="/signup" className="btn-primary">Get Started</Link>
      </PageHero>
      <div className="container-x -mt-4 flex flex-wrap gap-2 pb-6">
        {SOLUTIONS.map((s) => <a key={s.name} href={`#${slug(s.name)}`} className="rounded-full border border-charcoal/15 px-4 py-1.5 text-sm font-medium hover:bg-mauve">{s.name}</a>)}
      </div>
      <div>
        {SOLUTIONS.map((s, i) => (
          <section key={s.name} id={slug(s.name)} className={`scroll-mt-20 py-14 ${i % 2 ? "bg-soft/60" : "bg-white"}`}>
            <div className="container-x grid gap-8 lg:grid-cols-[1fr_1.4fr]">
              <div><p className="eyebrow">{String(i + 1).padStart(2, "0")}</p><h2 className="mt-2 text-3xl font-extrabold">{s.name}</h2><p className="mt-3 leading-relaxed text-muted">{s.text}</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card p-6"><h3 className="text-sm font-bold uppercase tracking-wide text-muted">The challenge</h3><p className="mt-2 text-sm leading-relaxed">{s.challenge}</p></div>
                <div className="card p-6"><h3 className="text-sm font-bold uppercase tracking-wide text-teal">How Custo AI helps</h3><p className="mt-2 text-sm leading-relaxed">{s.approach}</p></div>
                <div className="sm:col-span-2"><p className="mb-2 text-sm font-semibold">Relevant features</p>
                  <div className="flex flex-wrap gap-2">{s.features.map((f) => { const ft = FEATURES.find((x) => x.slug === f)!; return <Link key={f} href={`/features#${f}`} className="inline-flex items-center gap-2 rounded-full bg-mauve px-3.5 py-1.5 text-sm font-medium hover:bg-pink/30"><ft.icon size={15} className="text-teal" />{ft.name}</Link>; })}</div></div>
              </div>
            </div>
          </section>
        ))}
      </div>
      <FinalCta />
    </>
  );
}
