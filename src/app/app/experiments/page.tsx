'use client';
import { useCallback, useEffect, useState } from 'react';
import { FlaskConical, Pencil, Play, Plus, Square, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, DemoBadge, EmptyState, Field, Input, LoadingBlock, Modal, Select, StatusBadge, Textarea, labelize, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import { MIN_CONVERSIONS, MIN_VISITORS, twoProportion, verdict } from '@/lib/stats';
import { fmtMoney, fmtNum, fmtPct, ratio } from '@/lib/format';

type Exp = { id: string; name: string; hypothesis: string | null; experiment_type: string; primary_metric: string; segment_id: string | null; traffic_allocation: number; status: string; started_at: string | null; ended_at: string | null; is_sample: boolean };
type Var = { id: string; experiment_id: string; name: string; description: string | null; is_control: boolean; traffic_weight: number; visitors: number; clicks: number; add_to_carts: number; conversions: number; revenue: number };
type DraftVar = { id?: string; name: string; description: string; is_control: boolean; traffic_weight: number };
type Draft = Partial<Exp> & { vars: DraftVar[] };
const TYPES = ['recommendation_layout', 'homepage_banner', 'product_sorting', 'promotional_message', 'search_layout', 'product_display', 'call_to_action'];
const METRICS: Record<string, string> = { click_through_rate: 'Click through rate', conversion_rate: 'Conversion rate', add_to_cart_rate: 'Add to cart rate', average_order_value: 'Average order value', revenue_per_visitor: 'Revenue per visitor' };
const RATE_METRICS = ['click_through_rate', 'conversion_rate', 'add_to_cart_rate'];
const events = (m: string, v: Var) => (m === 'click_through_rate' ? v.clicks : m === 'add_to_cart_rate' ? v.add_to_carts : v.conversions);

function Results({ exp, vars }: { exp: Exp; vars: Var[] }) {
  const control = vars.find((v) => v.is_control) ?? vars[0];
  const isRate = RATE_METRICS.includes(exp.primary_metric);
  const challenger = vars.find((v) => v.id !== control.id);
  const conclusion = (() => {
    if (!isRate || !challenger) return null;
    const x1 = events(exp.primary_metric, control), x2 = events(exp.primary_metric, challenger);
    const t = twoProportion(x1, control.visitors, x2, challenger.visitors);
    return verdict(x1 + x2, control.visitors, challenger.visitors, t.p, t.lift);
  })();
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead><tr className="border-b border-charcoal/10 text-left text-xs uppercase tracking-wide text-muted"><th className="py-2 pr-3">Variation</th><th className="px-3 text-right">Visitors</th><th className="px-3 text-right">CTR</th><th className="px-3 text-right">Add to cart</th><th className="px-3 text-right">Conversion</th><th className="px-3 text-right">AOV</th><th className="px-3 text-right">Revenue per visitor</th><th className="pl-3 text-right">{METRICS[exp.primary_metric]} vs control</th></tr></thead>
        <tbody className="divide-y divide-charcoal/5">{vars.map((v) => {
          let cell: React.ReactNode = <span className="text-muted">Control</span>;
          if (v.id !== control.id) {
            if (isRate) {
              const t = twoProportion(events(exp.primary_metric, control), control.visitors, events(exp.primary_metric, v), v.visitors);
              const vd = verdict(events(exp.primary_metric, control) + events(exp.primary_metric, v), control.visitors, v.visitors, t.p, t.lift);
              cell = <div><div className="font-semibold tabular-nums">{t.lift == null ? 'n/a' : `${t.lift >= 0 ? '+' : ''}${(t.lift * 100).toFixed(1)}%`} observed</div>
                <div className="text-xs text-muted">{t.confidence == null ? '' : `Confidence ${(t.confidence * 100).toFixed(1)}%`}</div>
                <Badge tone={vd.state === 'significant' ? 'success' : vd.state === 'inconclusive' ? 'warning' : 'neutral'} className="mt-1">{vd.state === 'significant' ? 'Significant' : vd.state === 'inconclusive' ? 'Not significant' : 'Too early'}</Badge></div>;
            } else {
              const val = (x: Var) => (exp.primary_metric === 'average_order_value' ? ratio(Number(x.revenue), x.conversions) : ratio(Number(x.revenue), x.visitors));
              const a = val(control), b = val(v);
              cell = <div><div className="font-semibold tabular-nums">{a ? `${b >= a ? '+' : ''}${(((b - a) / a) * 100).toFixed(1)}%` : 'n/a'} observed</div><Badge className="mt-1">Significance not computed</Badge></div>;
            }
          }
          return (
            <tr key={v.id}><td className="py-3 pr-3"><div className="font-medium">{v.name}</div><div className="text-xs text-muted">{v.description}</div></td>
              <td className="px-3 text-right tabular-nums">{fmtNum(v.visitors)}</td><td className="px-3 text-right tabular-nums">{fmtPct(ratio(v.clicks, v.visitors), 2)}</td>
              <td className="px-3 text-right tabular-nums">{fmtPct(ratio(v.add_to_carts, v.visitors), 2)}</td><td className="px-3 text-right tabular-nums">{fmtPct(ratio(v.conversions, v.visitors), 2)}</td>
              <td className="px-3 text-right tabular-nums">{v.conversions ? fmtMoney(ratio(Number(v.revenue), v.conversions)) : 'n/a'}</td><td className="px-3 text-right tabular-nums">{fmtMoney(ratio(Number(v.revenue), v.visitors))}</td><td className="pl-3 text-right">{cell}</td></tr>
          );
        })}</tbody>
      </table>
      {conclusion && <Alert tone={conclusion.state === 'significant' ? 'success' : conclusion.state === 'inconclusive' ? 'warning' : 'info'} className="mt-4"><b>Statistical conclusion:</b> {conclusion.message}</Alert>}
      <p className="mt-3 text-xs text-muted">Observed results are the measured numbers above. Conclusions use a two sided two proportion test at 95% confidence, and only after at least {fmtNum(MIN_VISITORS)} visitors per variation and {MIN_CONVERSIONS} events of the primary metric.</p>
    </div>
  );
}

