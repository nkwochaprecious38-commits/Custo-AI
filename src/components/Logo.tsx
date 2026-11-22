import clsx from 'clsx';

/**
 * Temporary Custo AI wordmark. Replace the contents of this component with the final logo
 * once it is selected; every page uses this single component.
 */
export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={clsx('inline-flex items-baseline font-display text-[22px] font-extrabold tracking-tight', dark ? 'text-white' : 'text-charcoal', className)}>
      Custo<span className="ml-1 text-pink">AI</span>
    </span>
  );
}
