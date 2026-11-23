"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, Bot, FlaskConical, FileText, LayoutDashboard, LayoutGrid, Megaphone, Menu, Package, Plug, Search, Settings, Store, UserCog, Users, Wand2, X, LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { OrgProvider, ROLE_LABELS, type Ctx } from "@/lib/dashboard/context";
import { ToastProvider } from "./ui";

const NAV = [
  ["/dashboard", "Overview", LayoutDashboard], ["/dashboard/stores", "Store Connections", Store], ["/dashboard/catalog", "Product Catalog", Package],
  ["/dashboard/recommendations", "Recommendations", Wand2], ["/dashboard/search", "Search", Search], ["/dashboard/segments", "Customer Segments", Users],
  ["/dashboard/merchandising", "Merchandising", LayoutGrid], ["/dashboard/content", "Content Personalization", FileText], ["/dashboard/campaigns", "Campaigns", Megaphone],
  ["/dashboard/experiments", "A/B Testing", FlaskConical], ["/dashboard/analytics", "Analytics", BarChart3], ["/dashboard/assistant", "AI Assistant", Bot],
  ["/dashboard/integrations", "Integrations", Plug], ["/dashboard/team", "Team Management", UserCog], ["/dashboard/settings", "Settings", Settings],
] as const;

export default function DashboardShell({ ctx, children }: { ctx: Ctx; children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = NAV.find(([h]) => (h === "/dashboard" ? path === h : path.startsWith(h)));
  async function logout() {
    await supabaseBrowser().auth.signOut();
    document.cookie = "custo_session_only=; Max-Age=0; Path=/";
    router.replace("/login"); router.refresh();
  }
  const sidebar = (
    <nav aria-label="Dashboard" className="flex h-full flex-col bg-charcoal text-white">
      <div className="flex h-16 shrink-0 items-center justify-between px-5"><Logo dark /><button className="rounded-lg p-1.5 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map(([href, label, Icon]) => {
          const on = current?.[0] === href;
          return (<li key={href}><Link href={href} onClick={() => setOpen(false)} aria-current={on ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${on ? "bg-pink text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon size={18} />{label}</Link></li>);
        })}
      </ul>
      <div className="border-t border-white/10 p-4 text-xs text-white/60"><p className="truncate font-semibold text-white">{ctx.orgName}</p><p>{ROLE_LABELS[ctx.role]}</p></div>
    </nav>
  );
  return (
    <OrgProvider value={ctx}>
      <ToastProvider>
        <div className="min-h-screen bg-soft/60">
          <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>
          {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} /><div className="absolute inset-y-0 left-0 w-72">{sidebar}</div></div>}
          <div className="lg:pl-64">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-charcoal/10 bg-white/90 px-4 backdrop-blur sm:px-8">
              <div className="flex items-center gap-3"><button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
                <span className="font-heading font-bold">{current?.[1] ?? "Dashboard"}</span></div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right text-xs sm:block"><p className="font-semibold">{ctx.fullName || ctx.email}</p><p className="text-muted">{ctx.email}</p></div>
                <button onClick={logout} className="btn-ghost btn-sm !py-2"><LogOut size={15} />Log out</button>
              </div>
            </header>
            {!ctx.dbReady && <div role="alert" className="border-b border-warning/40 bg-warning/10 px-4 py-3 text-sm sm:px-8">Your database is not reachable or the schema has not been applied. Run <code className="font-mono text-xs">supabase/schema.sql</code> in Supabase. Data features are unavailable until then.</div>}
            <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </OrgProvider>
  );
}
