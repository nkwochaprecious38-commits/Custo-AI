'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Copy, Plus, RefreshCw, Store as StoreIcon, Trash2, Code2, Plug } from 'lucide-react';
import { Alert, Button, Card, EmptyState, Field, Input, LoadingBlock, Modal, Select, StatusBadge, labelize, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';
import { fmtDateTime, fmtNum, timeAgo } from '@/lib/format';

type Store = { id: string; name: string; url: string | null; platform: string; status: string; tracking_key: string; product_count: number; last_synced_at: string | null; last_event_at: string | null; created_at: string };
type Integ = { id: string; store_id: string | null; provider: string; status: string; last_error: string | null };
const PLATFORMS = ['shopify', 'shopify_plus', 'woocommerce', 'bigcommerce', 'adobe_commerce', 'shopware', 'salesforce_commerce', 'custom'];
const CONNECTABLE = ['shopify', 'shopify_plus', 'woocommerce', 'bigcommerce'];

export default function StoresPage() {
  const { org, user, role } = useOrg();
  const canManage = ['org_admin', 'store_manager'].includes(role);
  const toast = useToast(); const confirm = useConfirm();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [integs, setIntegs] = useState<Integ[]>([]);
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', platform: 'custom' });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [snippet, setSnippet] = useState<Store | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = getSupabase();
    const [{ data: st }, { data: ig }] = await Promise.all([
      s.from('stores').select('*').eq('org_id', org.id).order('created_at'),
      s.from('store_integrations').select('id, store_id, provider, status, last_error').eq('org_id', org.id),
    ]);
    setStores((st as Store[]) ?? []); setIntegs((ig as Integ[]) ?? []);
    const since = new Date(Date.now() - 86400000).toISOString();
    const counts: Record<string, number> = {};
    await Promise.all(((st as Store[]) ?? []).map(async (x) => {
      const { count } = await s.from('behavioral_events').select('id', { count: 'exact', head: true }).eq('store_id', x.id).gte('occurred_at', since);
      counts[x.id] = count ?? 0;
    }));
    setActivity(counts);
  }, [org.id]);
  useEffect(() => { load(); }, [load]);

  async function addStore(e: React.FormEvent) {
    e.preventDefault(); setFormErr('');
    if (form.name.trim().length < 2) return setFormErr('Enter a store name.');
    let url: string | null = null;
    if (form.url.trim()) { try { url = new URL(/^https?:\/\//.test(form.url) ? form.url : `https://${form.url}`).origin; } catch { return setFormErr('Enter a valid store URL.'); } }
    setSaving(true);
    const { data, error } = await getSupabase().from('stores').insert({ org_id: org.id, name: form.name.trim(), url, platform: form.platform, status: 'not_connected' }).select('id').single();
    setSaving(false);
    if (error) return setFormErr(error.message);
    await logAudit(org.id, user.id, 'store.created', 'store', data.id, { name: form.name.trim() });
    toast('success', 'Store added. Complete the setup to start receiving data.');
    setAdding(false); setForm({ name: '', url: '', platform: 'custom' }); load();
  }

  async function remove(st: Store) {
    if (!(await confirm({ title: `Remove ${st.name}?`, message: 'The store, its integration credentials and its tracking key will be removed. Products and events already imported stay in the workspace.', confirmLabel: 'Remove store', tone: 'danger' }))) return;
    const { error } = await getSupabase().from('stores').delete().eq('id', st.id);
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'store.deleted', 'store', st.id, { name: st.name });
    toast('success', 'Store removed.'); load();
  }

  async function sync(integ: Integ) {
    setSyncing(integ.id);
    const r = await fetch('/api/integrations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'sync', org_id: org.id, integration_id: integ.id }) });
    const j = await r.json(); setSyncing(null);
    if (!r.ok) toast('error', j.error ?? 'Sync failed.'); else toast('success', `Synchronized ${fmtNum(j.products)} products.`);
    load();
  }

  return (
    <>
      <PageHeader title="Store Connections" description="Connect storefronts, synchronize products and send shopper events to Custo AI."
        actions={canManage && <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add store</Button>} />
      {!canManage && <Alert tone="info" className="mb-5">Only Organization Admins and Store Managers can add or change stores.</Alert>}
      {!stores ? <LoadingBlock /> : stores.length === 0 ? (
        <Card><EmptyState icon={StoreIcon} title="No stores connected" description="Add a store to get a tracking key, or connect Shopify, WooCommerce or BigCommerce to import your catalog. Until then, the dashboard shows the clearly labeled demo dataset."
          action={canManage && <div className="flex flex-wrap justify-center gap-2"><Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add store</Button><Link href="/app/integrations"><Button variant="secondary"><Plug className="h-4 w-4" /> Browse integrations</Button></Link></div>} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {stores.map((st) => {
            const integ = integs.find((i) => i.store_id === st.id);
            const connectable = CONNECTABLE.includes(st.platform);
            return (
              <Card key={st.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h2 className="truncate font-display text-lg font-bold">{st.name}</h2>
                    {st.url ? <a href={st.url} target="_blank" rel="noopener noreferrer" className="link truncate text-sm">{st.url.replace(/^https?:\/\//, '')}</a> : <span className="text-sm text-muted">No URL</span>}</div>
                  <StatusBadge status={st.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-xs text-muted">Platform</dt><dd className="font-medium">{labelize(st.platform)}</dd></div>
                  <div><dt className="text-xs text-muted">Products</dt><dd className="font-medium">{fmtNum(st.product_count)}</dd></div>
                  <div><dt className="text-xs text-muted">Last sync</dt><dd className="font-medium" title={fmtDateTime(st.last_synced_at)}>{timeAgo(st.last_synced_at)}</dd></div>
                  <div><dt className="text-xs text-muted">Events, 24 h</dt><dd className="font-medium">{fmtNum(activity[st.id] ?? 0)}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-muted">Last event received: {st.last_event_at ? fmtDateTime(st.last_event_at) : 'none yet'}</p>
                {integ?.status === 'error' && <Alert tone="error" className="mt-3">{integ.last_error}</Alert>}
                {st.status !== 'connected' && (
                  <div className="mt-4 rounded-xl bg-soft/70 p-4 text-sm">
                    <p className="font-semibold">Setup required</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                      {connectable ? <li>Connect the {labelize(st.platform)} integration with API credentials to import products.</li> : <li>Import your catalog with a CSV file in Product Catalog.</li>}
                      <li>Install the tracking snippet so shopper events reach Custo AI.</li>
                    </ol>
                  </div>
                )}
                {canManage && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setSnippet(st)}><Code2 className="h-4 w-4" /> Tracking snippet</Button>
                    {integ?.status === 'connected' ? <Button size="sm" variant="secondary" loading={syncing === integ.id} onClick={() => sync(integ)}><RefreshCw className="h-4 w-4" /> Sync products</Button>
                      : connectable && <Link href={`/app/integrations?provider=${st.platform}&store=${st.id}`}><Button size="sm"><Plug className="h-4 w-4" /> Connect {labelize(st.platform)}</Button></Link>}
                    {st.platform === 'custom' || !connectable ? <Link href="/app/catalog?import=1"><Button size="sm" variant="ghost">Import CSV</Button></Link> : null}
                    <Button size="sm" variant="ghost" onClick={() => remove(st)} className="!text-danger"><Trash2 className="h-4 w-4" /> Remove</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a store" description="You can connect an integration after the store is created."
        footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" form="add-store" loading={saving}>Add store</Button></>}>
        <form id="add-store" onSubmit={addStore} className="space-y-4">
          {formErr && <Alert tone="error">{formErr}</Alert>}
          <Field label="Store name" htmlFor="sn"><Input id="sn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main storefront" /></Field>
          <Field label="Store URL" htmlFor="su" hint="(optional)"><Input id="su" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="yourstore.com" /></Field>
          <Field label="Platform" htmlFor="sp"><Select id="sp" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>{PLATFORMS.map((p) => <option key={p} value={p}>{p === 'custom' ? 'Custom or other' : labelize(p)}</option>)}</Select></Field>
        </form>
      </Modal>

      <Modal open={!!snippet} onClose={() => setSnippet(null)} title="Tracking snippet" description={snippet?.name} size="lg">
        {snippet && <SnippetBody store={snippet} />}
      </Modal>
    </>
  );
}

function SnippetBody({ store }: { store: Store }) {
  const toast = useToast();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const code = `<script>
  // Custo AI storefront tracking. Call custo.track only after the shopper has given consent.
  window.custo = {
    key: '${store.tracking_key}',
    session: sessionStorage.custoSid || (sessionStorage.custoSid = crypto.randomUUID()),
    track: function (events, customer) {
      return fetch('${origin}/api/track', {
        method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ key: this.key, consent: true, session_id: this.session, customer: customer,
          device: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop', events: [].concat(events) })
      });
    }
  };
  // Examples:
  // custo.track({ type: 'page_view', properties: { path: location.pathname } });
  // custo.track({ type: 'product_view', product_id: 'YOUR_PRODUCT_ID' });
  // custo.track({ type: 'search', query: 'walking shoes', results_count: 12 });
  // custo.track({ type: 'purchase', order: { id: '1001', total: 89, currency: 'USD' } }, { id: 'customer-42' });
</script>`;
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast('success', 'Copied to clipboard.'); } catch { toast('error', 'Copy failed. Select the text and copy it manually.'); } };
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted">Add this snippet to your storefront theme. Events are only stored when your site sends <code className="rounded bg-soft px-1">consent: true</code>, so connect it to your cookie consent banner.</p>
      <div className="relative"><pre className="max-h-80 overflow-auto rounded-xl bg-ink p-4 text-xs leading-relaxed text-white/90">{code}</pre>
        <Button size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => copy(code)}><Copy className="h-3.5 w-3.5" /> Copy</Button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-soft/70 p-3"><div className="text-xs text-muted">Tracking key</div><code className="break-all text-xs">{store.tracking_key}</code></div>
        <div className="rounded-xl bg-soft/70 p-3"><div className="text-xs text-muted">Storefront APIs</div><code className="break-all text-xs">GET /api/storefront/search?key=…&amp;q=…<br />GET /api/storefront/recommendations?key=…&amp;campaign=…</code></div>
      </div>
      <p className="text-xs text-muted">The tracking key only allows sending events and reading public product results. It cannot read customer data or change settings.</p>
    </div>
  );
}
