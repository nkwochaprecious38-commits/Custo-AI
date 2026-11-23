import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function PageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return (
    <section className="bg-gradient-to-b from-mauve/70 to-white">
      <div className="container-x py-16 sm:py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.1] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{text}</p>
        {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}
export function Section({ id, eyebrow, title, text, children, tone = "white" }: { id?: string; eyebrow?: string; title?: string; text?: string; children: ReactNode; tone?: "white" | "soft" | "dark" }) {
  const bg = tone === "soft" ? "bg-soft/60" : tone === "dark" ? "bg-charcoal text-white" : "bg-white";
  return (
    <section id={id} className={`${bg} py-16 sm:py-20`}>
      <div className="container-x">
        {(eyebrow || title) && (
          <div className="mb-10 max-w-2xl">
            {eyebrow && <p className={`eyebrow ${tone === "dark" ? "!text-pink" : ""}`}>{eyebrow}</p>}
            {title && <h2 className={`mt-2 text-3xl font-extrabold sm:text-4xl ${tone === "dark" ? "!text-white" : ""}`}>{title}</h2>}
            {text && <p className={`mt-3 text-base leading-relaxed ${tone === "dark" ? "text-white/70" : "text-muted"}`}>{text}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
export function FinalCta({ title = "Give Your Customers a Better Way to Discover Products.", button = "Start With Custo AI" }: { title?: string; button?: string }) {
  return (
    <section className="bg-charcoal py-20">
      <div className="container-x text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold !text-white sm:text-4xl">{title}</h2>
        <Link href="/signup" className="btn-primary mt-8 !px-7 !py-3.5 text-base">{button} <ArrowRight size={18} /></Link>
      </div>
    </section>
  );
}
