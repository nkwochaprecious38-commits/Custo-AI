import type { Metadata } from 'next';
import { ArrowUpRight, Check } from 'lucide-react';
import { buttonClass, cn } from '@/components/styles';
import { PricingFaq } from './PricingFaq';

export const metadata: Metadata = { title: 'Pricing' };

/**
 * EDITABLE PLAN DETAILS
 * Prices and billing intervals have not been verified, so they are left as placeholders.
 * Set `price` (for example '$49') and `interval` (for example 'per month') once confirmed.
 * Checkout URLs must stay exactly as provided.
 */
const PLANS = [
  {
    name: 'Starter',
    description: 'Designed for small online retailers and growing e-commerce businesses beginning their personalization journey.',
    price: null as string | null,
    interval: null as string | null,
    href: 'https://selar.com/47plan?currency=USD',
    cta: 'Get Started',
    highlights: ['Product recommendations', 'Personalized search', 'Product catalog management', 'Commerce analytics'],
    featured: false,
  },
  {
    name: 'Professional',
    description: 'Designed for established e-commerce brands that need more advanced personalization, customer segmentation, product recommendations, and campaign optimization.',
    price: null as string | null,
    interval: null as string | null,
    href: 'https://selar.com/57plan?currency=USD',
    cta: 'Choose Professional',
    highlights: ['Advanced personalization', 'Customer segmentation', 'Product recommendations', 'Campaign optimization'],
    featured: true,
  },
  {
    name: 'Enterprise',
    description: 'Designed for large retailers and growing commerce organizations that need advanced capabilities, broader team collaboration, and scalable commerce intelligence.',
    price: null as string | null,
    interval: null as string | null,
    href: 'https://selar.com/97plan?currency=USD',
    cta: 'Contact Sales',
    highlights: ['Advanced capabilities', 'Broader team collaboration', 'Scalable commerce intelligence'],
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-mauve/70 to-white">
        <div className="container-site py-16 text-center sm:py-20">
          <p className="eyebrow">Pricing</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Choose the plan that fits your store.</h1>
          <p className="lead mx-auto mt-5 max-w-2xl">Every plan runs on the same Custo AI platform. Final pricing and billing details are confirmed on the secure checkout page.</p>
        </div>
      </section>
      <section className="pb-20">
        <div className="container-site grid items-stretch gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={cn('relative flex flex-col rounded-3xl border p-7 sm:p-8', p.featured ? 'border-charcoal bg-charcoal text-white shadow-lift lg:-my-3 lg:py-11' : 'border-charcoal/10 bg-white')}>
              {p.featured && <span className="absolute -top-3 left-8 rounded-full bg-pink px-3 py-1 text-xs font-bold text-charcoal">Most popular</span>}
              <h2 className="font-display text-2xl font-extrabold">{p.name}</h2>
              <p className={cn('mt-3 text-sm leading-relaxed', p.featured ? 'text-white/75' : 'text-muted')}>{p.description}</p>
              <div className="mt-6 border-y py-5" style={{ borderColor: p.featured ? 'rgba(255,255,255,0.12)' : 'rgba(33,28,31,0.1)' }}>
                {p.price ? (
                  <p><span className="font-display text-4xl font-extrabold">{p.price}</span>{p.interval && <span className={cn('ml-1 text-sm', p.featured ? 'text-white/60' : 'text-muted')}>{p.interval}</span>}</p>
                ) : (
                  <p className={cn('text-sm', p.featured ? 'text-white/80' : 'text-muted')}><span className="font-display text-xl font-bold text-current">Price shown at checkout</span><br />Pricing details are confirmed on the checkout page.</p>
                )}
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.highlights.map((h) => <li key={h} className="flex gap-2.5"><Check className={cn('mt-0.5 h-4 w-4 shrink-0', p.featured ? 'text-pink' : 'text-success')} />{h}</li>)}
              </ul>
              <a href={p.href} target="_blank" rel="noopener noreferrer" className={buttonClass(p.featured ? 'primary' : 'dark', 'lg', 'mt-8 w-full')}>
                {p.cta} <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
        <p className="container-site mt-8 text-center text-xs text-muted">Checkout is handled securely by Selar. Plan highlights summarize each plan description; detailed limits are confirmed during checkout.</p>
      </section>
      <section className="bg-soft/60 py-20">
        <div className="container-site max-w-3xl">
          <h2 className="h-section text-center">Pricing questions</h2>
          <PricingFaq />
        </div>
      </section>
    </>
  );
}
