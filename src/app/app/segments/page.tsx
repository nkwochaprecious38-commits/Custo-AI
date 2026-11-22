'use client';
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { Alert, Button, Card, DemoBadge, EmptyState, Field, Input, LoadingBlock, Modal, Select, StatusBadge, Textarea, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import type { Segment, SegmentRule } from '@/lib/types';
import { fmtMoney, fmtNum, fmtPct, ratio, timeAgo } from '@/lib/format';

const FIELDS: { id: string; label: string; kind: 'num' | 'bool' | 'text' }[] = [
  { id: 'total_spent', label: 'Total spent', kind: 'num' }, { id: 'total_orders', label: 'Number of orders', kind: 'num' }, { id: 'visit_count', label: 'Number of visits', kind: 'num' },
  { id: 'discount_orders', label: 'Orders with a discount', kind: 'num' }, { id: 'days_since_last_seen', label: 'Days since last visit', kind: 'num' }, { id: 'days_since_first_seen', label: 'Days since first visit', kind: 'num' },
  { id: 'has_abandoned_cart', label: 'Has abandoned cart', kind: 'bool' }, { id: 'favorite_category', label: 'Favorite category', kind: 'text' }, { id: 'country', label: 'Country', kind: 'text' },
  { id: 'device', label: 'Device', kind: 'text' }, { id: 'consent_status', label: 'Consent status', kind: 'text' },
];
const OPS = { num: [['gt', 'greater than'], ['gte', 'at least'], ['lt', 'less than'], ['lte', 'at most'], ['eq', 'equals']], bool: [['eq', 'is']], text: [['eq', 'is'], ['neq', 'is not'], ['contains', 'contains']] } as const;
type Stats = { customers: number; revenue: number; orders: number; avg_spent: number; total_customers: number };
type Cust = { id: string; external_id: string | null; email: string | null; total_orders: number; total_spent: number; visit_count: number; favorite_category: string | null; last_seen_at: string };

export default function SegmentsPage() {
  const { org, user, canEdit } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const [list, setList] = useState<(Segment & Partial<Stats>)[] | null>(null);
  const [edit, setEdit] = useState<Partial<Segment> | null>(null);
  const [live, setLive] = useState<Stats | null>(null); const [preview, setPreview] = useState<Cust[]>([]);
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const s = getSupabase();
    const [{ data }, { data: perf }] = await Promise.all([s.from('customer_segments').select('*').eq('org_id', org.id).order('created_at'), s.rpc('segment_performance', { p_org: org.id })]);
    const m = new Map(((perf ?? []) as (Stats & { id: string })[]).map((x) => [x.id, x]));
    setList(((data ?? []) as Segment[]).map((x) => ({ ...x, ...m.get(x.id) })));
  }, [org.id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!edit) return;
    const t = setTimeout(async () => {
      const valid = (edit.rules ?? []).every((r) => r.value !== '');
      if (!valid) return;
      const s = getSupabase();
      const [st, pv] = await Promise.all([s.rpc('segment_stats', { p_org: org.id, p_rules: edit.rules ?? [], p_match: edit.match_type ?? 'all' }), s.rpc('segment_preview', { p_org: org.id, p_rules: edit.rules ?? [], p_match: edit.match_type ?? 'all', p_limit: 8 })]);
      if (st.error) { setErr(st.error.message); return; }
      setErr(''); setLive(st.data as Stats); setPreview((pv.data as Cust[]) ?? []);
    }, 350);
    return () => clearTimeout(t);
  }, [edit, org.id]);

  const rules = edit?.rules ?? [];
  const setRule = (i: number, r: Partial<SegmentRule>) => setEdit({ ...edit, rules: rules.map((x, j) => (j === i ? { ...x, ...r } : x)) });

  async function save() {
    if (!edit?.name?.trim()) return setErr('Enter a segment name.');
    if (rules.some((r) => r.value === '')) return setErr('Every rule needs a value.');
    setSaving(true);
    const row = { org_id: org.id, name: edit.name.trim(), description: edit.description?.trim() || null, match_type: edit.match_type ?? 'all', rules, status: edit.status ?? 'active' };
    const s = getSupabase();
    const r = edit.id ? await s.from('customer_segments').update(row).eq('id', edit.id).select('id').single() : await s.from('customer_segments').insert({ ...row, created_by: user.id }).select('id').single();
    setSaving(false);
    if (r.error) return setErr(r.error.message);
    await logAudit(org.id, user.id, edit.id ? 'segment.updated' : 'segment.created', 'segment', r.data.id, { name: row.name });
    toast('success', 'Segment saved.'); setEdit(null); load();
  }
  async function remove(sg: Segment) {
    if (!(await confirm({ title: 'Delete segment?', message: `"${sg.name}" will be removed. Campaigns that target it will fall back to all shoppers.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    const { error } = await getSupabase().from('customer_segments').delete().eq('id', sg.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'segment.deleted', 'segment', sg.id, { name: sg.name }); load();
  }

  return (
    <>
      <PageHeader title="Customer Segments" description="Group shoppers by value, behavior and preferences. Segments can target recommendations, content and experiments."
        actions={canEdit && <Button onClick={() => { setEdit({ name: '', match_type: 'all', rules: [{ field: 'total_spent', operator: 'gt', value: '100' }], status: 'active' }); setErr(''); setLive(null); }}><Plus className="h-4 w-4" /> New segment</Button>} />
      <Alert tone="info" className="mb-5">Customer profiles are built only from shoppers whose consent was recorded by your storefront. Segment sizes update as new data arrives.</Alert>
      {!list ? <LoadingBlock /> : list.length === 0 ? <Card><EmptyState icon={Users} title="No segments yet" description="Create your first segment, for example high value customers or first time visitors." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((sg) => (
          <Card key={sg.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2"><h2 className="font-display text-lg font-bold">{sg.name}</h2><div className="flex gap-1">{sg.is_sample && <DemoBadge />}<StatusBadge status={sg.status} /></div></div>
            {sg.description && <p className="mt-1 text-sm text-muted">{sg.description}</p>}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-soft/70 p-2"><div className="text-[11px] text-muted">Customers</div><div className="font-display font-extrabold">{fmtNum(sg.customers)}</div></div>
              <div className="rounded-xl bg-soft/70 p-2"><div className="text-[11px] text-muted">Share</div><div className="font-display font-extrabold">{fmtPct(ratio(sg.customers ?? 0, sg.total_customers ?? 0))}</div></div>
              <div className="rounded-xl bg-soft/70 p-2"><div className="text-[11px] text-muted">Avg spent</div><div className="font-display font-extrabold">{fmtMoney(sg.avg_spent)}</div></div>
            </div>
            <ul className="mt-4 flex-1 space-y-1 text-xs text-muted">{sg.rules.map((r, i) => <li key={i}>{i > 0 && <b className="mr-1 uppercase">{sg.match_type === 'any' ? 'or' : 'and'}</b>}{FIELDS.find((f) => f.id === r.field)?.label} {OPS[FIELDS.find((f) => f.id === r.field)?.kind ?? 'num'].find((o) => o[0] === r.operator)?.[1]} <b className="text-charcoal">{r.value}</b></li>)}</ul>
            <div className="mt-4 flex items-center justify-between text-xs text-muted"><span>Updated {timeAgo(sg.updated_at)}</span>
              {canEdit && <div className="flex gap-1"><button className="rounded-lg p-2 hover:bg-soft" onClick={() => { setEdit(sg); setErr(''); }} aria-label={`Edit ${sg.name}`}><Pencil className="h-4 w-4" /></button><button className="rounded-lg p-2 hover:bg-soft hover:text-danger" onClick={() => remove(sg)} aria-label={`Delete ${sg.name}`}><Trash2 className="h-4 w-4" /></button></div>}</div>
          </Card>
        ))}</div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit segment' : 'New segment'} size="xl"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save segment</Button></>}>
        {edit && (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4">
              {err && <Alert tone="error">{err}</Alert>}
              <Field label="Name" htmlFor="sgn"><Input id="sgn" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Description" htmlFor="sgd"><Textarea id="sgd" value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="!min-h-[60px]" /></Field>
              <div className="flex items-center gap-2 text-sm">Match <Select value={edit.match_type} onChange={(e) => setEdit({ ...edit, match_type: e.target.value as 'all' | 'any' })} className="!w-auto !py-1.5" aria-label="Match type"><option value="all">all rules</option><option value="any">any rule</option></Select></div>
              <div className="space-y-2">{rules.map((r, i) => { const kind = FIELDS.find((f) => f.id === r.field)?.kind ?? 'num'; return (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-soft/60 p-2 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
                  <Select value={r.field} onChange={(e) => { const k = FIELDS.find((f) => f.id === e.target.value)!.kind; setRule(i, { field: e.target.value, operator: OPS[k][0][0], value: k === 'bool' ? 'true' : '' }); }} aria-label="Field">{FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</Select>
                  <Select value={r.operator} onChange={(e) => setRule(i, { operator: e.target.value })} aria-label="Operator" className="order-3 sm:order-none">{OPS[kind].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                  {kind === 'bool' ? <Select value={r.value} onChange={(e) => setRule(i, { value: e.target.value })} aria-label="Value" className="order-4 sm:order-none"><option value="true">Yes</option><option value="false">No</option></Select>
                    : <Input value={r.value} onChange={(e) => setRule(i, { value: e.target.value })} inputMode={kind === 'num' ? 'decimal' : 'text'} aria-label="Value" className="order-4 sm:order-none" />}
                  <button onClick={() => setEdit({ ...edit, rules: rules.filter((_, j) => j !== i) })} className="rounded-lg px-2 text-muted hover:text-danger" aria-label="Remove rule"><X className="h-4 w-4" /></button>
                </div>); })}</div>
              <Button variant="secondary" size="sm" onClick={() => setEdit({ ...edit, rules: [...rules, { field: 'visit_count', operator: 'gte', value: '2' }] })}><Plus className="h-4 w-4" /> Add rule</Button>
              <Field label="Status" htmlFor="sgs"><Select id="sgs" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
            </div>
            <div>
              <div className="rounded-2xl bg-charcoal p-5 text-white"><div className="text-xs text-white/60">Matching customers</div><div className="font-display text-3xl font-extrabold">{live ? fmtNum(live.customers) : '...'}</div>
                {live && <div className="mt-1 text-xs text-white/70">{fmtPct(ratio(live.customers, live.total_customers))} of {fmtNum(live.total_customers)} profiles · {fmtMoney(live.revenue)} lifetime revenue</div>}</div>
              <h3 className="mb-2 mt-4 text-sm font-semibold">Sample members</h3>
              {preview.length === 0 ? <p className="text-sm text-muted">No matching customers.</p> : <ul className="divide-y divide-charcoal/5 text-sm">{preview.map((c) => <li key={c.id} className="flex justify-between py-2"><span className="truncate">{c.email ?? c.external_id}</span><span className="text-muted">{fmtMoney(c.total_spent)} · {c.total_orders} orders</span></li>)}</ul>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
