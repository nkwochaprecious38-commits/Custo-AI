'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { Boxes, Download, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Alert, Badge, Button, Card, DemoBadge, EmptyState, Field, Input, LoadingBlock, Modal, Select, StatusBadge, Tabs, Textarea, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { ProductArt } from '@/components/marketing/ProductArt';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import { useCatalog } from '@/lib/useCatalog';
import { fmtMoney, fmtNum, fmtPct, ratio } from '@/lib/format';
import type { Product } from '@/lib/types';

const PAGE = 25;
type Draft = { id?: string; title: string; description: string; price: string; compare_at_price: string; sku: string; category: string; brand: string; inventory_quantity: string; status: string; image_url: string; tags: string; attributes: { k: string; v: string }[] };
const emptyDraft: Draft = { title: '', description: '', price: '', compare_at_price: '', sku: '', category: '', brand: '', inventory_quantity: '0', status: 'active', image_url: '', tags: '', attributes: [] };

function CatalogInner() {
  const { org, user, canEdit } = useOrg();
  const params = useSearchParams();
  const toast = useToast(); const confirm = useConfirm();
  const { products, categories, brands, perf, loading, error, reload } = useCatalog(30);
  const [tab, setTab] = useState<'products' | 'categories' | 'brands' | 'attributes'>('products');
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [brand, setBrand] = useState(''); const [status, setStatus] = useState(''); const [stock, setStock] = useState('');
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  useEffect(() => { if (params.get('import')) setImportOpen(true); }, [params]);
  useEffect(() => { setPage(0); }, [q, cat, brand, status, stock]);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const brandName = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const filtered = useMemo(() => products.filter((p) =>
    (!q || `${p.title} ${p.sku ?? ''} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())) && (!cat || p.category_id === cat) && (!brand || p.brand_id === brand) && (!status || p.status === status) &&
    (!stock || (stock === 'in' ? p.inventory_quantity > 5 : stock === 'low' ? p.inventory_quantity > 0 && p.inventory_quantity <= 5 : p.inventory_quantity <= 0))), [products, q, cat, brand, status, stock]);
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const hasSample = products.some((p) => p.is_sample);

  function edit(p: Product) {
    setDraft({ id: p.id, title: p.title, description: p.description ?? '', price: String(p.price), compare_at_price: p.compare_at_price == null ? '' : String(p.compare_at_price), sku: p.sku ?? '', category: catName.get(p.category_id ?? '') ?? '', brand: brandName.get(p.brand_id ?? '') ?? '', inventory_quantity: String(p.inventory_quantity), status: p.status, image_url: p.image_url ?? '', tags: p.tags.join(', '), attributes: Object.entries(p.attributes ?? {}).map(([k, v]) => ({ k, v: String(v) })) });
  }
  async function remove(p: Product) {
    if (!(await confirm({ title: 'Delete product?', message: `"${p.title}" will be removed from the catalog, recommendations and search.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    const { error } = await getSupabase().from('products').delete().eq('id', p.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'product.deleted', 'product', p.id, { name: p.title });
    toast('success', 'Product deleted.'); reload();
  }
  function exportCsv() {
    const csv = Papa.unparse(filtered.map((p) => ({ title: p.title, description: p.description ?? '', price: p.price, compare_at_price: p.compare_at_price ?? '', sku: p.sku ?? '', category: catName.get(p.category_id ?? '') ?? '', brand: brandName.get(p.brand_id ?? '') ?? '', inventory: p.inventory_quantity, status: p.status, image_url: p.image_url ?? '', tags: p.tags.join(';'), ...Object.fromEntries(Object.entries(p.attributes ?? {}).map(([k, v]) => [`attr_${k}`, v])) })));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'custo-products.csv'; a.click();
  }

  return (
    <>
      <PageHeader title="Product Catalog" description="The product data behind search, recommendations, segmentation and merchandising." badge={hasSample && <DemoBadge />}
        actions={<>
          <Button variant="secondary" onClick={exportCsv} disabled={!filtered.length}><Download className="h-4 w-4" /> Export</Button>
          {canEdit && <><Button variant="secondary" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import CSV</Button><Button onClick={() => setDraft({ ...emptyDraft })}><Plus className="h-4 w-4" /> Add product</Button></>}
        </>} />
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'products', label: 'Products', count: products.length }, { id: 'categories', label: 'Categories', count: categories.length }, { id: 'brands', label: 'Brands', count: brands.length }, { id: 'attributes', label: 'Attributes' }]} />
      <div className="mt-5">
        {tab === 'products' && (
          <Card>
            <div className="grid gap-2 border-b border-charcoal/5 p-4 md:grid-cols-[1.6fr_repeat(4,1fr)]">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input className="pl-9" placeholder="Search by name, SKU or tag" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" /></div>
              <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
              <Select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand"><option value="">All brands</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></Select>
              <Select value={stock} onChange={(e) => setStock(e.target.value)} aria-label="Inventory"><option value="">Any inventory</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></Select>
            </div>
            {loading ? <LoadingBlock /> : filtered.length === 0 ? (
              <EmptyState icon={Boxes} title={products.length ? 'No products match these filters' : 'Your catalog is empty'} description={products.length ? 'Try clearing a filter.' : 'Add products manually, import a CSV file or connect a store integration.'}
                action={!products.length && canEdit && <Button onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import CSV</Button>} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead><tr className="border-b border-charcoal/10 text-left text-xs uppercase tracking-wide text-muted"><th className="px-4 py-3">Product</th><th className="px-3">Price</th><th className="px-3">Category</th><th className="px-3">Brand</th><th className="px-3">Inventory</th><th className="px-3">Status</th><th className="px-3 text-right">Views (30 d)</th><th className="px-3 text-right">Cart rate</th><th className="px-4" /></tr></thead>
                    <tbody className="divide-y divide-charcoal/5">
                      {rows.map((p) => { const pf = perf.get(p.id); return (
                        <tr key={p.id} className="hover:bg-soft/40">
                          <td className="px-4 py-2.5"><div className="flex items-center gap-3"><div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg"><ProductArt category={catName.get(p.category_id ?? '')} image={p.image_url} label={p.title} /></div><div className="min-w-0"><div className="truncate font-medium">{p.title}</div><div className="text-xs text-muted">{p.sku}{p.is_sample && ' · Demo'}</div></div></div></td>
                          <td className="px-3 tabular-nums">{fmtMoney(p.price, p.currency)}{p.compare_at_price ? <div className="text-xs text-muted line-through">{fmtMoney(p.compare_at_price)}</div> : null}</td>
                          <td className="px-3">{catName.get(p.category_id ?? '') ?? <span className="text-muted">None</span>}</td>
                          <td className="px-3">{brandName.get(p.brand_id ?? '') ?? <span className="text-muted">None</span>}</td>
                          <td className="px-3">{p.inventory_quantity <= 0 ? <Badge tone="danger">Out of stock</Badge> : p.inventory_quantity <= 5 ? <Badge tone="warning">Low: {p.inventory_quantity}</Badge> : <span className="tabular-nums">{fmtNum(p.inventory_quantity)}</span>}</td>
                          <td className="px-3"><StatusBadge status={p.status} /></td>
                          <td className="px-3 text-right tabular-nums">{fmtNum(pf?.views ?? 0)}</td>
                          <td className="px-3 text-right tabular-nums">{pf?.views ? fmtPct(ratio(pf.add_to_carts, pf.views)) : 'n/a'}</td>
                          <td className="px-4 text-right">{canEdit && <div className="flex justify-end gap-1"><button onClick={() => edit(p)} className="rounded-lg p-2 text-muted hover:bg-soft hover:text-charcoal" aria-label={`Edit ${p.title}`}><Pencil className="h-4 w-4" /></button><button onClick={() => remove(p)} className="rounded-lg p-2 text-muted hover:bg-soft hover:text-danger" aria-label={`Delete ${p.title}`}><Trash2 className="h-4 w-4" /></button></div>}</td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-charcoal/5 px-4 py-3 text-sm text-muted">
                  <span>{fmtNum(page * PAGE + 1)} to {fmtNum(Math.min(filtered.length, (page + 1) * PAGE))} of {fmtNum(filtered.length)}</span>
                  <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage(page + 1)}>Next</Button></div>
                </div>
              </>
            )}
          </Card>
        )}
        {tab === 'categories' && <NamedList table="product_categories" items={categories} counts={(id) => products.filter((p) => p.category_id === id).length} onChange={reload} label="category" />}
        {tab === 'brands' && <NamedList table="brands" items={brands} counts={(id) => products.filter((p) => p.brand_id === id).length} onChange={reload} label="brand" />}
        {tab === 'attributes' && <AttributesPanel products={products} />}
      </div>
      {draft && <ProductModal draft={draft} setDraft={setDraft} categories={categories} brands={brands} onSaved={() => { setDraft(null); reload(); }} />}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={reload} />
    </>
  );
}

async function ensureNamed(table: 'product_categories' | 'brands', orgId: string, name: string, existing: { id: string; name: string }[]) {
  const n = name.trim(); if (!n) return null;
  const found = existing.find((x) => x.name.toLowerCase() === n.toLowerCase()); if (found) return found.id;
  const { data, error } = await getSupabase().from(table).upsert({ org_id: orgId, name: n }, { onConflict: 'org_id,name' }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

function ProductModal({ draft, setDraft, categories, brands, onSaved }: { draft: Draft; setDraft: (d: Draft | null) => void; categories: { id: string; name: string }[]; brands: { id: string; name: string }[]; onSaved: () => void }) {
  const { org, user } = useOrg();
  const toast = useToast();
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDraft({ ...draft, [k]: e.target.value });

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) return setErr('Choose an image file.');
    if (file.size > 5 * 1024 * 1024) return setErr('Images must be 5 MB or smaller.');
    setUploading(true); setErr('');
    const path = `${org.id}/${crypto.randomUUID()}.${file.name.split('.').pop()?.toLowerCase() ?? 'jpg'}`;
    const s = getSupabase();
    const { error } = await s.storage.from('product-images').upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setErr(`Image upload failed: ${error.message}. Make sure the product-images storage bucket exists, or paste an image URL.`);
    setDraft({ ...draft, image_url: s.storage.from('product-images').getPublicUrl(path).data.publicUrl });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const price = Number(draft.price), cap = draft.compare_at_price ? Number(draft.compare_at_price) : null, inv = Number(draft.inventory_quantity || 0);
    if (!draft.title.trim()) return setErr('Enter a product title.');
    if (!Number.isFinite(price) || price < 0) return setErr('Enter a valid price.');
    if (cap != null && (!Number.isFinite(cap) || cap < 0)) return setErr('Enter a valid compare at price.');
    if (!Number.isInteger(inv)) return setErr('Inventory must be a whole number.');
    if (draft.image_url && !/^https?:\/\//.test(draft.image_url)) return setErr('Image URL must start with http or https.');
    setSaving(true);
    try {
      const category_id = await ensureNamed('product_categories', org.id, draft.category, categories);
      const brand_id = await ensureNamed('brands', org.id, draft.brand, brands);
      const row = { org_id: org.id, title: draft.title.trim(), description: draft.description.trim() || null, price, compare_at_price: cap, sku: draft.sku.trim() || null, category_id, brand_id, inventory_quantity: inv, status: draft.status, image_url: draft.image_url.trim() || null,
        tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean), attributes: Object.fromEntries(draft.attributes.filter((a) => a.k.trim()).map((a) => [a.k.trim(), a.v.trim()])) };
      const s = getSupabase();
      const res = draft.id ? await s.from('products').update(row).eq('id', draft.id).select('id').single() : await s.from('products').insert(row).select('id').single();
      if (res.error) throw new Error(res.error.message);
      await logAudit(org.id, user.id, draft.id ? 'product.updated' : 'product.created', 'product', res.data.id, { name: row.title });
      toast('success', draft.id ? 'Product updated.' : 'Product added.'); onSaved();
    } catch (x) { setErr((x as Error).message); }
    setSaving(false);
  }
  return (
    <Modal open onClose={() => setDraft(null)} title={draft.id ? 'Edit product' : 'Add product'} size="lg"
      footer={<><Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" form="product-form" loading={saving}>Save product</Button></>}>
      <form id="product-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {err && <Alert tone="error" className="sm:col-span-2">{err}</Alert>}
        <div className="sm:col-span-2"><Field label="Title" htmlFor="pt"><Input id="pt" value={draft.title} onChange={set('title')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Description" htmlFor="pd"><Textarea id="pd" value={draft.description} onChange={set('description')} /></Field></div>
        <Field label="Price" htmlFor="pp"><Input id="pp" inputMode="decimal" value={draft.price} onChange={set('price')} placeholder="0.00" /></Field>
        <Field label="Compare at price" htmlFor="pc" hint="(optional)"><Input id="pc" inputMode="decimal" value={draft.compare_at_price} onChange={set('compare_at_price')} /></Field>
        <Field label="Category" htmlFor="pcat" hint="(type to create)"><Input id="pcat" list="cats" value={draft.category} onChange={set('category')} /><datalist id="cats">{categories.map((c) => <option key={c.id} value={c.name} />)}</datalist></Field>
        <Field label="Brand" htmlFor="pb" hint="(type to create)"><Input id="pb" list="brands" value={draft.brand} onChange={set('brand')} /><datalist id="brands">{brands.map((b) => <option key={b.id} value={b.name} />)}</datalist></Field>
        <Field label="SKU" htmlFor="ps"><Input id="ps" value={draft.sku} onChange={set('sku')} /></Field>
        <Field label="Inventory" htmlFor="pi"><Input id="pi" inputMode="numeric" value={draft.inventory_quantity} onChange={set('inventory_quantity')} /></Field>
        <Field label="Status" htmlFor="pst"><Select id="pst" value={draft.status} onChange={set('status')}><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></Select></Field>
        <Field label="Tags" htmlFor="ptg" hint="(comma separated)"><Input id="ptg" value={draft.tags} onChange={set('tags')} placeholder="summer, linen" /></Field>
        <div className="sm:col-span-2">
          <Field label="Image" htmlFor="pimg">
            <div className="flex gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-charcoal/10"><ProductArt category={draft.category} image={draft.image_url || null} /></div>
              <div className="flex-1 space-y-2"><Input id="pimg" value={draft.image_url} onChange={set('image_url')} placeholder="https://..." />
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-teal"><Upload className="h-4 w-4" />{uploading ? 'Uploading' : 'Upload image'}<input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label></div>
            </div>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between"><span className="text-sm font-medium">Attributes</span><button type="button" className="text-sm font-semibold text-teal" onClick={() => setDraft({ ...draft, attributes: [...draft.attributes, { k: '', v: '' }] })}>Add attribute</button></div>
          <div className="space-y-2">{draft.attributes.map((a, i) => (
            <div key={i} className="flex gap-2"><Input placeholder="Name, for example color" value={a.k} onChange={(e) => setDraft({ ...draft, attributes: draft.attributes.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)) })} aria-label="Attribute name" />
              <Input placeholder="Value" value={a.v} onChange={(e) => setDraft({ ...draft, attributes: draft.attributes.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)) })} aria-label="Attribute value" />
              <button type="button" onClick={() => setDraft({ ...draft, attributes: draft.attributes.filter((_, j) => j !== i) })} className="rounded-lg px-2 text-muted hover:text-danger" aria-label="Remove attribute"><X className="h-4 w-4" /></button></div>
          ))}</div>
        </div>
      </form>
    </Modal>
  );
}

function ImportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { org, user } = useOrg();
  const toast = useToast();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!open) { setRows([]); setErrors([]); } }, [open]);

  function parse(file: File) {
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase(), complete: (r) => {
      const errs: string[] = [];
      r.data.forEach((row, i) => {
        if (!row.title?.trim()) errs.push(`Row ${i + 2}: title is required.`);
        if (row.price && !Number.isFinite(Number(row.price))) errs.push(`Row ${i + 2}: price "${row.price}" is not a number.`);
      });
      if (!r.meta.fields?.includes('title')) errs.unshift('The file needs a "title" column.');
      setRows(r.data.slice(0, 5000)); setErrors(errs.slice(0, 20));
    } });
  }
  async function run() {
    setBusy(true);
    try {
      const s = getSupabase();
      const cats = [...new Set(rows.map((r) => r.category?.trim()).filter(Boolean))];
      const brs = [...new Set(rows.map((r) => r.brand?.trim()).filter(Boolean))];
      const cm = new Map<string, string>(), bm = new Map<string, string>();
      if (cats.length) { const { data, error } = await s.from('product_categories').upsert(cats.map((name) => ({ org_id: org.id, name })), { onConflict: 'org_id,name' }).select('id, name'); if (error) throw error; data.forEach((c) => cm.set(c.name, c.id)); }
      if (brs.length) { const { data, error } = await s.from('brands').upsert(brs.map((name) => ({ org_id: org.id, name })), { onConflict: 'org_id,name' }).select('id, name'); if (error) throw error; data.forEach((b) => bm.set(b.name, b.id)); }
      const items = rows.filter((r) => r.title?.trim()).map((r) => ({
        org_id: org.id, title: r.title.trim().slice(0, 300), description: r.description?.trim() || null, price: Number(r.price || 0), compare_at_price: r.compare_at_price ? Number(r.compare_at_price) : null, sku: r.sku?.trim() || null,
        category_id: r.category ? cm.get(r.category.trim()) ?? null : null, brand_id: r.brand ? bm.get(r.brand.trim()) ?? null : null, inventory_quantity: parseInt(r.inventory || r.inventory_quantity || '0', 10) || 0,
        status: ['active', 'draft', 'archived'].includes(r.status) ? r.status : 'active', image_url: /^https?:\/\//.test(r.image_url ?? '') ? r.image_url : null,
        tags: (r.tags ?? '').split(/[;|]/).map((t) => t.trim()).filter(Boolean), attributes: Object.fromEntries(Object.entries(r).filter(([k, v]) => k.startsWith('attr_') && v).map(([k, v]) => [k.slice(5), v])),
      }));
      for (let i = 0; i < items.length; i += 500) { const { error } = await s.from('products').insert(items.slice(i, i + 500)); if (error) throw error; }
      await logAudit(org.id, user.id, 'catalog.imported', 'product', undefined, { rows: items.length });
      toast('success', `Imported ${items.length} products.`); onDone(); onClose();
    } catch (e) { toast('error', `Import failed: ${(e as Error).message}`); }
    setBusy(false);
  }
  const template = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['title,description,price,compare_at_price,sku,category,brand,inventory,status,image_url,tags,attr_color\nExample Tee,Soft cotton tee,25,,TEE-1,Apparel,Your Brand,40,active,,cotton;basics,Black\n'], { type: 'text/csv' })); a.download = 'custo-product-template.csv'; a.click(); };
  const blocking = errors.some((e) => e.includes('column'));
  return (
    <Modal open={open} onClose={onClose} title="Import products from CSV" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={run} loading={busy} disabled={!rows.length || blocking}>Import {rows.filter((r) => r.title?.trim()).length || ''} products</Button></>}>
      <div className="space-y-4 text-sm">
        <p className="text-muted">Columns: title (required), description, price, compare_at_price, sku, category, brand, inventory, status, image_url, tags (separated by semicolons) and any attr_name columns for attributes. <button className="link" onClick={template}>Download a template</button></p>
        <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-charcoal/15 p-8 text-muted hover:border-teal hover:text-teal">
          <Upload className="h-6 w-6" /><span className="font-semibold">Choose a CSV file</span></button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && parse(e.target.files[0])} />
        {errors.length > 0 && <Alert tone={blocking ? 'error' : 'warning'}><ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>{!blocking && <p className="mt-1">Rows without a title will be skipped.</p>}</Alert>}
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-charcoal/10"><table className="w-full text-xs"><thead><tr className="bg-soft/70 text-left"><th className="px-3 py-2">Title</th><th className="px-3">Price</th><th className="px-3">Category</th><th className="px-3">Brand</th><th className="px-3">Inventory</th></tr></thead>
            <tbody>{rows.slice(0, 6).map((r, i) => <tr key={i} className="border-t border-charcoal/5"><td className="px-3 py-1.5">{r.title}</td><td className="px-3">{r.price}</td><td className="px-3">{r.category}</td><td className="px-3">{r.brand}</td><td className="px-3">{r.inventory}</td></tr>)}</tbody></table>
            <p className="px-3 py-2 text-xs text-muted">Showing {Math.min(6, rows.length)} of {rows.length} rows.</p></div>
        )}
      </div>
    </Modal>
  );
}

