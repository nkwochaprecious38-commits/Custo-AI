import clsx from 'clsx';

/** Custo AI logo. The mark is /public/logo-mark.svg (favicon: /public/favicon.svg). Every page uses this component. */
export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-mark.svg" alt="" width={35} height={28} style={{ height: 28, width: 'auto' }} />
  );
  return (
    <span className={clsx('inline-flex items-center gap-2.5 font-display text-[22px] font-extrabold tracking-tight', dark ? 'text-white' : 'text-charcoal', className)}>
      {dark ? <span className="inline-flex items-center justify-center rounded-lg bg-white p-1">{mark}</span> : mark}
      <span>Custo<span className="ml-1 text-pink">AI</span></span>
    </span>
  );
}
