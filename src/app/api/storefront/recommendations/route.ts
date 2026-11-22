import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { loadStoreData, publicProduct } from '@/lib/storeData';
import { recommend, type RecRules } from '@/lib/recommend';

const CORS = { 'Access-Control-Allow-Origin': '*' };

/** Public storefront recommendations: GET /api/storefront/recommendations?key=...&campaign=ID&product=EXTERNAL_OR_ID&customer=EXTERNAL_ID */
export async function GET(req: NextRequest) {
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ error: 'Recommendations are not configured on this server.' }, { status: 503, headers: CORS });
  const sp = req.nextUrl.searchParams;
  const key = sp.get('key') ?? '';
  if (!/^[0-9a-f]{32}$/.test(key)) return NextResponse.json({ error: 'Invalid key.' }, { status: 401, headers: CORS });
  const { data: store } = await admin.from('stores').select('org_id').eq('tracking_key', key).maybeSingle();
  if (!store) return NextResponse.json({ error: 'Invalid key.' }, { status: 401, headers: CORS });
  const { data: camp } = await admin.from('recommendation_campaigns').select('*').eq('org_id', store.org_id).eq('id', sp.get('campaign') ?? '').maybeSingle();
  if (!camp) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404, headers: CORS });
  if (camp.status !== 'active') return NextResponse.json({ campaign: camp.id, products: [], reason: 'Campaign is not active.' }, { headers: CORS });
  const d = await loadStoreData(admin, store.org_id);
  const pref = sp.get('product');
  const ctxProduct = d.products.find((p) => p.id === pref || p.external_id === pref) ?? null;
  let preferred: string[] = []; let recent: string[] = [];
  const cust = sp.get('customer');
  if (cust) {
    const { data: c } = await admin.from('customer_profiles').select('id, favorite_category').eq('org_id', store.org_id).eq('external_id', cust).maybeSingle();
    if (c?.favorite_category) preferred = [c.favorite_category];
    if (c) { const { data: ev } = await admin.from('behavioral_events').select('product_id').eq('customer_id', c.id).eq('event_type', 'product_view').order('occurred_at', { ascending: false }).limit(20); recent = [...new Set((ev ?? []).map((e) => e.product_id).filter(Boolean))] as string[]; }
  }
  const items = recommend(camp.rec_type, camp.rules as RecRules, camp.max_products, { ...d, contextProductId: ctxProduct?.id, preferredCategories: preferred, recentlyViewed: recent });
  return NextResponse.json({ campaign: camp.id, placement: camp.placement, products: items.map((i) => publicProduct(i.product, d.categories)) }, { headers: CORS });
}