function NamedList({ table, items, counts, onChange, label }: { table: 'product_categories' | 'brands'; items: { id: string; name: string }[]; counts: (id: string) => number; onChange: () => void; label: string }) {
  const { org, canEdit } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const [name, setName] = useState(''); const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return;
    const { error } = await getSupabase().from(table).insert({ org_id: org.id, name: name.trim() });
    if (error) return toast('error', error.code === '23505' ? `That ${label} already exists.` : error.message);
    setName(''); onChange();
  }
  async function rename() {
    if (!editing?.name.trim()) return;
    const { error } = await getSupabase().from(table).update({ name: editing.name.trim() }).eq('id', editing.id);
    if (error) return toast('error', error.code === '23505' ? `That ${label} already exists.` : error.message);
    setEditing(null); onChange();
  }
  async function del(i: { id: string; name: string }) {
    if (!(await confirm({ title: `Delete ${label}?`, message: `"${i.name}" will be removed. Products keep their other details but lose this ${label}.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    const { error } = await getSupabase().from(table).delete().eq('id', i.id);
    if (error) return toast('error', error.message); onChange();
  }
  return (
    <Card>
      {canEdit && <form onSubmit={add} className="flex gap-2 border-b border-charcoal/5 p-4"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${label} name`} aria-label={`New ${label}`} /><Button type="submit">Add</Button></form>}
      {items.length === 0 ? <EmptyState title={`No ${label === 'category' ? 'categories' : 'brands'} yet`} /> : (
        <ul className="divide-y divide-charcoal/5">{items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
            {editing?.id === i.id ? <div className="flex flex-1 gap-2"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="Name" /><Button size="sm" onClick={rename}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
              : <><span className="font-medium">{i.name} <span className="ml-1 text-xs text-muted">{counts(i.id)} products</span></span>{canEdit && <div className="flex gap-1"><button className="rounded-lg p-2 text-muted hover:bg-soft" onClick={() => setEditing(i)} aria-label={`Rename ${i.name}`}><Pencil className="h-4 w-4" /></button><button className="rounded-lg p-2 text-muted hover:bg-soft hover:text-danger" onClick={() => del(i)} aria-label={`Delete ${i.name}`}><Trash2 className="h-4 w-4" /></button></div>}</>}
          </li>
        ))}</ul>
      )}
    </Card>
  );
}

