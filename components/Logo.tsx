/* Custo AI logo: the mark lives in /public/logo-mark.svg (favicon: /app/icon.svg). */
export default function Logo({ dark = false, size = 28 }: { dark?: boolean; size?: number }) {
  // The mark contains a navy circle, so on dark backgrounds it sits on a white tile to stay visible.
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-mark.svg" alt="" height={size} width={Math.round(size * 1.24)} style={{ height: size, width: "auto" }} />
  );
  return (
    <span className="inline-flex items-center gap-2.5">
      {dark ? <span className="inline-flex items-center justify-center rounded-lg bg-white" style={{ padding: 4 }}>{mark}</span> : mark}
      <span className={`font-heading text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-charcoal"}`}>Custo AI</span>
    </span>
  );
}
