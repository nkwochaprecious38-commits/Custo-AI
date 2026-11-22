'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pause, Pencil, Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Alert, Button, Card, DemoBadge, EmptyState, Field, Input, LoadingBlock, Modal, Select, StatusBadge, Toggle, labelize, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { ProductArt } from '@/components/marketing/ProductArt';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import { useCatalog } from '@/lib/useCatalog';
import { PLACEMENTS, REC_TYPES, recommend, type RecRules } from '@/lib/recommend';
import { fmtMoney, fmtNum, fmtPct, ratio } from '@/lib/format';

type Camp = { id: string; name: string; rec_type: string; segment_id: string | null; placement: string; max_products: number; rules: RecRules; status: string; is_sample: boolean };
type Stat = { impressions: number; clicks: number };
const defaultRules: RecRules = { include_categories: [], exclude_categories: [], exclude_out_of_stock: true, exclude_product_ids: [] };

export default function RecommendationsPage() {
  const { org, user, canEdit } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const cat = useCatalog(30);
  const [camps, setCamps] = useState<Camp[] | null>(null);
  const [segs, setSegs] = useState<{ id: string; name: string }[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [edit, setEdit] = useState<Partial<Camp> | null>(null);
  const [saving, setSaving] = useState(false); const [err, setErr] = useState('');
  const [ctxProduct, setCtxProduct] = useState('');

  const load = useCallback(async () => {
    const s = getSupabase();
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: c }, { data: sg }, sum] = await Promise.all([
      s.from('recommendation_campaigns').select('*').eq('org_id', org.id).order('created_at'),
      s.from('customer_segments').select('id, name').eq('org_id', org.id),
      s.rpc('analytics_summary', { p_org: org.id, p_from: since, p_to: new Date().toISOString() }),
    ]);
    setCamps((c as Camp[]) ?? []); setSegs(sg ?? []);
    setStats(Object.fromEntries(((sum.data?.campaigns ?? []) as (Stat & { id: string })[]).map((x) => [x.id, x])));
  }, [org.id]);
  useEffect(() => { load(); }, [load]);

  const preview = useMemo(() => {
    if (!edit?.rec_type) return [];
    return recommend(edit.rec_type, (edit.rules ?? defaultRules) as RecRules, edit.max_products ?? 8, { products: cat.products, perf: cat.perf, categories: cat.categories, contextProductId: ctxProduct || null, preferredCategories: [] });
  }, [edit, cat.products, cat.perf, cat.categories, ctxProduct]);

  async function save() {
    if (!edit) return; setErr('');
    if (!edit.name?.trim()) return setErr('Enter a campaign name.');
    setSaving(true);
    const row = { org_id: org.id, name: edit.name.trim(), rec_type: edit.rec_type, segment_id: edit.segment_id || null, placement: edit.placement, max_products: edit.max_products, rules: edit.rules, status: edit.status ?? 'draft' };
    const s = getSupabase();
    const r = edit.id ? await s.from('recommendation_campaigns').update(row).eq('id', edit.id).select('id').single() : await s.from('recommendation_campaigns').insert(row).select('id').single();
    setSaving(false);
    if (r.error) return setErr(r.error.message);
    await logAudit(org.id, user.id, edit.id ? 'recommendation.updated' : 'recommendation.created', 'recommendation_campaign', r.data.id, { name: row.name });
    toast('success', 'Campaign saved.'); setEdit(null); load();
  }
  async function setStatus(c: Camp, status: string) {
    if (status === 'active' && !(await confirm({ title: 'Activate campaign?', message: `"${c.name}" will start serving recommendations on your storefront placement.`, confirmLabel: 'Activate' }))) return;
    const { error } = await getSupabase().from('recommendation_campaigns').update({ status }).eq('id', c.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, `recommendation.${status}`, 'recommendation_campaign', c.id, { name: c.name }); load();
  }
  async function remove(c: Camp) {
    if (!(await confirm({ title: 'Delete campaign?', message: `"${c.name}" and its impression history will be deleted.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    const { error } = await getSupabase().from('recommendation_campaigns').delete().eq('id', c.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'recommendation.deleted', 'recommendation_campaign', c.id, { name: c.name }); load();
  }
  const rules = (edit?.rules ?? defaultRules) as RecRules;
  const setRules = (r: Partial<RecRules>) => setEdit({ ...edit, rules: { ...rules, ...r } });
  const needsCtx = REC_TYPES.find((t) => t.id === edit?.rec_type)?.needsContext;

  return (
    <>
      <PageHeader title="Recommendations" description="Create recommendation campaigns, choose where they appear and control which products qualify."
        actions={canEdit && <Button onClick={() => { setEdit({ name: '', rec_type: 'recommended_for_you', placement: 'home_page', max_products: 8, rules: defaultRules, status: 'draft' }); setErr(''); }}><Plus className="h-4 w-4" /> New campaign</Button>} />
      {!camps ? <LoadingBlock /> : camps.length === 0 ? (
        <Card><EmptyState icon={Sparkles} title="No recommendation campaigns" description="Start with a strategy such as similar products on product pages or best sellers on the homepage." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-charcoal/10 text-left text-xs uppercase tracking-wide text-muted"><th className="px-4 py-3">Campaign</th><th className="px-3">Type</th><th className="px-3">Audience</th><th className="px-3">Placement</th><th className="px-3">Status</th><th className="px-3 text-right">Impressions</th><th className="px-3 text-right">Clicks</th><th className="px-3 text-right">CTR</th><th className="px-4" /></tr></thead>
            <tbody className="divide-y divide-charcoal/5">{camps.map((c) => { const st = stats[c.id]; return (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name} {c.is_sample && <DemoBadge />}</td>
                <td className="px-3">{REC_TYPES.find((t) => t.id === c.rec_type)?.name}</td>
                <td className="px-3">{segs.find((s) => s.id === c.segment_id)?.name ?? 'All shoppers'}</td>
                <td className="px-3">{labelize(c.placement)}</td>
                <td className="px-3"><StatusBadge status={c.status} /></td>
                <td className="px-3 text-right tabular-nums">{fmtNum(st?.impressions ?? 0)}</td>
                <td className="px-3 text-right tabular-nums">{fmtNum(st?.clicks ?? 0)}</td>
                <td className="px-3 text-right tabular-nums">{st?.impressions ? fmtPct(ratio(st.clicks, st.impressions)) : 'n/a'}</td>
                <td className="px-4">{canEdit && <div className="flex justify-end gap-1">
                  {c.status === 'active' ? <button className="rounded-lg p-2 text-muted hover:bg-soft" onClick={() => setStatus(c, 'paused')} aria-label="Pause"><Pause className="h-4 w-4" /></button> : <button className="rounded-lg p-2 text-muted hover:bg-soft" onClick={() => setStatus(c, 'active')} aria-label="Activate"><Play className="h-4 w-4" /></button>}
                  <button className="rounded-lg p-2 text-muted hover:bg-soft" onClick={() => { setEdit(c); setErr(''); }} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                  <button className="rounded-lg p-2 text-muted hover:bg-soft hover:text-danger" onClick={() => remove(c)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button></div>}</td>
              </tr>); })}</tbody>
          </table>
          <p className="px-4 py-3 text-xs text-muted">Performance covers the last 30 days. Click through rate shows engagement, not proven revenue impact.</p>
        </Card>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit campaign' : 'New recommendation campaign'} size="xl"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={saving}>Save campaign</Button></>}>
        {edit && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {err && <Alert tone="error">{err}</Alert>}
              <Field label="Campaign name" htmlFor="cn"><Input id="cn" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Recommendation type" htmlFor="ct"><Select id="ct" value={edit.rec_type} onChange={(e) => setEdit({ ...edit, rec_type: e.target.value })}>{REC_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
                <p className="mt-1 text-xs text-muted">{REC_TYPES.find((t) => t.id === edit.rec_type)?.description}</p></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Placement" htmlFor="cp"><Select id="cp" value={edit.placement} onChange={(e) => setEdit({ ...edit, placement: e.target.value })}>{PLACEMENTS.map((p) => <option key={p} value={p}>{labelize(p)}</option>)}</Select></Field>
                <Field label="Target audience" htmlFor="ca"><Select id="ca" value={edit.segment_id ?? ''} onChange={(e) => setEdit({ ...edit, segment_id: e.target.value || null })}><option value="">All shoppers</option>{segs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
                <Field label="Products shown" htmlFor="cm"><Input id="cm" type="number" min={1} max={48} value={edit.max_products ?? 8} onChange={(e) => setEdit({ ...edit, max_products: Math.min(48, Math.max(1, Number(e.target.value))) })} /></Field>
                <Field label="Status" htmlFor="cs"><Select id="cs" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option></Select></Field>
              </div>
              <div className="rounded-xl bg-soft/60 p-4">
                <h3 className="text-sm font-semibold">Product rules</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Only include category" htmlFor="ic"><Select id="ic" value={rules.include_categories[0] ?? ''} onChange={(e) => setRules({ include_categories: e.target.value ? [e.target.value] : [] })}><option value="">Any category</option>{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
                  <Field label="Exclude category" htmlFor="ec"><Select id="ec" value={rules.exclude_categories[0] ?? ''} onChange={(e) => setRules({ exclude_categories: e.target.value ? [e.target.value] : [] })}><option value="">None</option>{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
                  <Field label="Minimum price" htmlFor="mn"><Input id="mn" inputMode="decimal" value={rules.min_price ?? ''} onChange={(e) => setRules({ min_price: e.target.value ? Number(e.target.value) : null })} /></Field>
                  <Field label="Maximum price" htmlFor="mx"><Input id="mx" inputMode="decimal" value={rules.max_price ?? ''} onChange={(e) => setRules({ max_price: e.target.value ? Number(e.target.value) : null })} /></Field>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm"><span>Exclude out of stock products</span><Toggle checked={rules.exclude_out_of_stock} onChange={(v) => setRules({ exclude_out_of_stock: v })} label="Exclude out of stock" /></div>
                <Field label="Exclude specific products" htmlFor="ep"><Select id="ep" value="" onChange={(e) => e.target.value && setRules({ exclude_product_ids: [...new Set([...rules.exclude_product_ids, e.target.value])] })}><option value="">Add a product to exclude</option>{cat.products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
                <div className="mt-2 flex flex-wrap gap-1">{rules.exclude_product_ids.map((id) => <button key={id} onClick={() => setRules({ exclude_product_ids: rules.exclude_product_ids.filter((x) => x !== id) })} className="rounded-full bg-white px-2.5 py-1 text-xs">{cat.products.find((p) => p.id === id)?.title ?? 'Removed product'} ×</button>)}</div>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between"><h3 className="font-display font-bold">Live preview</h3><span className="text-xs text-muted">{preview.length} products</span></div>
              {needsCtx && <Field label="Preview as if viewing" htmlFor="ctx"><Select id="ctx" value={ctxProduct} onChange={(e) => setCtxProduct(e.target.value)}><option value="">Choose a product</option>{cat.products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>}
              {cat.loading ? <LoadingBlock /> : preview.length === 0 ? <p className="mt-4 text-sm text-muted">No products match these rules.</p> : (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{preview.map(({ product: p, reason }) => (
                  <div key={p.id} className="rounded-xl border border-charcoal/10 p-2"><div className="aspect-square overflow-hidden rounded-lg"><ProductArt category={cat.categories.find((c) => c.id === p.category_id)?.name} image={p.image_url} /></div>
                    <div className="mt-2 line-clamp-2 text-xs font-medium">{p.title}</div><div className="text-xs font-semibold">{fmtMoney(p.price)}</div><div className="mt-1 text-[11px] text-teal">{reason}</div></div>
                ))}</div>
              )}
              <p className="mt-3 text-xs text-muted">Preview uses the last 30 days of catalog activity. Shopper specific strategies use each visitor&apos;s history on the storefront.</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
