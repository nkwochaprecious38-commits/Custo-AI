import type { Category, Perf, Product } from './types';

export const REC_TYPES: { id: string; name: string; description: string; needsContext?: boolean }[] = [
  { id: 'recommended_for_you', name: 'Recommended for you', description: 'Popular products from the shopper’s preferred categories.' },
  { id: 'frequently_bought_together', name: 'Frequently bought together', description: 'Products often purchased in the same orders as the current product.', needsContext: true },
  { id: 'similar_products', name: 'Similar products', description: 'Products in the same category with overlapping tags and attributes.', needsContext: true },
  { id: 'recently_viewed', name: 'Recently viewed', description: 'Products the shopper viewed recently, most recent first.' },
  { id: 'best_sellers', name: 'Best sellers', description: 'Products with the most purchases in the period.' },
  { id: 'trending', name: 'Trending', description: 'Products whose views grew most compared with the previous period.' },
  { id: 'related_products', name: 'Related products', description: 'Products sharing tags or brand with the current product.', needsContext: true },
  { id: 'new_arrivals', name: 'New arrivals', description: 'Most recently added active products.' },
  { id: 'complementary', name: 'Complementary products', description: 'Popular products from other categories that complete the purchase.', needsContext: true },
  { id: 'replenishment', name: 'Replenishment suggestions', description: 'Consumable products the shopper is likely to reorder.' },
];
export const PLACEMENTS = ['home_page', 'product_page', 'category_page', 'cart_page', 'checkout', 'post_purchase', 'search_results', 'email'];

export type RecRules = { include_categories: string[]; exclude_categories: string[]; exclude_out_of_stock: boolean; exclude_product_ids: string[]; min_price?: number | null; max_price?: number | null };

type Ctx = {
  products: Product[]; perf: Map<string, Perf>; categories: Category[];
  contextProductId?: string | null; preferredCategories?: string[]; recentlyViewed?: string[]; coPurchases?: Map<string, number>;
};

const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;
const pop = (p: Perf | undefined) => (p ? p.purchases * 5 + p.add_to_carts * 2 + p.clicks + p.views * 0.2 : 0);

/** Applies campaign rules, then ranks candidates for the requested strategy. Returns products with a short reason. */
export function recommend(type: string, rules: RecRules, limit: number, ctx: Ctx): { product: Product; reason: string }[] {
  const ctxProduct = ctx.products.find((p) => p.id === ctx.contextProductId) ?? null;
  const catName = (id: string | null) => ctx.categories.find((c) => c.id === id)?.name ?? '';
  let pool = ctx.products.filter((p) => p.status === 'active' && p.id !== ctxProduct?.id);
  if (rules.exclude_out_of_stock) pool = pool.filter((p) => p.inventory_quantity > 0);
  if (rules.include_categories?.length) pool = pool.filter((p) => p.category_id && rules.include_categories.includes(p.category_id));
  if (rules.exclude_categories?.length) pool = pool.filter((p) => !p.category_id || !rules.exclude_categories.includes(p.category_id));
  if (rules.exclude_product_ids?.length) pool = pool.filter((p) => !rules.exclude_product_ids.includes(p.id));
  if (rules.min_price != null) pool = pool.filter((p) => p.price >= Number(rules.min_price));
  if (rules.max_price != null) pool = pool.filter((p) => p.price <= Number(rules.max_price));

  const scored = pool.map((p) => {
    const pf = ctx.perf.get(p.id);
    let score = 0; let reason = '';
    switch (type) {
      case 'best_sellers': score = (pf?.purchases ?? 0) * 10 + (pf?.add_to_carts ?? 0); reason = `${pf?.purchases ?? 0} purchases`; break;
      case 'trending': {
        const growth = (pf?.views ?? 0) - (pf?.prior_views ?? 0);
        score = growth + (pf?.views ?? 0) * 0.01; reason = growth >= 0 ? `+${growth} views vs previous period` : `${growth} views vs previous period`; break;
      }
      case 'new_arrivals': score = new Date(p.created_at).getTime(); reason = 'Recently added'; break;
      case 'similar_products':
        if (!ctxProduct) { score = pop(pf); reason = 'Popular (select a context product)'; break; }
        score = (p.category_id === ctxProduct.category_id ? 100 : 0) + overlap(p.tags, ctxProduct.tags) * 10 + pop(pf) * 0.01; reason = p.category_id === ctxProduct.category_id ? `Same category: ${catName(p.category_id)}` : 'Shared tags'; break;
      case 'related_products':
        if (!ctxProduct) { score = pop(pf); reason = 'Popular (select a context product)'; break; }
        score = overlap(p.tags, ctxProduct.tags) * 20 + (p.brand_id && p.brand_id === ctxProduct.brand_id ? 15 : 0) + pop(pf) * 0.01; reason = p.brand_id === ctxProduct.brand_id ? 'Same brand' : 'Shared tags'; break;
      case 'complementary':
        if (!ctxProduct) { score = pop(pf); reason = 'Popular (select a context product)'; break; }
        score = (p.category_id !== ctxProduct.category_id ? 50 : -100) + pop(pf) * 0.1; reason = `Pairs with ${catName(ctxProduct.category_id) || 'this product'}`; break;
      case 'frequently_bought_together': {
        const co = ctx.coPurchases?.get(p.id) ?? 0;
        score = co * 100 + (ctxProduct && p.category_id !== ctxProduct.category_id ? 5 : 0) + pop(pf) * 0.01; reason = co ? `Bought together ${co} times` : 'Popular companion'; break;
      }
      case 'recently_viewed': {
        const idx = ctx.recentlyViewed?.indexOf(p.id) ?? -1;
        score = idx >= 0 ? 1000 - idx : -1; reason = idx >= 0 ? 'Viewed recently' : ''; break;
      }
      case 'replenishment': {
        const consumable = ['Skincare', 'Beauty', 'Grocery', 'Health'].includes(catName(p.category_id)) || p.tags.some((t) => /refill|daily|cleanser|spf|serum/i.test(t));
        score = consumable ? (pf?.purchases ?? 0) * 10 + 1 : -1; reason = consumable ? 'Regularly repurchased item' : ''; break;
      }
      default: { // recommended_for_you
        const prefs = ctx.preferredCategories ?? [];
        const match = prefs.includes(catName(p.category_id));
        score = (match ? 50 : 0) + pop(pf) * 0.1; reason = match ? `Matches interest in ${catName(p.category_id)}` : 'Popular with shoppers like this';
      }
    }
    return { product: p, score, reason };
  });
  return scored.filter((s) => s.score >= 0).sort((a, b) => b.score - a.score).slice(0, limit).map(({ product, reason }) => ({ product, reason }));
}
