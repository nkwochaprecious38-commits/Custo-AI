import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { jsonError, requireMember } from '@/lib/serverAuth';
import { PROVIDERS } from '@/lib/integrations';

type Creds = Record<string, string>;
type RemoteProduct = { external_id: string; title: string; description: string | null; price: number; compare_at_price: number | null; sku: string | null; inventory_quantity: number; image_url: string | null; tags: string[]; category: string | null; brand: string | null; status: 'active' | 'draft' | 'archived' };

const strip = (h: string | null | undefined) => (h ? h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000) : null);
const fetchJson = async (url: string, init: RequestInit) => {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(20000), cache: 'no-store' });
  const text = await r.text();
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'The store rejected these credentials. Check the token and its permissions.' : `The store API responded with status ${r.status}.`);
  try { return { json: JSON.parse(text), headers: r.headers }; } catch { throw new Error('The store API did not return valid JSON. Check the store address.'); }
};

function normShop(v: string) {
  const s = v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s)) throw new Error('Enter the store domain in the form your-store.myshopify.com.');
  return s;
}
function normHttps(v: string) {
  const u = new URL(v.trim());
  if (u.protocol !== 'https:') throw new Error('The store URL must use HTTPS.');
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) throw new Error('Private network addresses are not allowed.');
  return u.origin;
}

async function testConnection(provider: string, c: Creds): Promise<{ name: string; url: string; config: Record<string, string> }> {
  if (provider === 'shopify' || provider === 'shopify_plus') {
    const shop = normShop(c.shop ?? '');
    const { json } = await fetchJson(`https://${shop}/admin/api/2024-10/shop.json`, { headers: { 'X-Shopify-Access-Token': c.access_token ?? '' } });
    return { name: json.shop?.name ?? shop, url: `https://${json.shop?.domain ?? shop}`, config: { shop } };
  }
  if (provider === 'woocommerce') {
    const base = normHttps(c.url ?? '');
    const auth = 'Basic ' + Buffer.from(`${c.consumer_key}:${c.consumer_secret}`).toString('base64');
    await fetchJson(`${base}/wp-json/wc/v3/products?per_page=1`, { headers: { Authorization: auth } });
    return { name: new URL(base).hostname, url: base, config: { url: base } };
  }
  if (provider === 'bigcommerce') {
    const hash = (c.store_hash ?? '').trim();
    if (!/^[a-z0-9]+$/i.test(hash)) throw new Error('Enter a valid store hash.');
    const { json } = await fetchJson(`https://api.bigcommerce.com/stores/${hash}/v2/store`, { headers: { 'X-Auth-Token': c.access_token ?? '', Accept: 'application/json' } });
    return { name: json.name ?? hash, url: json.secure_url ?? json.domain ?? '', config: { store_hash: hash } };
  }
  throw new Error('This integration does not have a connector yet.');
}

