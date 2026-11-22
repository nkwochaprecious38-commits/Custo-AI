import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { jsonError, requireMember } from '@/lib/serverAuth';

const ROLES = ['org_admin', 'store_manager', 'ecommerce_manager', 'marketing_manager', 'analyst', 'team_member'];

/** Creates an invitation (RLS enforces admin) and emails it when the server has a service role key. */
export async function POST(req: NextRequest) {
  const { org_id, email, role } = await req.json().catch(() => ({}));
  const auth = await requireMember(org_id, ['org_admin']);
  if ('error' in auth) return auth.error;
  const addr = String(email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr)) return jsonError('Enter a valid email address.');
  if (!ROLES.includes(role)) return jsonError('Choose a valid role.');
  const { data: existing } = await auth.supabase.from('invitations').select('id').eq('org_id', org_id).ilike('email', addr).eq('status', 'pending').maybeSingle();
  if (existing) return jsonError('There is already a pending invitation for this email.', 409);
  const { data: inv, error } = await auth.supabase.from('invitations').insert({ org_id, email: addr, role, invited_by: auth.user.id }).select('id, token').single();
  if (error) return jsonError(error.message, 500);
  await auth.supabase.from('audit_logs').insert({ org_id, user_id: auth.user.id, action: 'member.invited', entity_type: 'invitation', entity_id: inv.id, details: { email: addr, role } });

  const site = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const link = `${site}/signup?invite=${inv.token}&email=${encodeURIComponent(addr)}`;
  let emailed = false; let note: string | null = null;
  const admin = getAdminSupabase();
  if (admin) {
    const { data: org } = await admin.from('organizations').select('name').eq('id', org_id).single();
    const { error: mailErr } = await admin.auth.admin.inviteUserByEmail(addr, { redirectTo: `${site}/auth/callback?next=${encodeURIComponent('/reset-password?invited=1')}`, data: { invite_token: inv.token, company_name: org?.name } });
    if (!mailErr) emailed = true;
    else note = /already been registered|already exists/i.test(mailErr.message) ? 'This person already has an account. Share the link so they can accept from Settings.' : 'The invitation email could not be sent. Share the link instead.';
  } else note = 'Email sending needs the service role key. Share the invitation link instead.';
  return NextResponse.json({ ok: true, emailed, link, note });
}