export default function ExperimentsPage() {
  const { org, user, canEdit } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const [exps, setExps] = useState<Exp[] | null>(null); const [vars, setVars] = useState<Var[]>([]); const [segs, setSegs] = useState<{ id: string; name: string }[]>([]);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false); const [record, setRecord] = useState<Var | null>(null);

  const load = useCallback(async () => {
    const s = getSupabase();
    const [e, v, sg] = await Promise.all([
      s.from('ab_experiments').select('*').eq('org_id', org.id).order('created_at', { ascending: false }),
      s.from('experiment_variations').select('*').eq('org_id', org.id).order('created_at'),
      s.from('customer_segments').select('id, name').eq('org_id', org.id),
    ]);
    setExps((e.data as Exp[]) ?? []); setVars((v.data as Var[]) ?? []); setSegs(sg.data ?? []);
  }, [org.id]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!edit) return; setErr('');
    if (!edit.name?.trim()) return setErr('Enter an experiment name.');
    if (edit.vars.length < 2) return setErr('An experiment needs a control and at least one variation.');
    if (edit.vars.some((v) => !v.name.trim())) return setErr('Name every variation.');
    if (edit.vars.filter((v) => v.is_control).length !== 1) return setErr('Choose exactly one control.');
    if (edit.vars.reduce((a, v) => a + v.traffic_weight, 0) !== 100) return setErr('Variation traffic weights must add up to 100.');
    setSaving(true);
    const s = getSupabase();
    const row = { org_id: org.id, name: edit.name.trim(), hypothesis: edit.hypothesis?.trim() || null, experiment_type: edit.experiment_type, primary_metric: edit.primary_metric, segment_id: edit.segment_id || null, traffic_allocation: edit.traffic_allocation ?? 100 };
    const r = edit.id
      ? await s.from('ab_experiments').update(row).eq('id', edit.id).select('id').single()
      : await s.from('ab_experiments').insert({ ...row, created_by: user.id }).select('id').single();
    if (r.error) { setSaving(false); return setErr(r.error.message); }
    if (edit.id) {
      const keep = edit.vars.filter((v) => v.id).map((v) => v.id!);
      const del = vars.filter((v) => v.experiment_id === edit.id && !keep.includes(v.id)).map((v) => v.id);
      if (del.length) await s.from('experiment_variations').delete().in('id', del);
    }
    for (const v of edit.vars) {
      const vr = { org_id: org.id, experiment_id: r.data.id, name: v.name.trim(), description: v.description.trim() || null, is_control: v.is_control, traffic_weight: v.traffic_weight };
      const q = v.id ? await s.from('experiment_variations').update(vr).eq('id', v.id) : await s.from('experiment_variations').insert(vr);
      if (q.error) { setSaving(false); return setErr(q.error.message); }
    }
    setSaving(false);
    await logAudit(org.id, user.id, edit.id ? 'experiment.updated' : 'experiment.created', 'experiment', r.data.id, { name: row.name });
    toast('success', 'Experiment saved.'); setEdit(null); load();
  }
  async function setStatus(x: Exp, status: string) {
    if (status === 'running' && !(await confirm({ title: 'Start experiment?', message: 'Traffic will be split between the variations once your storefront reads this experiment.', confirmLabel: 'Start' }))) return;
    if (status === 'completed' && !(await confirm({ title: 'End experiment?', message: 'The experiment is marked completed and its end date is recorded.', confirmLabel: 'End experiment' }))) return;
    const patch: Record<string, unknown> = { status };
    if (status === 'running' && !x.started_at) patch.started_at = new Date().toISOString();
    if (status === 'completed') patch.ended_at = new Date().toISOString();
    const { error } = await getSupabase().from('ab_experiments').update(patch).eq('id', x.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, `experiment.${status}`, 'experiment', x.id, { name: x.name }); load();
  }
  async function remove(x: Exp) {
    if (!(await confirm({ title: 'Delete experiment?', message: `"${x.name}" and its results will be deleted.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    const { error } = await getSupabase().from('ab_experiments').delete().eq('id', x.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'experiment.deleted', 'experiment', x.id, { name: x.name }); load();
  }
  async function saveRecord() {
    if (!record) return;
    const nums = [record.visitors, record.clicks, record.add_to_carts, record.conversions, Number(record.revenue)];
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) return toast('error', 'Enter zero or positive numbers.');
    if (record.clicks > record.visitors || record.add_to_carts > record.visitors || record.conversions > record.visitors) return toast('error', 'Clicks, add to cart events and conversions cannot exceed visitors.');
    const { error } = await getSupabase().from('experiment_variations').update({ visitors: record.visitors, clicks: record.clicks, add_to_carts: record.add_to_carts, conversions: record.conversions, revenue: record.revenue }).eq('id', record.id);
    if (error) return toast('error', error.message);
    toast('success', 'Results updated.'); setRecord(null); load();
  }
  const upd = (i: number, p: Partial<DraftVar>) => edit && setEdit({ ...edit, vars: edit.vars.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  return (
    <>
      <PageHeader title="A/B Testing" description="Compare shopping experiences. Observed results are shown separately from statistical conclusions."
        actions={canEdit && <Button onClick={() => { setEdit({ name: '', experiment_type: 'recommendation_layout', primary_metric: 'conversion_rate', traffic_allocation: 100, vars: [{ name: 'Control', description: 'Current experience', is_control: true, traffic_weight: 50 }, { name: 'Variation B', description: '', is_control: false, traffic_weight: 50 }] }); setErr(''); }}><Plus className="h-4 w-4" /> New experiment</Button>} />
      {!exps ? <LoadingBlock /> : exps.length === 0 ? <Card><EmptyState icon={FlaskConical} title="No experiments yet" description="Test a recommendation layout, banner or sorting rule against your current experience." /></Card> : (
        <div className="space-y-5">{exps.map((x) => {
          const vs = vars.filter((v) => v.experiment_id === x.id);
          return (
            <Card key={x.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-display text-lg font-bold">{x.name} {x.is_sample && <DemoBadge />}</h2>
                  <p className="text-xs text-muted">{labelize(x.experiment_type)} · Primary metric: {METRICS[x.primary_metric]} · {x.traffic_allocation}% of traffic · {segs.find((s) => s.id === x.segment_id)?.name ?? 'All shoppers'}</p>
                  {x.hypothesis && <p className="mt-1 text-sm text-muted">Hypothesis: {x.hypothesis}</p>}</div>
                <div className="flex flex-wrap items-center gap-1"><StatusBadge status={x.status} />{canEdit && <>
                  {x.status !== 'running' && x.status !== 'completed' && <Button size="sm" variant="secondary" onClick={() => setStatus(x, 'running')}><Play className="h-4 w-4" /> Start</Button>}
                  {x.status === 'running' && <><Button size="sm" variant="secondary" onClick={() => setStatus(x, 'paused')}>Pause</Button><Button size="sm" variant="secondary" onClick={() => setStatus(x, 'completed')}><Square className="h-4 w-4" /> End</Button></>}
                  <button className="rounded-lg p-2 text-muted hover:bg-soft" onClick={() => { setEdit({ ...x, vars: vs.map((v) => ({ id: v.id, name: v.name, description: v.description ?? '', is_control: v.is_control, traffic_weight: v.traffic_weight })) }); setErr(''); }} aria-label={`Edit ${x.name}`}><Pencil className="h-4 w-4" /></button>
                  <button className="rounded-lg p-2 text-muted hover:bg-soft hover:text-danger" onClick={() => remove(x)} aria-label={`Delete ${x.name}`}><Trash2 className="h-4 w-4" /></button></>}</div>
              </div>
              {vs.length ? <Results exp={x} vars={vs} /> : <p className="mt-4 text-sm text-muted">No variations.</p>}
              {canEdit && !x.is_sample && vs.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{vs.map((v) => <Button key={v.id} size="sm" variant="ghost" onClick={() => setRecord(v)}>Update results: {v.name}</Button>)}</div>}
            </Card>
          );
        })}</div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit experiment' : 'New experiment'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save experiment</Button></>}>
        {edit && <div className="space-y-4">
          {err && <Alert tone="error">{err}</Alert>}
          <Field label="Name" htmlFor="en"><Input id="en" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="Hypothesis" htmlFor="eh"><Textarea id="eh" value={edit.hypothesis ?? ''} onChange={(e) => setEdit({ ...edit, hypothesis: e.target.value })} className="!min-h-[60px]" placeholder="Changing X will improve Y because Z" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="What are you testing" htmlFor="et"><Select id="et" value={edit.experiment_type} onChange={(e) => setEdit({ ...edit, experiment_type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}</Select></Field>
            <Field label="Primary metric" htmlFor="em"><Select id="em" value={edit.primary_metric} onChange={(e) => setEdit({ ...edit, primary_metric: e.target.value })}>{Object.entries(METRICS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="Audience" htmlFor="ea"><Select id="ea" value={edit.segment_id ?? ''} onChange={(e) => setEdit({ ...edit, segment_id: e.target.value || null })}><option value="">All shoppers</option>{segs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Traffic included (%)" htmlFor="eta"><Input id="eta" type="number" min={1} max={100} value={edit.traffic_allocation ?? 100} onChange={(e) => setEdit({ ...edit, traffic_allocation: Math.min(100, Math.max(1, Number(e.target.value))) })} /></Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">Variations</span>
              <button type="button" className="text-sm font-semibold text-teal" onClick={() => setEdit({ ...edit, vars: [...edit.vars, { name: `Variation ${String.fromCharCode(65 + edit.vars.length)}`, description: '', is_control: false, traffic_weight: 0 }] })}>Add variation</button></div>
            <div className="space-y-2">{edit.vars.map((v, i) => (
              <div key={i} className="grid gap-2 rounded-xl bg-soft/60 p-3 sm:grid-cols-[1fr_1.4fr_90px_auto_auto]">
                <Input value={v.name} onChange={(e) => upd(i, { name: e.target.value })} aria-label="Variation name" />
                <Input value={v.description} placeholder="Description" onChange={(e) => upd(i, { description: e.target.value })} aria-label="Description" />
                <Input type="number" min={0} max={100} value={v.traffic_weight} onChange={(e) => upd(i, { traffic_weight: Number(e.target.value) })} aria-label="Traffic weight percent" />
                <label className="flex items-center gap-1 text-xs"><input type="radio" name="control" checked={v.is_control} onChange={() => setEdit({ ...edit, vars: edit.vars.map((x, j) => ({ ...x, is_control: j === i })) })} /> Control</label>
                {edit.vars.length > 2 && <button onClick={() => setEdit({ ...edit, vars: edit.vars.filter((_, j) => j !== i) })} className="text-muted hover:text-danger" aria-label="Remove variation">×</button>}
              </div>))}</div>
            <p className="mt-1 text-xs text-muted">Traffic weights total {edit.vars.reduce((a, v) => a + v.traffic_weight, 0)} of 100.</p>
          </div>
        </div>}
      </Modal>
      <Modal open={!!record} onClose={() => setRecord(null)} title={`Update results: ${record?.name}`} description="Enter the totals reported by your storefront or analytics tool." size="sm"
        footer={<><Button variant="secondary" onClick={() => setRecord(null)}>Cancel</Button><Button onClick={saveRecord}>Save results</Button></>}>
        {record && <div className="grid grid-cols-2 gap-3">{([['visitors', 'Visitors'], ['clicks', 'Clicks'], ['add_to_carts', 'Add to cart events'], ['conversions', 'Conversions'], ['revenue', 'Revenue']] as const).map(([k, l]) => <Field key={k} label={l} htmlFor={`r-${k}`}><Input id={`r-${k}`} type="number" min={0} value={record[k]} onChange={(e) => setRecord({ ...record, [k]: Number(e.target.value) })} /></Field>)}</div>}
      </Modal>
    </>
  );
}
