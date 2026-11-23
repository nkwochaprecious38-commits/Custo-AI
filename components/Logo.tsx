// Placeholder brand mark. Replace the <svg> below with the final Custo AI logo when it is ready.
export default function Logo({ dark = false, size = 28 }: { dark?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill={dark ? "#FF66BF" : "#211C1F"} />
        <path d="M21 11.5a6.5 6.5 0 1 0 0 9" fill="none" stroke={dark ? "#171519" : "#FF66BF"} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className={`font-heading text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-charcoal"}`}>Custo AI</span>
    </span>
  );
}
