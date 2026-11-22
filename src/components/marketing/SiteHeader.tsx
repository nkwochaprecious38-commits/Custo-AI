'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { buttonClass, cn } from '@/components/ui';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/platform', label: 'Platform' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <header className={cn('sticky top-0 z-40 border-b bg-white/90 backdrop-blur transition', scrolled ? 'border-charcoal/10' : 'border-transparent')}>
      <div className="container-site flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label="Custo AI home"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn('rounded-full px-3.5 py-2 text-sm font-medium transition', active(n.href) ? 'bg-mauve text-charcoal' : 'text-muted hover:text-charcoal')}>{n.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className={buttonClass('ghost', 'md')}>Log In</Link>
          <Link href="/signup" className={buttonClass('primary', 'md')}>Get Started</Link>
        </div>
        <button className="rounded-full p-2 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-charcoal/10 bg-white lg:hidden">
          <nav className="container-site flex flex-col gap-1 py-4" aria-label="Mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn('rounded-xl px-3 py-3 text-base font-medium', active(n.href) ? 'bg-mauve' : 'hover:bg-soft')}>{n.label}</Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/login" className={buttonClass('secondary', 'lg')}>Log In</Link>
              <Link href="/signup" className={buttonClass('primary', 'lg')}>Get Started</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-charcoal/10 bg-white">
      <div className="container-site py-8 text-center text-sm text-muted">© 2026 Custo AI</div>
    </footer>
  );
}
