"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";

const links = [
  { href: "/", label: "Home" }, { href: "/platform", label: "Platform" }, { href: "/solutions", label: "Solutions" },
  { href: "/features", label: "Features" }, { href: "/pricing", label: "Pricing" },
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <header className="sticky top-0 z-40 border-b border-charcoal/10 bg-white/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" aria-label="Custo AI home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${active(l.href) ? "bg-mauve text-charcoal" : "text-muted hover:text-charcoal"}`}>{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="btn-ghost btn-sm !text-sm !px-4 !py-2">Log In</Link>
          <Link href="/signup" className="btn-primary !px-4 !py-2">Get Started</Link>
        </div>
        <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-charcoal/10 bg-white md:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-3 text-sm font-medium ${active(l.href) ? "bg-mauve" : ""}`}>{l.label}</Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/login" onClick={() => setOpen(false)} className="btn-ghost">Log In</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="btn-primary">Get Started</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
