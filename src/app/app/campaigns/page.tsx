'use client';
import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, DemoBadge, EmptyState, Field, Input, LoadingBlock, Modal, Select, StatusBadge, Textarea, labelize, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import { fmtDate, fromLocalInput, toLocalInput } from '@/lib/format';

type Camp = { id: string; name: string; objective: string; segment_id: string | null; status: string; starts_at: string | null; ends_at: string | null; notes: string | null; is_sample: boolean };
type Row = { id: string; name: string; campaign_id: string | null };
type Linked = { rec: Row[]; content: Row[]; merch: Row[] };
const OBJ = ['awareness', 'engagement', 'conversion', 'retention', 'clearance'];

export default function CampaignsPage() {
  const { org, user, canEdit } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const [items, setItems] = useState<Camp[] | null>(null);
  const [segs, setSegs] = useState<{ id: string; name: string }[]>([]);
  const [linked, setLinked] = useState<Linked>({ rec: [], content: [], merch: [] });
  const [edit, setEdit] = useState<Partial<Camp> | null>(null);
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const s = getSupabase();
    const [c, sg, r, ct, m] = await Promise.all([
      s.from('commerce_campaigns').select('*').eq('org_id', org.id).order('created_at', { ascending: false }),
      s.from('customer_segments').select('id, name').eq('org_id', org.id),
      s.from('recommendation_campaigns').select('id, name, campaign_id').eq('org_id', org.id),
      s.from('content_campaigns').select('id, name, campaign_id').eq('org_id', org.id),
      s.from('merchandising_rules').select('id, name, campaign_id').eq('org_id', org.id),
    ]);
    setItems((c.data as Camp[]) ?? []); setSegs(sg.data ?? []);
    setLinked({ rec: r.data ?? [], content: ct.data ?? [], merch: m.data ?? [] });
  }, [org.id]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!edit) return; setErr('');
    if (!edit.name?.trim()) return setErr('Enter a campaign name.');
    if (edit.starts_at && edit.ends_at && new Date(edit.ends_at) <= new Date(edit.starts_at)) return setErr('The end date must be after the start date.');
    setSaving(true);
    const row = { org_id: org.id, name: edit.name.trim(), objective: edit.objective ?? 'conversion', segment_id: edit.segment_id || null, status: edit.status ?? 'draft', starts_at: edit.starts_at ?? null, ends_at: edit.ends_at ?? null, notes: edit.notes?.trim() || null };
    const s = getSupabase();
    const r = edit.id
      ? await s.from('commerce_campaigns').update(row).eq('id', edit.id).select('id').single()
      : await s.from('commerce_campaigns').insert({ ...row, created_by: user.id }).select('id').single();
    setSaving(false);
    if (r.error) return setErr(r.error.message);
    await logAudit(org.id, user.id, edit.id ? 'campaign.updated' : 'campaign.created', 'campaign', r.data.id, { name: row.name });
    toast('success', 'Campaign saved.'); setEdit(null); load();
  }
  async function remove(c: Camp) {
    if (!(await confirm({ title: 'Delete campaign?', message: `"${c.name}" will be removed. Linked recommendations, content and rules stay, but are no longer grouped.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    const { error } = await getSupabase().from('commerce_campaigns').delete().eq('id', c.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'campaign.deleted', 'campaign', c.id, { name: c.name }); load();
  }
  async function link(table: 'recommendation_campaigns' | 'content_campaigns' | 'merchandising_rules', id: string, campaignId: string | null) {
    const { error } = await getSupabase().from(table).update({ campaign_id: campaignId }).eq('id', id);
    if (error) toast('error', error.message); else load();
  }
  const count = (id: string) => [...linked.rec, ...linked.content, ...linked.merch].filter((x) => x.campaign_id === id).length;
  const groups = [['recommendation_campaigns', 'Recommendation campaigns', linked.rec], ['content_campaigns', 'Content campaigns', linked.content], ['merchandising_rules', 'Merchandising rules', linked.merch]] as const;

  return (
    <>
      <PageHeader title="Campaigns" description="Plan commerce campaigns, set dates and audiences, and group the recommendations, content and merchandising behind them."
        actions={canEdit && <Button onClick={() => { setEdit({ name: '', objective: 'conversion', status: 'draft' }); setErr(''); }}><Plus className="h-4 w-4" /> New campaign</Button>} />
      {!items ? <LoadingBlock /> : items.length === 0 ? <Card><EmptyState icon={Megaphone} title="No campaigns yet" description="Create a campaign to organize related activity and its schedule." /></Card> : (
        <Card className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-charcoal/10 text-left text-xs uppercase tracking-wide text-muted"><th className="px-4 py-3">Campaign</th><th className="px-3">Objective</th><th className="px-3">Audience</th><th className="px-3">Schedule</th><th className="px-3">Linked items</th><th className="px-3">Status</th><th className="px-4" /></tr></thead>
          <tbody className="divide-y divide-charcoal/5">{items.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium">{c.name} {c.is_sample && <DemoBadge />}</td>
              <td className="px-3">{labelize(c.objective)}</td>
              <td className="px-3">{segs.find((s) => s.id === c.segment_id)?.name ?? 'All shoppers'}</td>
              <td className="px-3 text-muted">{c.starts_at ? fmtDate(c.starts_at) : 'No start'} to {c.ends_at ? fmtDate(c.ends_at) : 'open'}</td>
              <td className="px-3"><Badge>{count(c.id)}</Badge></td>
              <td className="px-3"><StatusBadge status={c.status} /></td>
              <td className="px-4">{canEdit && <div className="flex justify-end gap-1">
                <button className="rounded-lg p-2 text-muted hover:bg-soft" onClick={() => { setEdit(c); setErr(''); }} aria-label={`Edit ${c.name}`}><Pencil className="h-4 w-4" /></button>
                <button className="rounded-lg p-2 text-muted hover:bg-soft hover:text-danger" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 className="h-4 w-4" /></button></div>}</td>
            </tr>
          ))}</tbody></table></Card>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit campaign' : 'New campaign'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save campaign</Button></>}>
        {edit && <div className="space-y-4">
          {err && <Alert tone="error">{err}</Alert>}
          <Field label="Name" htmlFor="cpn"><Input id="cpn" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Objective" htmlFor="cpo"><Select id="cpo" value={edit.objective} onChange={(e) => setEdit({ ...edit, objective: e.target.value })}>{OBJ.map((o) => <option key={o} value={o}>{labelize(o)}</option>)}</Select></Field>
            <Field label="Audience" htmlFor="cpa"><Select id="cpa" value={edit.segment_id ?? ''} onChange={(e) => setEdit({ ...edit, segment_id: e.target.value || null })}><option value="">All shoppers</option>{segs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Status" htmlFor="cps"><Select id="cps" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{['draft', 'scheduled', 'active', 'paused', 'completed'].map((o) => <option key={o} value={o}>{labelize(o)}</option>)}</Select></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts" htmlFor="cp1"><Input id="cp1" type="datetime-local" value={toLocalInput(edit.starts_at)} onChange={(e) => setEdit({ ...edit, starts_at: fromLocalInput(e.target.value) })} /></Field>
            <Field label="Ends" htmlFor="cp2"><Input id="cp2" type="datetime-local" value={toLocalInput(edit.ends_at)} onChange={(e) => setEdit({ ...edit, ends_at: fromLocalInput(e.target.value) })} /></Field>
          </div>
          <Field label="Notes" htmlFor="cpt"><Textarea id="cpt" value={edit.notes ?? ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
          {edit.id ? (
            <div className="rounded-xl bg-soft/60 p-4"><h3 className="text-sm font-semibold">Linked activity</h3>
              {groups.map(([table, label, rows]) => (
                <div key={table} className="mt-3"><div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">{rows.filter((r) => r.campaign_id === edit.id).map((r) => <button key={r.id} onClick={() => link(table, r.id, null)} className="rounded-full bg-white px-2.5 py-1 text-xs">{r.name} ×</button>)}</div>
                  <Select value="" onChange={(e) => e.target.value && link(table, e.target.value, edit.id!)} className="mt-1.5 !py-1.5 text-xs" aria-label={`Link ${label}`}><option value="">Link an item</option>{rows.filter((r) => r.campaign_id !== edit.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></div>
              ))}
            </div>
          ) : <p className="text-xs text-muted">Save the campaign first, then link recommendations, content and merchandising rules to it.</p>}
        </div>}
      </Modal>
    </>
  );
}
