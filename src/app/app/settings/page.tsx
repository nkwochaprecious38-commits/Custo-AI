'use client';
import { useEffect, useState } from 'react';
import { Check, Database, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Input, Modal, Select, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import { passwordIssues } from '../../(auth)/authErrors';
import { fmtDateTime } from '@/lib/format';

export default function SettingsPage() {
  const { org, user, profile, memberships, isAdmin, canManageData, refresh, switchOrg } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const [name, setName] = useState(profile?.full_name ?? ''); const [savingP, setSavingP] = useState(false);
  const [ws, setWs] = useState({ name: org.name, website: org.website ?? '' }); const [savingW, setSavingW] = useState(false);
  const [pw, setPw] = useState({ next: '', confirm: '' }); const [pwErr, setPwErr] = useState(''); const [savingPw, setSavingPw] = useState(false);
  const [newWs, setNewWs] = useState(false); const [nw, setNw] = useState({ name: '', website: '' }); const [nwErr, setNwErr] = useState('');
  const [demoBusy, setDemoBusy] = useState(false); const [hasDemo, setHasDemo] = useState(false);
  const [logs, setLogs] = useState<{ id: number; action: string; created_at: string; details: Record<string, unknown> }[]>([]);
  const [invites, setInvites] = useState<{ id: string; token: string; role: string; org_id: string; organizations: { name: string } | null }[]>([]);

  useEffect(() => { setWs({ name: org.name, website: org.website ?? '' }); }, [org.id, org.name, org.website]);
  useEffect(() => {
    const s = getSupabase();
    s.from('products').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('is_sample', true).then(({ count }) => setHasDemo((count ?? 0) > 0));
    s.from('audit_logs').select('id, action, created_at, details').eq('org_id', org.id).order('created_at', { ascending: false }).limit(15).then(({ data }) => setLogs(data ?? []));
  }, [org.id, demoBusy]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); if (name.trim().length < 2) return toast('error', 'Enter your full name.');
    setSavingP(true);
    const { error } = await getSupabase().from('profiles').update({ full_name: name.trim() }).eq('id', user.id);
    setSavingP(false); if (error) return toast('error', error.message);
    toast('success', 'Profile updated.'); refresh();
  }
  async function saveWorkspace(e: React.FormEvent) {
    e.preventDefault(); if (ws.name.trim().length < 2) return toast('error', 'Enter a workspace name.');
    setSavingW(true);
    const { error } = await getSupabase().from('organizations').update({ name: ws.name.trim(), website: ws.website.trim() || null }).eq('id', org.id);
    setSavingW(false); if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'workspace.updated', 'organization', org.id, { name: ws.name.trim() });
    toast('success', 'Workspace updated.'); refresh();
  }
  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwErr('');
    const issue = passwordIssues(pw.next); if (issue) return setPwErr(issue);
    if (pw.next !== pw.confirm) return setPwErr('Passwords do not match.');
    setSavingPw(true);
    const { error } = await getSupabase().auth.updateUser({ password: pw.next });
    setSavingPw(false); if (error) return setPwErr(error.message);
    setPw({ next: '', confirm: '' }); toast('success', 'Password changed.');
  }
  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault(); setNwErr('');
    if (nw.name.trim().length < 2) return setNwErr('Enter a workspace name.');
    const { data, error } = await getSupabase().rpc('create_workspace', { p_name: nw.name.trim(), p_website: nw.website.trim() || null });
    if (error) return setNwErr(error.message);
    toast('success', 'Workspace created.'); setNewWs(false); setNw({ name: '', website: '' });
    await refresh(); switchOrg(data as string);
  }
  async function demo(load: boolean) {
    if (!load && !(await confirm({ title: 'Remove demo data?', message: 'All sample products, customers, events, segments and campaigns marked as demo will be deleted. Your own data is not affected.', confirmLabel: 'Remove demo data', tone: 'danger' }))) return;
    setDemoBusy(true);
    const { error } = await getSupabase().rpc(load ? 'seed_demo_data' : 'clear_demo_data', { p_org: org.id });
    setDemoBusy(false);
    if (error) return toast('error', error.message);
    toast('success', load ? 'Demo data loaded.' : 'Demo data removed.'); refresh();
  }
  async function deleteCustomerData() {
    if (!(await confirm({ title: 'Delete all customer profiles and events?', message: 'This permanently deletes customer profiles, behavioral events, orders and search history for this workspace. Use it to fulfil data removal requests. It cannot be undone.', confirmLabel: 'Delete shopper data', tone: 'danger' }))) return;
    const s = getSupabase(); let failed: string | null = null;
    for (const t of ['recommendation_clicks', 'recommendation_impressions', 'behavioral_events', 'cart_events', 'search_queries', 'orders', 'customer_profiles']) {
      const { error } = await s.from(t).delete().eq('org_id', org.id); if (error) { failed = error.message; break; }
    }
    if (failed) return toast('error', failed);
    await logAudit(org.id, user.id, 'shopper_data.deleted', 'organization', org.id); toast('success', 'Shopper data deleted.');
  }
  useEffect(() => {
    getSupabase().from('invitations').select('id, token, role, org_id, organizations(name)').ilike('email', user.email ?? '').eq('status', 'pending').then(({ data }) => setInvites((data as unknown as typeof invites) ?? []));
  }, [user.email]);
  async function accept(token: string) {
    const { error } = await getSupabase().rpc('accept_invitation', { p_token: token });
    if (error) return toast('error', error.message); toast('success', 'Invitation accepted.'); refresh();
  }

  return (
    <>
      <PageHeader title="Settings" description="Your profile, workspace, security and data controls." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5"><h2 className="font-display font-bold">Profile</h2>
          <form onSubmit={saveProfile} className="mt-4 space-y-4"><Field label="Full name" htmlFor="pn"><Input id="pn" value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Email" htmlFor="pe"><Input id="pe" value={user.email ?? ''} disabled /></Field><Button type="submit" loading={savingP}>Save profile</Button></form></Card>
        <Card className="p-5"><h2 className="font-display font-bold">Change password</h2>
          <form onSubmit={changePassword} className="mt-4 space-y-4">{pwErr && <Alert tone="error">{pwErr}</Alert>}
            <Field label="New password" htmlFor="npw"><Input id="npw" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Field label="Confirm new password" htmlFor="cpw"><Input id="cpw" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            <Button type="submit" loading={savingPw}>Update password</Button></form></Card>
        <Card className="p-5"><h2 className="font-display font-bold">Workspace</h2><p className="mt-1 text-xs text-muted">Plan: {org.plan}. {isAdmin ? '' : 'Only admins can edit workspace details.'}</p>
          <form onSubmit={saveWorkspace} className="mt-4 space-y-4"><Field label="Workspace name" htmlFor="wn"><Input id="wn" value={ws.name} onChange={(e) => setWs({ ...ws, name: e.target.value })} disabled={!isAdmin} /></Field><Field label="Website" htmlFor="ww"><Input id="ww" value={ws.website} onChange={(e) => setWs({ ...ws, website: e.target.value })} disabled={!isAdmin} /></Field>{isAdmin && <Button type="submit" loading={savingW}>Save workspace</Button>}</form></Card>
        <Card className="p-5" id="workspaces"><div className="flex items-center justify-between"><h2 className="font-display font-bold">Your workspaces</h2><Button size="sm" variant="secondary" onClick={() => setNewWs(true)}><Plus className="h-4 w-4" /> Create</Button></div>
          <ul className="mt-3 divide-y divide-charcoal/5 text-sm">{memberships.map((m) => <li key={m.org_id} className="flex items-center justify-between py-2.5"><span>{m.organizations.name}</span>{m.org_id === org.id ? <Badge tone="teal"><Check className="h-3 w-3" /> Current</Badge> : <Button size="sm" variant="ghost" onClick={() => switchOrg(m.org_id)}>Switch</Button>}</li>)}</ul>
          {invites.length > 0 && <div className="mt-4 space-y-2"><h3 className="text-sm font-semibold">Pending invitations</h3>{invites.map((i) => <div key={i.id} className="flex items-center justify-between rounded-xl bg-pink-soft/50 p-3 text-sm"><span>{i.organizations?.name ?? 'Workspace'}</span><Button size="sm" onClick={() => accept(i.token)}>Accept</Button></div>)}</div>}</Card>
        <Card className="p-5"><h2 className="flex items-center gap-2 font-display font-bold"><Database className="h-4 w-4" /> Demo data</h2>
          <p className="mt-1 text-sm text-muted">A generated sample store lets you explore every module. It is clearly labeled and can be removed at any time.</p>
          <div className="mt-4 flex gap-2">{hasDemo ? <Button variant="secondary" onClick={() => demo(false)} loading={demoBusy} disabled={!canManageData}>Remove demo data</Button> : <Button onClick={() => demo(true)} loading={demoBusy} disabled={!canManageData}>Load demo data</Button>}</div>
          {!canManageData && <p className="mt-2 text-xs text-muted">Only admins, store managers and e-commerce managers can change demo data.</p>}</Card>
        <Card className="p-5"><h2 className="font-display font-bold">Privacy and shopper data</h2>
          <p className="mt-1 text-sm text-muted">Custo AI only stores shopper events when your storefront reports consent. Use this to delete shopper data after a removal request.</p>
          <Button className="mt-4" variant="danger" onClick={deleteCustomerData} disabled={!isAdmin}><Trash2 className="h-4 w-4" /> Delete all shopper data</Button></Card>
        <Card className="p-5 lg:col-span-2"><h2 className="font-display font-bold">Audit log</h2>
          {logs.length === 0 ? <p className="mt-3 text-sm text-muted">No activity recorded or you do not have access.</p> : <ul className="mt-3 divide-y divide-charcoal/5 text-sm">{logs.map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b>{l.action}</b>{typeof l.details?.name === 'string' && <span className="text-muted">: {l.details.name}</span>}</span><span className="text-xs text-muted">{fmtDateTime(l.created_at)}</span></li>)}</ul>}</Card>
      </div>
      <Modal open={newWs} onClose={() => setNewWs(false)} title="Create workspace" size="sm" footer={<><Button variant="secondary" onClick={() => setNewWs(false)}>Cancel</Button><Button type="submit" form="nw">Create</Button></>}>
        <form id="nw" onSubmit={createWorkspace} className="space-y-4">{nwErr && <Alert tone="error">{nwErr}</Alert>}<Field label="Name" htmlFor="nwn"><Input id="nwn" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} /></Field><Field label="Website" htmlFor="nww" hint="(optional)"><Input id="nww" value={nw.website} onChange={(e) => setNw({ ...nw, website: e.target.value })} /></Field></form>
      </Modal>
    </>
  );
}
