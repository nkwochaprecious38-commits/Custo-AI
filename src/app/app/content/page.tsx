'use client';
import { useCallback, useEffect, useState } from 'react';
import { Pause, Pencil, PanelsTopLeft, Play, Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Card, DemoBadge, EmptyState, Field, Input, LoadingBlock, Modal, Select, StatusBadge, Textarea, labelize, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import { fmtDateTime, fmtNum, fmtPct, fromLocalInput, ratio, toLocalInput } from '@/lib/format';

type CC = { id: string; name: string; content_type: string; segment_id: string | null; placement: string; content: { headline?: string; body?: string; cta_label?: string; cta_url?: string; theme?: string }; priority: number; status: string; starts_at: string | null; ends_at: string | null; impressions: number; clicks: number; is_sample: boolean };
const TYPES = [['homepage_banner', 'Homepage banner', ['home_hero', 'home_secondary']], ['promotional_message', 'Promotional message', ['site_header', 'cart_page']], ['collection_section', 'Product collection section', ['home_collection', 'category_top']], ['landing_page', 'Landing page content', ['landing_hero']], ['category_content', 'Category page content', ['category_top', 'category_bottom']], ['popup', 'Promotional popup', ['entry', 'exit_intent', 'timed']], ['featured_products', 'Featured products', ['home_featured', 'product_page']]] as const;
const THEMES: Record<string, string> = { charcoal: 'bg-charcoal text-white', teal: 'bg-teal text-white', mauve: 'bg-mauve text-charcoal', pink: 'bg-pink text-charcoal', light: 'bg-soft text-charcoal' };

function Preview({ c }: { c: Partial<CC> }) {
  const t = c.content ?? {}; const theme = THEMES[t.theme ?? 'charcoal'];
  if (c.content_type === 'popup') return <div className="mx-auto max-w-xs rounded-2xl bg-white p-5 text-center shadow-lift ring-1 ring-charcoal/10"><div className="font-display text-lg font-extrabold">{t.headline || 'Headline'}</div><p className="mt-1 text-sm text-muted">{t.body || 'Supporting message'}</p><div className="mt-4 inline-block rounded-full bg-pink px-4 py-2 text-sm font-semibold text-charcoal">{t.cta_label || 'Call to action'}</div></div>;
  if (c.content_type === 'promotional_message') return <div className={`rounded-xl px-4 py-2.5 text-center text-sm font-medium ${theme}`}>{t.headline || 'Message'} {t.cta_label && <span className="ml-2 underline">{t.cta_label}</span>}</div>;
  return <div className={`rounded-2xl p-6 ${theme}`}><div className="font-display text-xl font-extrabold sm:text-2xl">{t.headline || 'Headline'}</div><p className="mt-2 text-sm opacity-80">{t.body || 'Supporting message'}</p><div className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-charcoal">{t.cta_label || 'Call to action'}</div></div>;
}

export default function ContentPage() {
  const { org, user, canEdit } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const [items, setItems] = useState<CC[] | null>(null);
  const [segs, setSegs] = useState<{ id: string; name: string }[]>([]);
  const [edit, setEdit] = useState<Partial<CC> | null>(null);
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const s = getSupabase();
    const [{ data }, { data: sg }] = await Promise.all([s.from('content_campaigns').select('*').eq('org_id', org.id).order('priority').order('created_at'), s.from('customer_segments').select('id, name').eq('org_id', org.id)]);
    setItems((data as CC[]) ?? []); setSegs(sg ?? []);
  }, [org.id]);
  useEffect(() => { load(); }, [load]);

  async function save(status: string) {
    if (!edit) return; setErr('');
    const c = edit.content ?? {};
    if (!edit.name?.trim()) return setErr('Enter a campaign name.');
    if (!c.headline?.trim()) return setErr('Enter a headline.');
    if (c.cta_url && !/^(https?:\/\/|\/)/.test(c.cta_url)) return setErr('The link must start with / or https://.');
    if (edit.starts_at && edit.ends_at && new Date(edit.ends_at) <= new Date(edit.starts_at)) return setErr('The end date must be after the start date.');
    if (status === 'active' && !(await confirm({ title: 'Publish this content?', message: 'It will be shown to the selected audience as soon as the schedule allows.', confirmLabel: 'Publish' }))) return;
    const finalStatus = status === 'active' && edit.starts_at && new Date(edit.starts_at) > new Date() ? 'scheduled' : status;
    setSaving(true);
    const row = { org_id: org.id, name: edit.name.trim(), content_type: edit.content_type, segment_id: edit.segment_id || null, placement: edit.placement, content: c, priority: edit.priority ?? 100, status: finalStatus, starts_at: edit.starts_at ?? null, ends_at: edit.ends_at ?? null };
    const s = getSupabase();
    const r = edit.id ? await s.from('content_campaigns').update(row).eq('id', edit.id).select('id').single() : await s.from('content_campaigns').insert({ ...row, created_by: user.id }).select('id').single();
    setSaving(false);
    if (r.error) return setErr(r.error.message);
    await logAudit(org.id, user.id, `content.${finalStatus === 'draft' ? 'saved' : 'published'}`, 'content_campaign', r.data.id, { name: row.name });
    toast('success', finalStatus === 'draft' ? 'Draft saved.' : finalStatus === 'scheduled' ? 'Scheduled.' : 'Published.'); setEdit(null); load();
  }
  async function setStatus(c: CC, status: string) {
    if (status === 'active' && !(await confirm({ title: 'Publish this content?', message: `"${c.name}" will go live for its audience.`, confirmLabel: 'Publish' }))) return;
    const { error } = await getSupabase().from('content_campaigns').update({ status }).eq('id', c.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, `content.${status}`, 'content_campaign', c.id, { name: c.name }); load();
  }
  async function remove(c: CC) {
    if (!(await confirm({ title: 'Delete content campaign?', message: `"${c.name}" will be removed permanently.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    const { error } = await getSupabase().from('content_campaigns').delete().eq('id', c.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'content.deleted', 'content_campaign', c.id, { name: c.name }); load();
  }
  const typeDef = TYPES.find((t) => t[0] === edit?.content_type);
  const setC = (k: string, v: string) => setEdit({ ...edit, content: { ...edit?.content, [k]: v } });

  return (
    <>
      <PageHeader title="Content Personalization" description="Show different banners, messages and sections to different customer segments."
        actions={canEdit && <Button onClick={() => { setEdit({ name: '', content_type: 'homepage_banner', placement: 'home_hero', content: { theme: 'charcoal' }, priority: 100, status: 'draft' }); setErr(''); }}><Plus className="h-4 w-4" /> New content campaign</Button>} />
      {!items ? <LoadingBlock /> : items.length === 0 ? <Card><EmptyState icon={PanelsTopLeft} title="No content campaigns" description="Create a banner or message and target it to a segment." /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">{items.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-display font-bold">{c.name} {c.is_sample && <DemoBadge />}</h2>
              <p className="text-xs text-muted">{TYPES.find((t) => t[0] === c.content_type)?.[1]} · {labelize(c.placement)} · {segs.find((s) => s.id === c.segment_id)?.name ?? 'All shoppers'}</p></div><StatusBadge status={c.status} /></div>
            <div className="mt-4"><Preview c={c} /></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex gap-4 text-muted"><span>{fmtNum(c.impressions)} impressions</span><span>{fmtNum(c.clicks)} clicks</span><span>{c.impressions ? fmtPct(ratio(c.clicks, c.impressions)) : 'n/a'} CTR</span></div>
              {canEdit && <div className="flex gap-1">{c.status === 'active' ? <Button size="sm" variant="ghost" onClick={() => setStatus(c, 'paused')}><Pause className="h-4 w-4" /> Pause</Button> : <Button size="sm" variant="ghost" onClick={() => setStatus(c, 'active')}><Play className="h-4 w-4" /> Publish</Button>}
                <button className="rounded-lg p-2 text-muted hover:bg-soft" onClick={() => { setEdit(c); setErr(''); }} aria-label={`Edit ${c.name}`}><Pencil className="h-4 w-4" /></button><button className="rounded-lg p-2 text-muted hover:bg-soft hover:text-danger" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 className="h-4 w-4" /></button></div>}
            </div>
            {(c.starts_at || c.ends_at) && <p className="mt-2 text-xs text-muted">{c.starts_at && `Starts ${fmtDateTime(c.starts_at)}`} {c.ends_at && `Ends ${fmtDateTime(c.ends_at)}`}</p>}
          </Card>
        ))}</div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit content campaign' : 'New content campaign'} size="xl"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button variant="secondary" onClick={() => save('draft')} loading={saving}>Save draft</Button><Button onClick={() => save('active')} loading={saving}>{edit?.starts_at ? 'Schedule' : 'Publish'}</Button></>}>
        {edit && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {err && <Alert tone="error">{err}</Alert>}
              <Field label="Campaign name" htmlFor="cn"><Input id="cn" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Content type" htmlFor="ctp"><Select id="ctp" value={edit.content_type} onChange={(e) => setEdit({ ...edit, content_type: e.target.value, placement: TYPES.find((t) => t[0] === e.target.value)![2][0] })}>{TYPES.map((t) => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</Select></Field>
                <Field label="Placement" htmlFor="cpl"><Select id="cpl" value={edit.placement} onChange={(e) => setEdit({ ...edit, placement: e.target.value })}>{typeDef?.[2].map((p) => <option key={p} value={p}>{labelize(p)}</option>)}</Select></Field>
              </div>
              <Field label="Audience" htmlFor="cau"><Select id="cau" value={edit.segment_id ?? ''} onChange={(e) => setEdit({ ...edit, segment_id: e.target.value || null })}><option value="">All shoppers</option>{segs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
              <Field label="Headline" htmlFor="ch"><Input id="ch" value={edit.content?.headline ?? ''} onChange={(e) => setC('headline', e.target.value)} maxLength={120} /></Field>
              <Field label="Message" htmlFor="cb"><Textarea id="cb" value={edit.content?.body ?? ''} onChange={(e) => setC('body', e.target.value)} maxLength={300} className="!min-h-[70px]" /></Field>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Button label" htmlFor="cl"><Input id="cl" value={edit.content?.cta_label ?? ''} onChange={(e) => setC('cta_label', e.target.value)} /></Field><Field label="Button link" htmlFor="cu"><Input id="cu" value={edit.content?.cta_url ?? ''} onChange={(e) => setC('cta_url', e.target.value)} placeholder="/collections/new" /></Field></div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Style" htmlFor="cth"><Select id="cth" value={edit.content?.theme ?? 'charcoal'} onChange={(e) => setC('theme', e.target.value)}>{Object.keys(THEMES).map((t) => <option key={t} value={t}>{labelize(t)}</option>)}</Select></Field>
                <Field label="Starts" htmlFor="cst"><Input id="cst" type="datetime-local" value={toLocalInput(edit.starts_at)} onChange={(e) => setEdit({ ...edit, starts_at: fromLocalInput(e.target.value) })} /></Field>
                <Field label="Ends" htmlFor="cen"><Input id="cen" type="datetime-local" value={toLocalInput(edit.ends_at)} onChange={(e) => setEdit({ ...edit, ends_at: fromLocalInput(e.target.value) })} /></Field>
              </div>
              <Field label="Priority" htmlFor="cpr" hint="(lower wins when several campaigns match)"><Input id="cpr" type="number" value={edit.priority ?? 100} onChange={(e) => setEdit({ ...edit, priority: Number(e.target.value) })} /></Field>
            </div>
            <div><h3 className="mb-3 font-display font-bold">Preview</h3><div className="rounded-2xl bg-soft/60 p-4"><Preview c={edit} /></div>
              <p className="mt-3 text-xs text-muted">Audience: {segs.find((s) => s.id === edit.segment_id)?.name ?? 'All shoppers'}. Preview shows layout only; final styling follows your storefront theme.</p></div>
          </div>
        )}
      </Modal>
    </>
  );
}
