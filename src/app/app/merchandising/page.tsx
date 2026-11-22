'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Pencil, Pin, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Alert, Button, Card, DemoBadge, EmptyState, Field, Input, LoadingBlock, Modal, Select, StatusBadge, labelize, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { ProductArt } from '@/components/marketing/ProductArt';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import { useCatalog } from '@/lib/useCatalog';
import { MERCH_RULE_TYPES, applyMerchandising, isLive } from '@/lib/merch';
import type { MerchRule } from '@/lib/types';
import { fmtDateTime, fromLocalInput, toLocalInput } from '@/lib/format';

export default function MerchandisingPage() {
  const { org, user, canEdit } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const cat = useCatalog(30);
  const [rules, setRules] = useState<MerchRule[] | null>(null);
  const [edit, setEdit] = useState<Partial<MerchRule> | null>(null);
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false);
  const [previewCat, setPreviewCat] = useState('');

  const load = useCallback(async () => { const { data } = await getSupabase().from('merchandising_rules').select('*').eq('org_id', org.id).order('priority'); setRules((data as MerchRule[]) ?? []); }, [org.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!previewCat && cat.categories[0]) setPreviewCat(cat.categories[0].id); }, [cat.categories, previewCat]);

  const ordered = useMemo(() => applyMerchandising(cat.products, rules ?? [], cat.perf, previewCat || null), [cat.products, cat.perf, rules, previewCat]);
  // What the page would look like if the rule being edited were published
  const draftOrdered = useMemo(() => {
    if (!edit) return null;
    const draft = { ...edit, id: edit.id ?? 'draft', status: 'active', starts_at: null, ends_at: null, product_ids: edit.product_ids ?? [], config: edit.config ?? {}, priority: edit.priority ?? 100 } as MerchRule;
    const others = (rules ?? []).filter((r) => r.id !== edit.id);
    const catId = edit.scope === 'category' ? edit.category_id ?? null : previewCat || null;
    return applyMerchandising(cat.products, [...others, draft], cat.perf, catId);
  }, [edit, rules, cat.products, cat.perf, previewCat]);

  async function save(status: string) {
    if (!edit) return; setErr('');
    const type = MERCH_RULE_TYPES.find((t) => t.id === edit.rule_type)!;
    if (!edit.name?.trim()) return setErr('Enter a rule name.');
    if (type.needsProducts && !(edit.product_ids ?? []).length) return setErr('Select at least one product.');
    if (edit.scope === 'category' && !edit.category_id) return setErr('Choose a category.');
    if (edit.scope === 'search' && !edit.search_term?.trim()) return setErr('Enter a search term.');
    if (edit.rule_type === 'promote_seasonal' && !String(edit.config?.tag ?? '').trim()) return setErr('Enter the tag that identifies seasonal products.');
    if (edit.rule_type === 'prioritize_category' && !edit.config?.category_id) return setErr('Choose the category to prioritize.');
    if (edit.starts_at && edit.ends_at && new Date(edit.ends_at) <= new Date(edit.starts_at)) return setErr('The end date must be after the start date.');
    if (status === 'active' && !(await confirm({ title: 'Publish this rule?', message: 'Product ordering on the selected pages changes as soon as the rule is live.', confirmLabel: 'Publish' }))) return;
    setSaving(true);
    const finalStatus = status === 'active' && edit.starts_at && new Date(edit.starts_at) > new Date() ? 'scheduled' : status;
    const row = { org_id: org.id, name: edit.name.trim(), scope: edit.scope, category_id: edit.scope === 'category' ? edit.category_id : null, search_term: edit.scope === 'search' ? edit.search_term?.trim() : null, rule_type: edit.rule_type, product_ids: edit.product_ids ?? [], config: edit.config ?? {}, priority: edit.priority ?? 100, status: finalStatus, starts_at: edit.starts_at ?? null, ends_at: edit.ends_at ?? null };
    const s = getSupabase();
    const r = edit.id ? await s.from('merchandising_rules').update(row).eq('id', edit.id).select('id').single() : await s.from('merchandising_rules').insert({ ...row, created_by: user.id }).select('id').single();
    setSaving(false);
    if (r.error) return setErr(r.error.message);
    await logAudit(org.id, user.id, `merchandising.${finalStatus === 'draft' ? 'saved' : 'published'}`, 'merchandising_rule', r.data.id, { name: row.name });
    toast('success', finalStatus === 'draft' ? 'Draft saved.' : finalStatus === 'scheduled' ? 'Rule scheduled.' : 'Rule published.'); setEdit(null); load();
  }
  async function toggle(r: MerchRule) {
    const status = r.status === 'active' ? 'paused' : 'active';
    const { error } = await getSupabase().from('merchandising_rules').update({ status }).eq('id', r.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, `merchandising.${status}`, 'merchandising_rule', r.id, { name: r.name }); load();
  }
  async function remove(r: MerchRule) {
    if (!(await confirm({ title: 'Delete rule?', message: `"${r.name}" will stop affecting product order.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    const { error } = await getSupabase().from('merchandising_rules').delete().eq('id', r.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'merchandising.deleted', 'merchandising_rule', r.id, { name: r.name }); load();
  }
  const type = MERCH_RULE_TYPES.find((t) => t.id === edit?.rule_type);
  const list = edit && draftOrdered ? draftOrdered : ordered;

  return (
    <>
      <PageHeader title="Merchandising" description="Control product ranking, promotion and visibility. Preview the order before you publish."
        actions={canEdit && <Button onClick={() => { setEdit({ name: '', scope: 'category', rule_type: 'pin', product_ids: [], priority: 100, config: {}, category_id: previewCat || null }); setErr(''); }}><Plus className="h-4 w-4" /> New rule</Button>} />
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <div className="border-b border-charcoal/5 px-5 py-4 font-display font-bold">Rules</div>
          {!rules ? <LoadingBlock /> : rules.length === 0 ? <EmptyState icon={Layers} title="No merchandising rules" description="Pin, promote, demote or exclude products, then schedule the rule." /> : (
            <ul className="divide-y divide-charcoal/5">{rules.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="font-medium">{r.name} {r.is_sample && <DemoBadge />}</div>
                    <div className="mt-0.5 text-xs text-muted">{MERCH_RULE_TYPES.find((t) => t.id === r.rule_type)?.name} · {r.scope === 'all' ? 'Sitewide' : r.scope === 'category' ? cat.categories.find((c) => c.id === r.category_id)?.name ?? 'Category' : `Search "${r.search_term}"`} · Priority {r.priority}</div>
                    {(r.starts_at || r.ends_at) && <div className="mt-0.5 text-xs text-muted">{r.starts_at ? `From ${fmtDateTime(r.starts_at)}` : ''} {r.ends_at ? `until ${fmtDateTime(r.ends_at)}` : ''}</div>}</div>
                  <div className="flex shrink-0 items-center gap-1"><StatusBadge status={r.status === 'active' && !isLive(r) ? 'scheduled' : r.status} />
                    {canEdit && <><button className="rounded-lg px-2 py-1 text-xs font-semibold text-teal hover:bg-soft" onClick={() => toggle(r)}>{r.status === 'active' ? 'Pause' : 'Activate'}</button>
                      <button className="rounded-lg p-1.5 text-muted hover:bg-soft" onClick={() => { setEdit(r); setErr(''); }} aria-label={`Edit ${r.name}`}><Pencil className="h-4 w-4" /></button>
                      <button className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-danger" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}><Trash2 className="h-4 w-4" /></button></>}</div>
                </div>
              </li>
            ))}</ul>
          )}
        </Card>
        <PreviewList title={edit ? 'Preview with this rule applied' : 'Current category order'} list={list} categories={cat.categories} loading={cat.loading}
          header={edit ? <span className="text-xs text-muted">Not published yet</span> : <Select value={previewCat} onChange={(e) => setPreviewCat(e.target.value)} className="!w-auto !py-1.5" aria-label="Category preview">{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>} />
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit rule' : 'New merchandising rule'} size="xl"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button variant="secondary" onClick={() => save('draft')} loading={saving}>Save draft</Button><Button onClick={() => save('active')} loading={saving}>{edit?.starts_at ? 'Schedule' : 'Publish'}</Button></>}>
        {edit && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4">
              {err && <Alert tone="error">{err}</Alert>}
              <Field label="Rule name" htmlFor="rn"><Input id="rn" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Action" htmlFor="rt"><Select id="rt" value={edit.rule_type} onChange={(e) => setEdit({ ...edit, rule_type: e.target.value, product_ids: [] })}>{MERCH_RULE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select><p className="mt-1 text-xs text-muted">{type?.description}</p></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Applies to" htmlFor="rs"><Select id="rs" value={edit.scope} onChange={(e) => setEdit({ ...edit, scope: e.target.value as MerchRule['scope'] })}><option value="category">A category page</option><option value="all">Sitewide listings</option><option value="search">A search term</option></Select></Field>
                {edit.scope === 'category' && <Field label="Category" htmlFor="rc"><Select id="rc" value={edit.category_id ?? ''} onChange={(e) => setEdit({ ...edit, category_id: e.target.value })}><option value="">Choose</option>{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
                {edit.scope === 'search' && <Field label="Search term" htmlFor="rq"><Input id="rq" value={edit.search_term ?? ''} onChange={(e) => setEdit({ ...edit, search_term: e.target.value })} placeholder="shoes" /></Field>}
              </div>
              {edit.rule_type === 'promote_seasonal' && <Field label="Seasonal tag" htmlFor="rtag"><Input id="rtag" value={String(edit.config?.tag ?? '')} onChange={(e) => setEdit({ ...edit, config: { ...edit.config, tag: e.target.value } })} placeholder="summer" /></Field>}
              {edit.rule_type === 'prioritize_category' && <Field label="Category to prioritize" htmlFor="rpc"><Select id="rpc" value={String(edit.config?.category_id ?? '')} onChange={(e) => setEdit({ ...edit, config: { ...edit.config, category_id: e.target.value } })}><option value="">Choose</option>{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
              {type?.needsProducts && (
                <div><Field label="Products" htmlFor="rp"><Select id="rp" value="" onChange={(e) => e.target.value && setEdit({ ...edit, product_ids: [...(edit.product_ids ?? []), e.target.value] })}><option value="">Add a product</option>{cat.products.filter((p) => !(edit.product_ids ?? []).includes(p.id) && (edit.scope !== 'category' || !edit.category_id || p.category_id === edit.category_id)).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
                  <ol className="mt-2 space-y-1">{(edit.product_ids ?? []).map((id, i, a) => (
                    <li key={id} className="flex items-center gap-2 rounded-lg bg-soft/70 px-3 py-1.5 text-sm"><span className="w-4 text-muted">{i + 1}</span><span className="flex-1 truncate">{cat.products.find((p) => p.id === id)?.title}</span>
                      {edit.rule_type === 'pin' && <><button disabled={i === 0} onClick={() => { const n = [...a]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setEdit({ ...edit, product_ids: n }); }} aria-label="Move up" className="disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button disabled={i === a.length - 1} onClick={() => { const n = [...a]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setEdit({ ...edit, product_ids: n }); }} aria-label="Move down" className="disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></>}
                      <button onClick={() => setEdit({ ...edit, product_ids: a.filter((x) => x !== id) })} aria-label="Remove" className="text-muted hover:text-danger">×</button></li>))}</ol></div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Priority" htmlFor="rpr" hint="(lower runs first)"><Input id="rpr" type="number" value={edit.priority ?? 100} onChange={(e) => setEdit({ ...edit, priority: Number(e.target.value) })} /></Field>
                <Field label="Starts" htmlFor="rst"><Input id="rst" type="datetime-local" value={toLocalInput(edit.starts_at)} onChange={(e) => setEdit({ ...edit, starts_at: fromLocalInput(e.target.value) })} /></Field>
                <Field label="Ends" htmlFor="ren"><Input id="ren" type="datetime-local" value={toLocalInput(edit.ends_at)} onChange={(e) => setEdit({ ...edit, ends_at: fromLocalInput(e.target.value) })} /></Field>
              </div>
            </div>
            <PreviewList title="Preview with this rule applied" list={draftOrdered ?? []} categories={cat.categories} loading={cat.loading} />
          </div>
        )}
      </Modal>
    </>
  );
}

function PreviewList({ title, list, categories, loading, header }: { title: string; list: ReturnType<typeof applyMerchandising>; categories: { id: string; name: string }[]; loading: boolean; header?: React.ReactNode }) {
  return (
    <Card className="h-fit">
      <div className="flex items-center justify-between gap-2 border-b border-charcoal/5 px-5 py-4"><h2 className="font-display font-bold">{title}</h2>{header}</div>
      {loading ? <LoadingBlock /> : list.length === 0 ? <p className="p-6 text-sm text-muted">No products to show.</p> : (
        <ol className="max-h-[560px] divide-y divide-charcoal/5 overflow-y-auto">{list.slice(0, 20).map((x, i) => (
          <li key={x.product.id} className="flex items-center gap-3 px-5 py-2.5"><span className="w-5 text-sm tabular-nums text-muted">{i + 1}</span>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg"><ProductArt category={categories.find((c) => c.id === x.product.category_id)?.name} image={x.product.image_url} /></div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{x.product.title}</div>{x.notes.length > 0 && <div className="truncate text-xs text-teal">{x.notes.join(' · ')}</div>}</div>
            {x.pinned >= 0 && <Pin className="h-4 w-4 text-pink" aria-label="Pinned" />}
            {x.product.inventory_quantity <= 0 && <span className="text-xs text-danger">Out of stock</span>}
          </li>))}</ol>
      )}
    </Card>
  );
}
