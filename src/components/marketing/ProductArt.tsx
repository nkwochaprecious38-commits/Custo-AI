import { Armchair, Footprints, Headphones, Shirt, Sparkles as Drop, Package } from 'lucide-react';
import clsx from 'clsx';

const MAP: Record<string, { bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  Footwear: { bg: 'from-[#f3e7ee] to-[#e6d3df]', icon: Footprints },
  Apparel: { bg: 'from-[#e8eeee] to-[#cfe0e0]', icon: Shirt },
  Skincare: { bg: 'from-[#fbe9f3] to-[#f6d2e6]', icon: Drop },
  Beauty: { bg: 'from-[#fde3f1] to-[#f9c6e2]', icon: Drop },
  Electronics: { bg: 'from-[#e5e7ea] to-[#cfd3d8]', icon: Headphones },
  Home: { bg: 'from-[#efe9e3] to-[#e2d6ca]', icon: Armchair },
};

/** Product visual used when a product has no image: a calm tile coloured by category. */
export function ProductArt({ category, image, className, label }: { category?: string | null; image?: string | null; className?: string; label?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={label ?? ''} className={clsx('h-full w-full object-cover', className)} loading="lazy" />;
  }
  const m = MAP[category ?? ''] ?? { bg: 'from-soft to-mauve', icon: Package };
  const Icon = m.icon;
  return (
    <div className={clsx('grid h-full w-full place-items-center bg-gradient-to-br', m.bg, className)} aria-hidden>
      <Icon className="h-1/3 w-1/3 text-charcoal/40" />
    </div>
  );
}