function AttributesPanel({ products }: { products: Product[] }) {
  const { org, canEdit } = useOrg();
  const toast = useToast();
  const [defs, setDefs] = useState<{ id: string; name: string; attr_type: string; allowed_values: string[] }[]>([]);
  const [form, setForm] = useState({ name: '', attr_type: 'text', values: '' });
  const load = async () => { const { data } = await getSupabase().from('product_attributes').select('id, name, attr_type, allowed_values').eq('org_id', org.id).order('name'); setDefs(data ?? []); };
  useEffect(() => { load(); }, [org.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const used = useMemo(() => { const m = new Map<string, Set<string>>(); products.forEach((p) => Object.entries(p.attributes ?? {}).forEach(([k, v]) => { if (!m.has(k)) m.set(k, new Set()); m.get(k)!.add(String(v)); })); return m; }, [products]);
  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return;
    const { error } = await getSupabase().from('product_attributes').insert({ org_id: org.id, name: form.name.trim().toLowerCase().replace(/\s+/g, '_'), attr_type: form.attr_type, allowed_values: form.values.split(',').map((v) => v.trim()).filter(Boolean) });
    if (error) return toast('error', error.code === '23505' ? 'That attribute already exists.' : error.message);
    setForm({ name: '', attr_type: 'text', values: '' }); load();
  }
  async function del(id: string) { const { error } = await getSupabase().from('product_attributes').delete().eq('id', id); if (error) toast('error', error.message); else load(); }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-display font-bold">Attribute definitions</h2><p className="mt-1 text-sm text-muted">Define attributes used in search filters and recommendation rules.</p>
        {canEdit && <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]"><Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Attribute name" /><Select value={form.attr_type} onChange={(e) => setForm({ ...form, attr_type: e.target.value })} aria-label="Type"><option value="text">Text</option><option value="number">Number</option><option value="boolean">Yes or no</option><option value="list">List</option></Select><Input placeholder="Allowed values, comma separated" value={form.values} onChange={(e) => setForm({ ...form, values: e.target.value })} aria-label="Allowed values" /><Button type="submit">Add</Button></form>}
        <ul className="mt-4 divide-y divide-charcoal/5">{defs.length === 0 ? <li className="py-4 text-sm text-muted">No definitions yet.</li> : defs.map((d) => <li key={d.id} className="flex items-center justify-between py-2.5 text-sm"><span><b>{d.name}</b> <span className="text-muted">{d.attr_type}{d.allowed_values.length ? `: ${d.allowed_values.join(', ')}` : ''}</span></span>{canEdit && <button onClick={() => del(d.id)} className="text-muted hover:text-danger" aria-label={`Delete ${d.name}`}><Trash2 className="h-4 w-4" /></button>}</li>)}</ul>
      </Card>
      <Card className="p-5">
        <h2 className="font-display font-bold">Attributes found in products</h2>
        <ul className="mt-3 space-y-2 text-sm">{used.size === 0 ? <li className="text-muted">No product attributes yet.</li> : [...used.entries()].map(([k, v]) => <li key={k}><b>{k}</b> <span className="text-muted">{[...v].slice(0, 8).join(', ')}{v.size > 8 ? ` and ${v.size - 8} more` : ''}</span></li>)}</ul>
      </Card>
    </div>
  );
}

export default function CatalogPage() {
  return <Suspense fallback={<LoadingBlock />}><CatalogInner /></Suspense>;
}
