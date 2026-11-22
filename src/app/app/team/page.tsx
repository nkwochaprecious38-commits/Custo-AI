'use client';
import { useCallback, useEffect, useState } from 'react';
import { Copy, Mail, Plus, Trash2, UsersRound } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Input, LoadingBlock, Modal, Select, StatusBadge, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { getSupabase } from '@/lib/supabase/client';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, logAuditSafe, useOrg, type Role } from '@/lib/org';
import { fmtDate, timeAgo } from '@/lib/format';

type Member = { user_id: string; role: Role; created_at: string; profiles: { full_name: string | null; email: string | null } | null };
type Invite = { id: string; email: string; role: Role; status: string; created_at: string; token: string };
const ROLES = Object.keys(ROLE_LABELS) as Role[];

export default function TeamPage() {
  const { org, user, isAdmin } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ email: string; role: Role }>({ email: '', role: 'team_member' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ link: string; emailed: boolean; note: string | null } | null>(null);
  const [logs, setLogs] = useState<{ id: number; action: string; created_at: string; details: Record<string, unknown> }[]>([]);

  const load = useCallback(async () => {
    const s = getSupabase();
    const [{ data: m }, { data: i }, { data: l }] = await Promise.all([
      s.from('organization_members').select('user_id, role, created_at, profiles(full_name, email)').eq('org_id', org.id).order('created_at'),
      isAdmin ? s.from('invitations').select('id, email, role, status, created_at, token').eq('org_id', org.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      s.from('audit_logs').select('id, action, created_at, details').eq('org_id', org.id).like('action', 'member.%').order('created_at', { ascending: false }).limit(10),
    ]);
    setMembers((m as unknown as Member[]) ?? []); setInvites((i as Invite[]) ?? []); setLogs(l ?? []);
  }, [org.id, isAdmin]);
  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return setErr('Enter a valid email address.');
    setBusy(true);
    const r = await fetch('/api/team/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ org_id: org.id, ...form }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error ?? 'Could not send the invitation.');
    setResult(j); load();
  }
  async function changeRole(m: Member, role: Role) {
    const { error } = await getSupabase().from('organization_members').update({ role }).eq('org_id', org.id).eq('user_id', m.user_id);
    if (error) { toast('error', error.message); return load(); }
    await logAuditSafe(org.id, user.id, 'member.role_changed', m.user_id, { name: m.profiles?.email ?? '', role }); toast('success', 'Role updated.'); load();
  }
  async function removeMember(m: Member) {
    const self = m.user_id === user.id;
    if (!(await confirm({ title: self ? 'Leave workspace?' : 'Remove team member?', message: self ? 'You will lose access to this workspace.' : `${m.profiles?.full_name ?? m.profiles?.email} will lose access immediately.`, confirmLabel: self ? 'Leave' : 'Remove', tone: 'danger' }))) return;
    const { error } = await getSupabase().from('organization_members').delete().eq('org_id', org.id).eq('user_id', m.user_id);
    if (error) return toast('error', error.message);
    await logAuditSafe(org.id, user.id, 'member.removed', m.user_id, { name: m.profiles?.email ?? '' });
    if (self) window.location.href = '/app'; else load();
  }
  async function revoke(i: Invite) {
    const { error } = await getSupabase().from('invitations').update({ status: 'revoked' }).eq('id', i.id);
    if (error) return toast('error', error.message); load();
  }
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast('success', 'Link copied.'); } catch { toast('error', 'Copy failed.'); } };

  return (
    <>
      <PageHeader title="Team Management" description="Invite teammates and control what each role can do."
        actions={isAdmin && <Button onClick={() => { setOpen(true); setResult(null); setErr(''); setForm({ email: '', role: 'team_member' }); }}><Plus className="h-4 w-4" /> Invite member</Button>} />
      {!isAdmin && <Alert tone="info" className="mb-5">Only Organization Admins can invite members or change roles.</Alert>}
      <Card>
        <div className="border-b border-charcoal/5 px-5 py-4 font-display font-bold">Members</div>
        {!members ? <LoadingBlock /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-muted"><th className="px-5 py-3">Member</th><th className="px-3">Role</th><th className="px-3">Joined</th><th className="px-5" /></tr></thead>
            <tbody className="divide-y divide-charcoal/5">{members.map((m) => (
              <tr key={m.user_id}><td className="px-5 py-3"><div className="font-medium">{m.profiles?.full_name ?? 'Member'} {m.user_id === user.id && <Badge tone="teal">You</Badge>}</div><div className="text-xs text-muted">{m.profiles?.email}</div></td>
                <td className="px-3">{isAdmin ? <Select value={m.role} onChange={(e) => changeRole(m, e.target.value as Role)} className="!w-auto !py-1.5" aria-label={`Role for ${m.profiles?.email}`}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select> : ROLE_LABELS[m.role]}</td>
                <td className="px-3 text-muted">{fmtDate(m.created_at)}</td>
                <td className="px-5 text-right">{(isAdmin || m.user_id === user.id) && <button onClick={() => removeMember(m)} className="rounded-lg p-2 text-muted hover:bg-soft hover:text-danger" aria-label={m.user_id === user.id ? 'Leave workspace' : `Remove ${m.profiles?.email}`}><Trash2 className="h-4 w-4" /></button>}</td></tr>
            ))}</tbody></table></div>
        )}
      </Card>
      {isAdmin && invites.length > 0 && (
        <Card className="mt-5"><div className="border-b border-charcoal/5 px-5 py-4 font-display font-bold">Invitations</div>
          <ul className="divide-y divide-charcoal/5">{invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"><div><div className="font-medium">{i.email}</div><div className="text-xs text-muted">{ROLE_LABELS[i.role]} · invited {timeAgo(i.created_at)}</div></div>
              <div className="flex items-center gap-2"><StatusBadge status={i.status} />{i.status === 'pending' && <><Button size="sm" variant="ghost" onClick={() => copy(`${window.location.origin}/signup?invite=${i.token}&email=${encodeURIComponent(i.email)}`)}><Copy className="h-4 w-4" /> Copy link</Button><Button size="sm" variant="ghost" onClick={() => revoke(i)}>Revoke</Button></>}</div></li>))}</ul></Card>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5"><h2 className="font-display font-bold">Roles</h2><dl className="mt-3 space-y-3 text-sm">{ROLES.map((r) => <div key={r}><dt className="font-semibold">{ROLE_LABELS[r]}</dt><dd className="text-muted">{ROLE_DESCRIPTIONS[r]}</dd></div>)}</dl></Card>
        <Card className="p-5"><h2 className="font-display font-bold">Recent team activity</h2>{logs.length === 0 ? <p className="mt-3 text-sm text-muted">No team activity yet.</p> : <ul className="mt-3 space-y-2 text-sm">{logs.map((l) => <li key={l.id} className="flex justify-between gap-3"><span>{l.action.replace('member.', '').replace('_', ' ')}{typeof l.details?.email === 'string' ? `: ${l.details.email}` : typeof l.details?.name === 'string' ? `: ${l.details.name}` : ''}</span><span className="shrink-0 text-xs text-muted">{timeAgo(l.created_at)}</span></li>)}</ul>}</Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Invite a team member" footer={result ? <Button onClick={() => setOpen(false)}>Done</Button> : <><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="invite-form" loading={busy}><Mail className="h-4 w-4" /> Send invitation</Button></>}>
        {result ? <div className="space-y-3 text-sm"><Alert tone="success">{result.emailed ? 'Invitation email sent.' : 'Invitation created.'}</Alert>{result.note && <Alert tone="warning">{result.note}</Alert>}
          <div className="flex gap-2"><Input readOnly value={result.link} aria-label="Invitation link" /><Button variant="secondary" onClick={() => copy(result.link)}><Copy className="h-4 w-4" /></Button></div></div> : (
          <form id="invite-form" onSubmit={invite} className="space-y-4">{err && <Alert tone="error">{err}</Alert>}
            <Field label="Email" htmlFor="ie"><Input id="ie" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Role" htmlFor="ir"><Select id="ir" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select><p className="mt-1 text-xs text-muted">{ROLE_DESCRIPTIONS[form.role]}</p></Field>
          </form>)}
      </Modal>
    </>
  );
}
