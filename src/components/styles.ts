import clsx from 'clsx';

export const cn = clsx;

export type BtnVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger' | 'teal';
const btnBase = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-pink text-charcoal hover:bg-pink-dark hover:text-white',
  dark: 'bg-charcoal text-white hover:bg-ink',
  secondary: 'bg-white text-charcoal border border-charcoal/15 hover:border-charcoal/40',
  ghost: 'text-charcoal hover:bg-charcoal/5',
  danger: 'bg-danger text-white hover:bg-[#c13f3f]',
  teal: 'bg-teal text-white hover:bg-teal-light',
};
export const btnSizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-5 text-sm', lg: 'h-12 px-7 text-base' };

export function buttonClass(variant: BtnVariant = 'primary', size: keyof typeof btnSizes = 'md', extra?: string) {
  return cn(btnBase, btnVariants[variant], btnSizes[size], extra);
}


export function labelize(s: string) {
  return s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
