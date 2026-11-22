import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { loadStoreData, publicProduct } from '@/lib/storeData';
import { runSearch, suggestions } from '@/lib/search';

const CORS = { 'Access-Control-Allow-Origin': '*' };

/** Public storefront search: GET /api/storefront/search?key=TRACKING_KEY&q=...&limit=12 */
export async function GET(req: NextRequest) {
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ error: 'Search is not configured on this server.' }, { status: 503, headers: CORS });
  const sp = req.nextUrl.searchParams;
  const key = sp.get('key') ?? '';
  const q = (sp.get('q') ?? '').slice(0, 200);
  if (!/^[0-9a-f]{32}$/.test(key)) return NextResponse.json({ error: 'Invalid key.' }, { status: 401, headers: CORS });
  const { data: store } = await admin.from('stores').select('org_id').eq('tracking_key', key).maybeSingle();
  if (!store) return NextResponse.json({ error: 'Invalid key.' }, { status: 401, headers: CORS });
  const d = await loadStoreData(admin, store.org_id);
  const res = runSearch({ query: q, ...d, limit: Math.min(48, Number(sp.get('limit') ?? 12) || 12) });
  const { data: recent } = await admin.from('search_queries').select('query').eq('org_id', store.org_id).gt('results_count', 0).order('occurred_at', { ascending: false }).limit(200);
  return NextResponse.json({
    query: q, total: res.total, expanded_terms: res.expandedTerms,
    suggestions: suggestions(q, d.products, [...new Set((recent ?? []).map((r) => r.query.toLowerCase()))]),
    results: res.hits.map((h) => ({ ...publicProduct(h.product, d.categories), pinned: !!h.pinned })),
  }, { headers: CORS });
}
