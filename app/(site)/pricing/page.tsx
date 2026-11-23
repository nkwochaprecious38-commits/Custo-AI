import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PageHero, FinalCta } from "@/components/marketing/bits";
import { PRICING_LINKS } from "@/lib/content";

export const metadata: Metadata = { title: "Pricing" };

// Edit these values once pricing is confirmed. Leave price null to show the placeholder.
const PLANS = [
  { key: "starter", name: "Starter", price: null as string | null, interval: null as string | null, cta: "Get Started", href: PRICING_LINKS.starter, featured: false,
    text: "Designed for small online retailers and growing e-commerce businesses beginning their personalization journey.", highlights: [] as string[] },
  { key: "professional", name: "Professional", price: null, interval: null, cta: "Choose Professional", href: PRICING_LINKS.professional, featured: true,
    text: "Designed for established e-commerce brands that need more advanced personalization, customer segmentation, product recommendations and campaign optimization.", highlights: [] },
  { key: "enterprise", name: "Enterprise", price: null, interval: null, cta: "Contact Sales", href: PRICING_LINKS.enterprise, featured: false,
    text: "Designed for large retailers and growing commerce organizations that need advanced capabilities, broader team collaboration and scalable commerce intelligence.", highlights: [] },
];

const FAQ = [
  ["Where do I see the price of each plan?", "Each plan button opens its checkout page, where the current price and billing details are shown before you commit to anything."],
  ["Can I create an account before I choose a plan?", "Yes. You can sign up and explore the workspace with sample data. Choosing a plan is a separate step on the checkout page."],
  ["What is the difference between the plans?", "Starter is for retailers beginning to personalize. Professional adds more advanced segmentation, recommendations and campaign optimization. Enterprise is for larger organizations that need broader team collaboration and scale. Full plan details are on each checkout page."],
  ["Can I change plans later?", "Plan changes are handled through the same checkout provider. Contact sales from the Enterprise option if you need help with a larger setup."],
  ["Does Custo AI connect to my store before I pay?", "Connections are configured inside your workspace. A connection is only shown as active after your credentials are saved and a connection test succeeds."],
  ["Who do I contact about Enterprise?", "Use the Contact Sales button on the Enterprise plan. It opens the Enterprise checkout page."],
];

export default function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Choose the plan that fits your store." text="Three plans for different stages of growth. Each button opens that plan's checkout page." />
      <section className="pb-20">
        <div className="container-x grid items-stretch gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <article key={p.key} className={`relative flex flex-col rounded-3xl p-8 ${p.featured ? "bg-charcoal text-white shadow-card ring-2 ring-pink md:-my-4 md:py-12" : "card"}`}>
              {p.featured && <span className="absolute -top-3 left-8 rounded-full bg-pink px-3 py-1 text-xs font-bold text-ink">Most popular</span>}
              <p className={`eyebrow ${p.featured ? "!text-pink" : ""}`}>{p.name} plan</p>
              <p className="mt-4 font-heading text-3xl font-extrabold">{p.price ?? "Price at checkout"}</p>
              <p className={`mt-1 text-sm ${p.featured ? "text-white/60" : "text-muted"}`}>{p.interval ?? "Billing details shown on the checkout page"}</p>
              <p className={`mt-6 flex-1 text-sm leading-relaxed ${p.featured ? "text-white/80" : "text-muted"}`}>{p.text}</p>
              {p.highlights.length > 0 && <ul className="mt-5 space-y-2 text-sm">{p.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
              <a href={p.href} target="_blank" rel="noopener noreferrer" className={`${p.featured ? "btn-primary" : "btn-dark"} mt-8 !py-3`}>{p.cta} <ArrowUpRight size={16} /></a>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-soft/60 py-16">
        <div className="container-x max-w-3xl">
          <h2 className="text-3xl font-extrabold">Pricing questions</h2>
          <div className="mt-8 divide-y divide-charcoal/10 rounded-2xl border border-charcoal/10 bg-white">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<span className="text-pink transition group-open:rotate-45 text-xl leading-none" aria-hidden>+</span></summary><p className="mt-3 text-sm leading-relaxed text-muted">{a}</p></details>
            ))}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
