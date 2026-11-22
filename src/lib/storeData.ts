import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Brand, Category, MerchRule, Perf, Product } from './types';

export async function loadStoreData(db: SupabaseClient, org: string) {
  const products: Product[] = [];
  for (let a = 0; ; a += 1000) {
    const { data } = await db.from('products').select('*').eq('org_id', org).eq('status', 'active').range(a, a + 999);
    products.push(...((data ?? []) as Product[]).map((p) => ({ ...p, price: Number(p.price) })));
    if (!data || data.length < 1000) break;
  }
  const to = new Date(), from = new Date(Date.now() - 30 * 86400000);
  const [c, b, s, r, pf] = await Promise.all([
    db.from('product_categories').select('id, name, parent_id').eq('org_id', org),
    db.from('brands').select('id, name').eq('org_id', org),
    db.from('search_synonyms').select('terms, one_way').eq('org_id', org),
    db.from('merchandising_rules').select('*').eq('org_id', org).eq('status', 'active'),
    db.rpc('product_performance', { p_org: org, p_from: from.toISOString(), p_to: to.toISOString() }),
  ]);
  const perf = new Map<string, Perf>(((pf.data as Perf[]) ?? []).map((x) => [x.product_id, { ...x, views: Number(x.views), clicks: Number(x.clicks), add_to_carts: Number(x.add_to_carts), purchases: Number(x.purchases), prior_views: Number(x.prior_views) }]));
  return { products, categories: (c.data ?? []) as Category[], brands: (b.data ?? []) as Brand[], synonyms: (s.data ?? []) as { terms: string[]; one_way: boolean }[], rules: (r.data ?? []) as MerchRule[], perf };
}

export const publicProduct = (p: Product, categories: Category[]) => ({
  id: p.id, external_id: p.external_id, title: p.title, price: p.price, compare_at_price: p.compare_at_price, currency: p.currency, image_url: p.image_url,
  category: categories.find((c) => c.id === p.category_id)?.name ?? null, in_stock: p.inventory_quantity > 0,
});
