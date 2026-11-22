'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plug, RefreshCw, Unplug } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Input, LoadingBlock, Modal, Select, StatusBadge, Tabs, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { getSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/org';
import { PROVIDERS, type Provider } from '@/lib/integrations';
import { fmtDateTime, fmtNum } from '@/lib/format';

type Integ = { id: string; store_id: string | null; provider: string; status: string; last_error: string | null; last_tested_at: string | null; config: Record<string, string> };
type Store = { id: string; name: string; platform: string };

function IntegrationsInner() {
  const { org, role } = useOrg();
  const params = useSearchParams();
  const canManage = ['org_admin', 'store_manager'].includes(role);
  const toast = useToast(); const confirm = useConfirm();
  const [integs, setIntegs] = useState<Integ[] | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [tab, setTab] = useState<'all' | 'Commerce platform' | 'other'>('all');
  const [active, setActive] = useState<Provider | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [storeId, setStoreId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = getSupabase();
    const [{ data: ig }, { data: st }] = await Promise.all([
      s.from('store_integrations').select('id, store_id, provider, status, last_error, last_tested_at, config').eq('org_id', org.id),
      s.from('stores').select('id, name, platform').eq('org_id', org.id),
    ]);
    setIntegs((ig as Integ[]) ?? []); setStores((st as Store[]) ?? []);
  }, [org.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const p = PROVIDERS.find((x) => x.id === params.get('provider'));
    if (p) { setActive(p); setStoreId(params.get('store') ?? ''); }
  }, [params]);

  function open(p: Provider) { setActive(p); setCreds({}); setErr(''); setStoreId(''); }

  async function connect(e: React.FormEvent) {
    e.preventDefault(); if (!active) return; setErr('');
    for (const f of active.fields) if (!creds[f.key]?.trim()) return setErr(`${f.label} is required.`);
    setBusy('connect');
    const r = await fetch('/api/integrations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'connect', org_id: org.id, provider: active.id, credentials: creds, store_id: storeId || null }) });
    const j = await r.json();
    if (!r.ok) { setBusy(null); return setErr(j.error ?? 'Connection failed.'); }
    toast('success', `Connected to ${j.store_name}. Importing products now.`);
    setActive(null); setCreds({});
    const s = await fetch('/api/integrations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'sync', org_id: org.id, integration_id: j.integration_id }) });
    const sj = await s.json(); setBusy(null);
    toast(s.ok ? 'success' : 'error', s.ok ? `Imported ${fmtNum(sj.products)} products.` : sj.error);
    load();
  }

  async function action(i: Integ, act: 'sync' | 'disconnect') {
    if (act === 'disconnect' && !(await confirm({ title: 'Disconnect integration?', message: 'Stored credentials are deleted and product synchronization stops. Imported products remain in the catalog.', confirmLabel: 'Disconnect', tone: 'danger' }))) return;
    setBusy(i.id);
    const r = await fetch('/api/integrations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: act, org_id: org.id, integration_id: i.id }) });
    const j = await r.json(); setBusy(null);
    if (!r.ok) toast('error', j.error); else toast('success', act === 'sync' ? `Synchronized ${fmtNum(j.products)} products.` : 'Integration disconnected.');
    load();
  }

  const list = PROVIDERS.filter((p) => tab === 'all' || (tab === 'other' ? p.category !== 'Commerce platform' : p.category === tab));

  return (
    <>
      <PageHeader title="Integrations" description="Connect commerce platforms and data services. An integration only shows as connected after its credentials pass a live test." />
      {!canManage && <Alert tone="info" className="mb-5">Only Organization Admins and Store Managers can manage integrations.</Alert>}
      {integs && integs.filter((i) => i.status !== 'not_configured').length > 0 && (
        <Card className="mb-6 divide-y divide-charcoal/5">
          <div className="px-5 py-3 font-display font-bold">Your connections</div>
          {integs.filter((i) => i.status !== 'not_configured').map((i) => (
            <div key={i.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex items-center gap-2 font-semibold">{PROVIDERS.find((p) => p.id === i.provider)?.name ?? i.provider}<StatusBadge status={i.status} /></div>
                <div className="text-xs text-muted">{stores.find((s) => s.id === i.store_id)?.name} · Last tested {fmtDateTime(i.last_tested_at)}</div>
                {i.last_error && <div className="mt-1 text-xs text-danger">{i.last_error}</div>}</div>
              {canManage && <div className="flex gap-2"><Button size="sm" variant="secondary" loading={busy === i.id} onClick={() => action(i, 'sync')}><RefreshCw className="h-4 w-4" /> Sync</Button><Button size="sm" variant="ghost" onClick={() => action(i, 'disconnect')}><Unplug className="h-4 w-4" /> Disconnect</Button></div>}
            </div>
          ))}
        </Card>
      )}
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All' }, { id: 'Commerce platform', label: 'Commerce platforms' }, { id: 'other', label: 'Analytics and marketing' }]} />
      {!integs ? <LoadingBlock /> : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const connected = integs.filter((i) => i.provider === p.id && i.status === 'connected').length;
            return (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div><h2 className="font-display text-lg font-bold">{p.name}</h2><p className="text-xs text-muted">{p.category}</p></div>
                  {connected ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> {connected} connected</Badge> : p.connectable ? <Badge>Not connected</Badge> : <Badge tone="warning">Not available yet</Badge>}
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">{p.description}</p>
                <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-teal">Setup instructions</summary><ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">{p.steps.map((s) => <li key={s}>{s}</li>)}</ol></details>
                {p.connectable && canManage && <Button className="mt-4" variant="secondary" onClick={() => open(p)}><Plug className="h-4 w-4" /> {connected ? 'Connect another store' : 'Connect'}</Button>}
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={!!active} onClose={() => setActive(null)} title={`Connect ${active?.name ?? ''}`} description="Credentials are tested live, then stored server side. They are never sent back to the browser."
        footer={<><Button variant="secondary" onClick={() => setActive(null)}>Cancel</Button><Button type="submit" form="connect-form" loading={busy === 'connect'}>Test and connect</Button></>}>
        {active && (
          <form id="connect-form" onSubmit={connect} className="space-y-4">
            {err && <Alert tone="error">{err}</Alert>}
            <ol className="list-decimal space-y-1 rounded-xl bg-soft/70 p-4 pl-8 text-sm text-muted">{active.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            {active.fields.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={f.key}><Input id={f.key} type={f.type ?? 'text'} autoComplete="off" placeholder={f.placeholder} value={creds[f.key] ?? ''} onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })} /></Field>
            ))}
            <Field label="Attach to store" htmlFor="store" hint="(optional)">
              <Select id="store" value={storeId} onChange={(e) => setStoreId(e.target.value)}><option value="">Create a new store from this connection</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            </Field>
          </form>
        )}
      </Modal>
    </>
  );
}

export default function IntegrationsPage() {
  return <Suspense fallback={<LoadingBlock />}><IntegrationsInner /></Suspense>;
}
