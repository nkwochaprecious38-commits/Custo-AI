import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';

const TYPES = new Set(['page_view', 'product_view', 'product_click', 'add_to_cart', 'remove_from_cart', 'checkout_start', 'purchase', 'search', 'recommendation_impression', 'recommendation_click', 'content_impression', 'content_click']);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

type In = { type: string; product_id?: string; query?: string; results_count?: number; clicked_product_id?: string; campaign_id?: string; content_campaign_id?: string; order?: { id?: string; total?: number; currency?: string; items?: unknown[]; discount_used?: boolean }; properties?: Record<string, unknown>; timestamp?: string };

/**
 * Public storefront tracking endpoint. Authenticated by the store tracking key.
 * Events are only stored when the storefront confirms the shopper gave consent.
 */
export async function POST(req: NextRequest) {
  const admin = getAdminSupabase();
  if (!admin) return reply({ error: 'Tracking is not configured on this server.' }, 503);
  const raw = await req.text();
  if (raw.length > 100_000) return reply({ error: 'Payload too large.' }, 413);
  let body: { key?: string; consent?: boolean; session_id?: string; customer?: { id?: string; email?: string }; device?: string; events?: In[] };
  try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON.' }, 400); }
  if (typeof body.key !== 'string' || !/^[0-9a-f]{32}$/.test(body.key)) return reply({ error: 'Invalid tracking key.' }, 401);
  const { data: store } = await admin.from('stores').select('id, org_id').eq('tracking_key', body.key).maybeSingle();
  if (!store) return reply({ error: 'Invalid tracking key.' }, 401);
  if (body.consent !== true) return reply({ accepted: 0, reason: 'consent_required' }, 202);
  const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
  if (!events.length) return reply({ error: 'No events provided.' }, 400);
  const session = String(body.session_id ?? '').slice(0, 100) || null;
  const org = store.org_id;

  // Customer profile
  let customerId: string | null = null;
  if (body.customer?.id) {
    const ext = String(body.customer.id).slice(0, 120);
    const { data: existing } = await admin.from('customer_profiles').select('id, visit_count').eq('org_id', org).eq('external_id', ext).maybeSingle();
    if (existing) {
      customerId = existing.id;
      await admin.from('customer_profiles').update({ last_seen_at: new Date().toISOString(), visit_count: existing.visit_count + (events.some((e) => e.type === 'page_view') ? 1 : 0), consent_status: 'granted' }).eq('id', existing.id);
    } else {
      const { data: created } = await admin.from('customer_profiles').insert({ org_id: org, store_id: store.id, external_id: ext, email: body.customer.email?.slice(0, 200) ?? null, consent_status: 'granted', device: body.device ?? null }).select('id').single();
      customerId = created?.id ?? null;
    }
  }

  // Map external product ids to internal ids
  const refs = [...new Set(events.flatMap((e) => [e.product_id, e.clicked_product_id]).filter(Boolean).map(String))];
  const idMap = new Map<string, string>();
  if (refs.length) {
    const internal = refs.filter((r) => UUID.test(r));
    const { data: byExt } = await admin.from('products').select('id, external_id').eq('org_id', org).in('external_id', refs);
    byExt?.forEach((p) => p.external_id && idMap.set(p.external_id, p.id));
    if (internal.length) { const { data: byId } = await admin.from('products').select('id').eq('org_id', org).in('id', internal); byId?.forEach((p) => idMap.set(p.id, p.id)); }
  }
  const pid = (r?: string) => (r ? idMap.get(String(r)) ?? null : null);
  const ts = (t?: string) => { const d = t ? new Date(t) : new Date(); return isNaN(d.getTime()) || d.getTime() > Date.now() + 60000 ? new Date().toISOString() : d.toISOString(); };

  const rows = [], searches = [], orders = [], impressions = [], clicks = [], carts = [];
  for (const e of events) {
    if (!TYPES.has(e.type)) continue;
    const at = ts(e.timestamp);
    const campaign = e.campaign_id && UUID.test(e.campaign_id) ? e.campaign_id : null;
    rows.push({ org_id: org, store_id: store.id, customer_id: customerId, session_id: session, event_type: e.type, product_id: pid(e.product_id), properties: { ...(e.properties ?? {}), device: body.device ?? e.properties?.device ?? null, campaign_id: campaign }, occurred_at: at });
    if (e.type === 'search' && e.query) searches.push({ org_id: org, customer_id: customerId, query: String(e.query).slice(0, 200), results_count: Math.max(0, Number(e.results_count ?? 0) | 0), clicked_product_id: pid(e.clicked_product_id), occurred_at: at });
    if (e.type === 'purchase' && e.order) orders.push({ org_id: org, store_id: store.id, customer_id: customerId, external_id: e.order.id ? String(e.order.id).slice(0, 120) : null, total: Math.max(0, Number(e.order.total ?? 0)), currency: (e.order.currency ?? 'USD').slice(0, 3), items: Array.isArray(e.order.items) ? e.order.items.slice(0, 100) : [], discount_used: !!e.order.discount_used, attributed_campaign_id: campaign, placed_at: at });
    if (e.type === 'recommendation_impression' && campaign) impressions.push({ org_id: org, campaign_id: campaign, product_id: pid(e.product_id), customer_id: customerId, occurred_at: at });
    if (e.type === 'recommendation_click' && campaign) clicks.push({ org_id: org, campaign_id: campaign, product_id: pid(e.product_id), customer_id: customerId, occurred_at: at });
    if (e.type === 'add_to_cart' || e.type === 'remove_from_cart') carts.push({ org_id: org, customer_id: customerId, product_id: pid(e.product_id), action: e.type === 'add_to_cart' ? 'add' : 'remove', occurred_at: at });
  }
  if (!rows.length) return reply({ error: 'No valid events.' }, 400);
  // Only accept campaign ids that belong to this organization
  const campIds = [...new Set([...impressions, ...clicks].map((x) => x.campaign_id))];
  let valid = new Set<string>();
  if (campIds.length) { const { data } = await admin.from('recommendation_campaigns').select('id').eq('org_id', org).in('id', campIds); valid = new Set((data ?? []).map((c) => c.id)); }

  const results = await Promise.all([
    admin.from('behavioral_events').insert(rows),
    searches.length ? admin.from('search_queries').insert(searches) : null,
    orders.length ? admin.from('orders').upsert(orders.map((o) => ({ ...o, attributed_campaign_id: o.attributed_campaign_id && valid.has(o.attributed_campaign_id) ? o.attributed_campaign_id : null })), { onConflict: 'org_id,external_id', ignoreDuplicates: true }) : null,
    impressions.filter((x) => valid.has(x.campaign_id)).length ? admin.from('recommendation_impressions').insert(impressions.filter((x) => valid.has(x.campaign_id))) : null,
    clicks.filter((x) => valid.has(x.campaign_id)).length ? admin.from('recommendation_clicks').insert(clicks.filter((x) => valid.has(x.campaign_id))) : null,
    carts.length ? admin.from('cart_events').insert(carts) : null,
    admin.from('stores').update({ last_event_at: new Date().toISOString() }).eq('id', store.id),
  ]);
  const failed = results.find((r) => r && r.error);
  if (failed?.error) return reply({ error: 'Could not store events.' }, 500);
  if (customerId && orders.length) {
    const { data: agg } = await admin.from('orders').select('total, discount_used').eq('customer_id', customerId);
    if (agg) await admin.from('customer_profiles').update({ total_orders: agg.length, total_spent: agg.reduce((a, o) => a + Number(o.total), 0), discount_orders: agg.filter((o) => o.discount_used).length }).eq('id', customerId);
  }
  return reply({ accepted: rows.length });
}
