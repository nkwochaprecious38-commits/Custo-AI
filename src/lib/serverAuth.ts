import 'server-only';
import { NextResponse } from 'next/server';
import { getServerSupabase } from './supabase/server';

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Resolves the signed in user and their role in the given organization, using their own session (RLS applies). */
export async function requireMember(orgId: unknown, roles?: string[]) {
  if (typeof orgId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orgId)) return { error: jsonError('A valid organization is required.', 400) } as const;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: jsonError('You need to be logged in.', 401) } as const;
  const { data: m } = await supabase.from('organization_members').select('role').eq('org_id', orgId).eq('user_id', user.id).maybeSingle();
  if (!m) return { error: jsonError('You do not have access to this workspace.', 403) } as const;
  if (roles && !roles.includes(m.role)) return { error: jsonError('Your role does not allow this action.', 403) } as const;
  return { user, role: m.role as string, supabase } as const;
}