async function fetchProducts(provider: string, c: Creds): Promise<RemoteProduct[]> {
  const out: RemoteProduct[] = [];
  if (provider === 'shopify' || provider === 'shopify_plus') {
    const shop = normShop(c.shop);
    let url: string | null = `https://${shop}/admin/api/2024-10/products.json?limit=250`;
    while (url && out.length < 5000) {
      const { json, headers }: { json: { products: Record<string, any>[] }; headers: Headers } = await fetchJson(url, { headers: { 'X-Shopify-Access-Token': c.access_token } });
      for (const p of json.products) {
        const v = p.variants?.[0] ?? {};
        out.push({ external_id: String(p.id), title: p.title, description: strip(p.body_html), price: Number(v.price ?? 0), compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null, sku: v.sku || null,
          inventory_quantity: (p.variants ?? []).reduce((a: number, x: { inventory_quantity?: number }) => a + (x.inventory_quantity ?? 0), 0), image_url: p.image?.src ?? null,
          tags: String(p.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean), category: p.product_type || null, brand: p.vendor || null, status: p.status === 'active' ? 'active' : p.status === 'archived' ? 'archived' : 'draft' });
      }
      const link = headers.get('link') ?? '';
      url = /<([^>]+)>;\s*rel="next"/.exec(link)?.[1] ?? null;
    }
  } else if (provider === 'woocommerce') {
    const base = normHttps(c.url);
    const auth = 'Basic ' + Buffer.from(`${c.consumer_key}:${c.consumer_secret}`).toString('base64');
    for (let page = 1; page <= 50; page++) {
      const { json } = await fetchJson(`${base}/wp-json/wc/v3/products?per_page=100&page=${page}`, { headers: { Authorization: auth } });
      for (const p of json as Record<string, any>[]) {
        out.push({ external_id: String(p.id), title: p.name, description: strip(p.short_description || p.description), price: Number(p.price || 0), compare_at_price: p.regular_price && p.sale_price ? Number(p.regular_price) : null,
          sku: p.sku || null, inventory_quantity: p.stock_quantity ?? (p.stock_status === 'instock' ? 1 : 0), image_url: p.images?.[0]?.src ?? null, tags: (p.tags ?? []).map((t: { name: string }) => t.name),
          category: p.categories?.[0]?.name ?? null, brand: null, status: p.status === 'publish' ? 'active' : 'draft' });
      }
      if ((json as unknown[]).length < 100) break;
    }
  } else if (provider === 'bigcommerce') {
    const hash = c.store_hash;
    for (let page = 1; page <= 50; page++) {
      const { json } = await fetchJson(`https://api.bigcommerce.com/stores/${hash}/v3/catalog/products?limit=250&page=${page}&include=images`, { headers: { 'X-Auth-Token': c.access_token, Accept: 'application/json' } });
      for (const p of json.data as Record<string, any>[]) {
        out.push({ external_id: String(p.id), title: p.name, description: strip(p.description), price: Number(p.price ?? 0), compare_at_price: p.retail_price ? Number(p.retail_price) : null, sku: p.sku || null,
          inventory_quantity: p.inventory_level ?? 0, image_url: p.images?.[0]?.url_standard ?? null, tags: p.search_keywords ? String(p.search_keywords).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          category: null, brand: null, status: p.is_visible ? 'active' : 'draft' });
      }
      if (json.meta?.pagination?.current_page >= json.meta?.pagination?.total_pages) break;
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid request body.');
  const { action, org_id } = body as { action: string; org_id: string };
  const auth = await requireMember(org_id, ['org_admin', 'store_manager']);
  if ('error' in auth) return auth.error;
  const admin = getAdminSupabase();
  if (!admin) return jsonError('Integrations need the SUPABASE_SERVICE_ROLE_KEY server variable so credentials can be stored securely.', 503);

  const audit = (a: string, id: string, details: Record<string, unknown>) => admin.from('audit_logs').insert({ org_id, user_id: auth.user.id, action: a, entity_type: 'integration', entity_id: id, details });

  if (action === 'connect') {
    const provider = PROVIDERS.find((p) => p.id === body.provider);
    if (!provider?.connectable) return jsonError('This integration cannot be connected yet.');
    const creds: Creds = {};
    for (const f of provider.fields) {
      const v = String(body.credentials?.[f.key] ?? '').trim();
      if (!v) return jsonError(`${f.label} is required.`);
      creds[f.key] = v;
    }
    let info;
    try { info = await testConnection(provider.id, creds); }
    catch (e) { return jsonError(`Connection test failed: ${(e as Error).message}`, 422); }

    let storeId: string | null = body.store_id ?? null;
    if (storeId) {
      const { data: st } = await admin.from('stores').select('id').eq('id', storeId).eq('org_id', org_id).maybeSingle();
      if (!st) return jsonError('Store not found.', 404);
      await admin.from('stores').update({ status: 'connected', platform: provider.id }).eq('id', storeId);
    } else {
      const { data: st, error } = await admin.from('stores').insert({ org_id, name: info.name, url: info.url, platform: provider.id, status: 'connected' }).select('id').single();
      if (error) return jsonError(error.message, 500);
      storeId = st.id;
    }
    const { data: integ, error: iErr } = await admin.from('store_integrations').upsert({ org_id, store_id: storeId, provider: provider.id, status: 'connected', config: info.config, last_tested_at: new Date().toISOString(), last_error: null }, { onConflict: 'org_id,provider,store_id' }).select('id').single();
    if (iErr) return jsonError(iErr.message, 500);
    await admin.from('integration_credentials').upsert({ integration_id: integ.id, org_id, credentials: creds, updated_at: new Date().toISOString() });
    await audit('integration.connected', integ.id, { provider: provider.id, name: info.name });
    return NextResponse.json({ ok: true, integration_id: integ.id, store_id: storeId, store_name: info.name });
  }

  const { data: integ } = await admin.from('store_integrations').select('id, provider, store_id').eq('id', body.integration_id ?? '').eq('org_id', org_id).maybeSingle();
  if (!integ) return jsonError('Integration not found.', 404);

  if (action === 'disconnect') {
    await admin.from('integration_credentials').delete().eq('integration_id', integ.id);
    await admin.from('store_integrations').update({ status: 'not_configured', last_error: null }).eq('id', integ.id);
    if (integ.store_id) await admin.from('stores').update({ status: 'not_connected' }).eq('id', integ.store_id);
    await audit('integration.disconnected', integ.id, { provider: integ.provider });
    return NextResponse.json({ ok: true });
  }

  if (action === 'sync') {
    const { data: cred } = await admin.from('integration_credentials').select('credentials').eq('integration_id', integ.id).maybeSingle();
    if (!cred) return jsonError('Credentials are missing. Reconnect this integration.', 409);
    let items: RemoteProduct[];
    try { items = await fetchProducts(integ.provider, cred.credentials as Creds); }
    catch (e) {
      await admin.from('store_integrations').update({ status: 'error', last_error: (e as Error).message }).eq('id', integ.id);
      if (integ.store_id) await admin.from('stores').update({ status: 'error' }).eq('id', integ.store_id);
      return jsonError(`Sync failed: ${(e as Error).message}`, 502);
    }
    const cats = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
    const brands = [...new Set(items.map((i) => i.brand).filter(Boolean))] as string[];
    const catMap = new Map<string, string>(), brandMap = new Map<string, string>();
    if (cats.length) { const { data } = await admin.from('product_categories').upsert(cats.map((name) => ({ org_id, name })), { onConflict: 'org_id,name' }).select('id, name'); data?.forEach((c) => catMap.set(c.name, c.id)); }
    if (brands.length) { const { data } = await admin.from('brands').upsert(brands.map((name) => ({ org_id, name })), { onConflict: 'org_id,name' }).select('id, name'); data?.forEach((b) => brandMap.set(b.name, b.id)); }
    for (let i = 0; i < items.length; i += 500) {
      const chunk = items.slice(i, i + 500).map((p) => ({ org_id, store_id: integ.store_id, external_id: p.external_id, title: p.title.slice(0, 300), description: p.description, price: p.price, compare_at_price: p.compare_at_price, sku: p.sku,
        inventory_quantity: p.inventory_quantity, image_url: p.image_url, tags: p.tags, status: p.status, category_id: p.category ? catMap.get(p.category) ?? null : null, brand_id: p.brand ? brandMap.get(p.brand) ?? null : null }));
      const { error } = await admin.from('products').upsert(chunk, { onConflict: 'org_id,store_id,external_id' });
      if (error) return jsonError(`Saving products failed: ${error.message}`, 500);
    }
    const now = new Date().toISOString();
    await admin.from('store_integrations').update({ status: 'connected', last_error: null, last_tested_at: now }).eq('id', integ.id);
    if (integ.store_id) await admin.from('stores').update({ status: 'connected', last_synced_at: now, product_count: items.length }).eq('id', integ.store_id);
    await audit('integration.synced', integ.id, { provider: integ.provider, products: items.length });
    return NextResponse.json({ ok: true, products: items.length });
  }
  return jsonError('Unknown action.');
}
