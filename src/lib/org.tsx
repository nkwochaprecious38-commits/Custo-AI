'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase/client';

export type Role = 'org_admin' | 'store_manager' | 'ecommerce_manager' | 'marketing_manager' | 'analyst' | 'team_member';
export const ROLE_LABELS: Record<Role, string> = {
  org_admin: 'Organization Admin',
  store_manager: 'Store Manager',
  ecommerce_manager: 'E-commerce Manager',
  marketing_manager: 'Marketing Manager',
  analyst: 'Analyst',
  team_member: 'Team Member',
};
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  org_admin: 'Full access including team, billing settings and integrations.',
  store_manager: 'Manage stores, catalog, campaigns and demo data.',
  ecommerce_manager: 'Manage catalog, recommendations, search and merchandising.',
  marketing_manager: 'Manage segments, content, campaigns and experiments.',
  analyst: 'View all data and reports, including audit logs.',
  team_member: 'View dashboards and data.',
};
const EDIT_ROLES: Role[] = ['org_admin', 'store_manager', 'ecommerce_manager', 'marketing_manager'];

export type Org = { id: string; name: string; slug: string | null; website: string | null; plan: string; demo_seeded_at: string | null };
type Membership = { org_id: string; role: Role; organizations: Org };
type Profile = { id: string; full_name: string | null; email: string | null };

type Ctx = {
  user: User; profile: Profile | null; org: Org; role: Role; memberships: Membership[];
  canEdit: boolean; isAdmin: boolean; canManageData: boolean;
  switchOrg: (id: string) => void; refresh: () => Promise<void>;
};

const OrgCtx = createContext<Ctx | null>(null);
const KEY = 'custo_current_org';
let inflightWorkspace: Promise<{ error: { message: string } | null }> | null = null;

export function useOrg() {
  const c = useContext(OrgCtx);
  if (!c) throw new Error('useOrg must be used inside OrgProvider');
  return c;
}

export function OrgProvider({ children, loading, failed }: { children: ReactNode; loading: ReactNode; failed: (msg: string, retry: () => void) => ReactNode }) {
  const [state, setState] = useState<{ user: User; profile: Profile | null; memberships: Membership[] } | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login?error=session'; return; }
    const [{ data: profile }, { data: memberships, error: mErr }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('id', user.id).maybeSingle(),
      supabase.from('organization_members').select('org_id, role, organizations(id, name, slug, website, plan, demo_seeded_at)').eq('user_id', user.id).order('created_at'),
    ]);
    if (mErr) {
      const m = mErr.message || '';
      const hint = /invalid schema|PGRST106/i.test(m) ? ' The "custo" schema is not exposed yet: add it under Supabase, Project Settings, Data API, Exposed schemas.'
        : /does not exist|PGRST20[0-9]|schema cache/i.test(m) ? ' The Custo AI tables were not found: run supabase/custo_schema.sql in the Supabase SQL editor.'
        : /permission denied/i.test(m) ? ' Database permissions are missing for the custo schema: re-run supabase/custo_schema.sql.' : '';
      setError('We could not load your workspace. Details: ' + m + '.' + hint); return;
    }
    // Ignore memberships whose workspace cannot be read (for example when database access rules are misconfigured)
    let ms = ((memberships ?? []) as unknown as Membership[]).filter((m) => m.organizations);
    if (ms.length === 0) {
      // Safety net: provision a workspace if the signup trigger did not run.
      const name = (user.user_metadata?.company_name as string) || 'My workspace';
      // Share one in-flight request so concurrent loads (for example React strict mode) cannot create two workspaces
      inflightWorkspace ??= Promise.resolve(supabase.rpc('create_workspace', { p_name: name, p_website: user.user_metadata?.website ?? null })).finally(() => { setTimeout(() => { inflightWorkspace = null; }, 3000); });
      const { error: wErr } = await inflightWorkspace;
      if (wErr) { setError('Your account has no workspace yet and we could not create one: ' + wErr.message); return; }
      const again = await supabase.from('organization_members').select('org_id, role, organizations(id, name, slug, website, plan, demo_seeded_at)').eq('user_id', user.id);
      ms = ((again.data ?? []) as unknown as Membership[]).filter((m) => m.organizations);
      if (ms.length === 0) { setError('Your workspace was created but cannot be read. The database access rules for this project may have been changed. Ask your administrator to re-run the Custo AI setup SQL.'); return; }
    }
    // Load the demo dataset once for new workspaces so every module has clearly labeled sample data.
    for (const m of ms) {
      if (!m.organizations.demo_seeded_at && ['org_admin', 'store_manager', 'ecommerce_manager'].includes(m.role)) {
        const { error: sErr } = await supabase.rpc('seed_demo_data', { p_org: m.org_id });
        if (!sErr) m.organizations.demo_seeded_at = new Date().toISOString();
      }
    }
    setState({ user, profile: profile as Profile | null, memberships: ms });
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    setCurrentId((cur) => [cur, saved].find((x) => x && ms.some((m) => m.org_id === x)) ?? ms[0]?.org_id ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = useMemo<Ctx | null>(() => {
    if (!state || !currentId) return null;
    const m = state.memberships.find((x) => x.org_id === currentId) ?? state.memberships[0];
    if (!m) return null;
    return {
      user: state.user, profile: state.profile, memberships: state.memberships, org: m.organizations, role: m.role,
      canEdit: EDIT_ROLES.includes(m.role), isAdmin: m.role === 'org_admin',
      canManageData: ['org_admin', 'store_manager', 'ecommerce_manager'].includes(m.role),
      switchOrg: (id: string) => { try { localStorage.setItem(KEY, id); } catch {} setCurrentId(id); },
      refresh: load,
    };
  }, [state, currentId, load]);

  if (error) return <>{failed(error, load)}</>;
  if (!value) return <>{loading}</>;
  return <OrgCtx.Provider value={value}>{children}</OrgCtx.Provider>;
}

export async function logAudit(orgId: string, userId: string, action: string, entityType?: string, entityId?: string, details?: Record<string, unknown>) {
  await getSupabase().from('audit_logs').insert({ org_id: orgId, user_id: userId, action, entity_type: entityType ?? null, entity_id: entityId ?? null, details: details ?? {} });
}

export async function logAuditSafe(orgId: string, userId: string, action: string, entityId?: string, details?: Record<string, unknown>) {
  await logAudit(orgId, userId, action, 'member', entityId, details);
}
