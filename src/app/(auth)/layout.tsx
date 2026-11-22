import Link from 'next/link';
import { Check } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Link href="/" aria-label="Custo AI home" className="self-start"><Logo /></Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-center text-xs text-muted">© 2026 Custo AI</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-charcoal p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-pink/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-teal/60 blur-3xl" />
        <div className="relative max-w-md">
          <p className="eyebrow !text-pink">Custo AI workspace</p>
          <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight">Make Every Shopping Experience Personal.</h2>
          <ul className="mt-8 space-y-4 text-white/80">
            {['Recommendations, search and merchandising in one place', 'Customer segments you can use across every module', 'Analytics and an assistant grounded in your own data', 'Demo dataset to explore before you connect a store'].map((x) => (
              <li key={x} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pink/20"><Check className="h-3 w-3 text-pink" /></span>{x}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
