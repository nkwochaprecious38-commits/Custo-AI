'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/ui';

const FAQ = [
  ['How do I purchase a plan?', 'Select a plan and you will be taken to a secure Selar checkout page where the current price and billing details are shown before you pay.'],
  ['Can I try the platform before purchasing?', 'Yes. You can create a free workspace and explore every module using the clearly labeled demo dataset before connecting your store.'],
  ['Which plan is right for my store?', 'Starter suits smaller retailers beginning with personalization. Professional adds advanced segmentation and campaign optimization for established brands. Enterprise is for large retailers that need broader collaboration and scale.'],
  ['Can I change plans later?', 'Yes. Contact our team and we will help you move to the plan that fits your needs.'],
  ['Which e-commerce platforms can I connect?', 'Shopify, WooCommerce and BigCommerce can be connected directly with API credentials. Other platforms can send data through the tracking API and CSV catalog import, with direct connectors listed in the integration directory.'],
  ['How is my data protected?', 'Each organization’s data is isolated with database level access policies, integration credentials are stored server side only and important actions are recorded in audit logs.'],
];

export function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mt-10 divide-y divide-charcoal/10 rounded-2xl border border-charcoal/10 bg-white">
      {FAQ.map(([q, a], i) => (
        <div key={q}>
          <button className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            {q}<ChevronDown className={cn('h-5 w-5 shrink-0 text-muted transition', open === i && 'rotate-180')} />
          </button>
          {open === i && <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{a}</p>}
        </div>
      ))}
    </div>
  );
}
