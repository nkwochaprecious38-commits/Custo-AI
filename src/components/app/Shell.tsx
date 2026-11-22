'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3, Bell, Bot, Boxes, ChevronDown, FlaskConical, Layers, LayoutDashboard, LogOut, Megaphone, Menu,
  PanelsTopLeft, Plug, Search, Settings, Sparkles, Store, Users, UsersRound, X, Check,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button, cn } from '@/components/ui';
import { getSupabase } from '@/lib/supabase/client';
import { ROLE_LABELS, useOrg } from '@/lib/org';
import { timeAgo } from '@/lib/format';

export const NAV = [
  { href: '/app', label: 'Overview', icon: LayoutDashboard },
  { href: '/app/stores', label: 'Store Connections', icon: Store },
  { href: '/app/catalog', label: 'Product Catalog', icon: Boxes },
  { href: '/app/recommendations', label: 'Recommendations', icon: Sparkles },
  { href: '/app/search', label: 'Search', icon: Search },
  { href: '/app/segments', label: 'Customer Segments', icon: Users },
  { href: '/app/merchandising', label: 'Merchandising', icon: Layers },
  { href: '/app/content', label: 'Content Personalization', icon: PanelsTopLeft },
  { href: '/app/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/app/experiments', label: 'A/B Testing', icon: FlaskConical },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/assistant', label: 'AI Assistant', icon: Bot },
  { href: '/app/integrations', label: 'Integrations', icon: Plug },
  { href: '/app/team', label: 'Team Management', icon: UsersRound },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { org, memberships, switchOrg } = useOrg();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-full flex-col bg-charcoal text-white">
      <div className="flex h-16 items-center px-5"><Link href="/app" onClick={onNavigate}><Logo dark /></Link></div>
      <div className="relative px-3">
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm hover:bg-white/10" aria-expanded={open}>
          <span className="min-w-0"><span className="block text-[11px] uppercase tracking-wider text-white/50">Workspace</span><span className="block truncate font-semibold">{org.name}</span></span>
          <ChevronDown className="h-4 w-4 shrink-0 text-white/60" />
        </button>
        {open && (
          <div className="absolute inset-x-3 top-full z-10 mt-1 rounded-xl bg-ink p-1 shadow-lift">
            {memberships.map((m) => (
              <button key={m.org_id} onClick={() => { switchOrg(m.org_id); setOpen(false); onNavigate?.(); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">
                <span className="truncate">{m.organizations.name}</span>{m.org_id === org.id && <Check className="h-4 w-4 text-pink" />}
              </button>
            ))}
            <Link href="/app/settings#workspaces" onClick={() => { setOpen(false); onNavigate?.(); }} className="block rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10">Create workspace</Link>
          </div>
        )}
      </div>
      <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Dashboard">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/app' ? path === '/app' : path.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition', active ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white')}>
              <Icon className={cn('h-[18px] w-[18px]', active ? 'text-pink' : '')} />{label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

type Notification = { id: string; title: string; body: string | null; read_at: string | null; created_at: string };

function Notifications() {
  const { org } = useOrg();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    getSupabase().from('notifications').select('id, title, body, read_at, created_at').eq('org_id', org.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => setItems((data as Notification[]) ?? []));
  }, [org.id]);
  useEffect(() => {
    const on = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', on); return () => document.removeEventListener('mousedown', on);
  }, []);
  const unread = items.filter((i) => !i.read_at).length;
  async function markAll() {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    await getSupabase().from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    setItems((x) => x.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
  }
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="relative rounded-full p-2 text-muted hover:bg-soft" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-pink" />}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-charcoal/10 bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-charcoal/10 px-4 py-3"><span className="font-semibold">Notifications</span>{unread > 0 && <button onClick={markAll} className="text-xs font-semibold text-teal">Mark all as read</button>}</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p> : items.map((n) => (
              <div key={n.id} className={cn('border-b border-charcoal/5 px-4 py-3 last:border-0', !n.read_at && 'bg-pink-soft/40')}>
                <div className="text-sm font-semibold">{n.title}</div>{n.body && <div className="mt-0.5 text-xs text-muted">{n.body}</div>}<div className="mt-1 text-[11px] text-muted">{timeAgo(n.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, profile, role } = useOrg();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', on); return () => document.removeEventListener('mousedown', on);
  }, []);
  const name = profile?.full_name || user.email || 'Account';
  const initials = name.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  async function logout() {
    setBusy(true);
    await getSupabase().auth.signOut();
    router.replace('/login?notice=signed_out');
    router.refresh();
  }
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-soft" aria-expanded={open} aria-label="Account menu">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-teal text-xs font-bold text-white">{initials}</span>
        <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-charcoal/10 bg-white p-2 shadow-lift">
          <div className="px-3 py-2"><div className="truncate text-sm font-semibold">{name}</div><div className="truncate text-xs text-muted">{user.email}</div><div className="mt-1 text-xs text-teal">{ROLE_LABELS[role]}</div></div>
          <Link href="/app/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-soft"><Settings className="h-4 w-4" /> Settings</Link>
          <Button variant="ghost" className="w-full !justify-start !rounded-lg !px-3" onClick={logout} loading={busy}><LogOut className="h-4 w-4" /> Log out</Button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const path = usePathname();
  useEffect(() => { setDrawer(false); }, [path]);
  const title = NAV.find((n) => (n.href === '/app' ? path === '/app' : path.startsWith(n.href)))?.label ?? 'Dashboard';
  return (
    <div className="min-h-screen bg-[#f6f6f7]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><Sidebar /></aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]"><Sidebar onNavigate={() => setDrawer(false)} />
            <button className="absolute right-3 top-4 rounded-full p-1.5 text-white/70" onClick={() => setDrawer(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
          </div>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-charcoal/10 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
            <span className="font-display text-base font-bold lg:hidden">{title}</span>
          </div>
          <div className="flex items-center gap-1"><Notifications /><UserMenu /></div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
