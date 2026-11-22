import type { MerchRule, Perf, Product } from './types';

export const MERCH_RULE_TYPES: { id: string; name: string; needsProducts: boolean; description: string }[] = [
  { id: 'pin', name: 'Pin products', needsProducts: true, description: 'Place selected products at the top in the chosen order.' },
  { id: 'boost', name: 'Promote products', needsProducts: true, description: 'Move selected products higher without fixing their position.' },
  { id: 'bury', name: 'Demote products', needsProducts: true, description: 'Move selected products lower.' },
  { id: 'exclude', name: 'Exclude products', needsProducts: true, description: 'Hide selected products from this scope.' },
  { id: 'prioritize_best_sellers', name: 'Prioritize best sellers', needsProducts: false, description: 'Order by purchases and add to cart activity.' },
  { id: 'highlight_new_arrivals', name: 'Highlight new arrivals', needsProducts: false, description: 'Lift products added in the last 30 days.' },
  { id: 'promote_seasonal', name: 'Promote seasonal products', needsProducts: false, description: 'Lift products carrying a chosen tag, such as summer.' },
  { id: 'exclude_out_of_stock', name: 'Exclude unavailable products', needsProducts: false, description: 'Hide products with no inventory.' },
  { id: 'prioritize_category', name: 'Prioritize a category', needsProducts: false, description: 'Lift products from a chosen category in sitewide listings.' },
];

export function isLive(r: Pick<MerchRule, 'status' | 'starts_at' | 'ends_at'>, now = Date.now()) {
  if (r.status !== 'active' && r.status !== 'scheduled') return false;
  if (r.starts_at && new Date(r.starts_at).getTime() > now) return false;
  if (r.ends_at && new Date(r.ends_at).getTime() < now) return false;
  return true;
}

/** Orders products for a category (or sitewide) applying rules by priority. Returns the ordered list with explanations. */
export function applyMerchandising(products: Product[], rules: MerchRule[], perf: Map<string, Perf>, categoryId: string | null) {
  const relevant = rules.filter((r) => isLive(r) && (r.scope === 'all' || (r.scope === 'category' && r.category_id === categoryId))).sort((a, b) => a.priority - b.priority);
  let list = products.filter((p) => p.status === 'active' && (!categoryId || p.category_id === categoryId)).map((p) => {
    const pf = perf.get(p.id);
    return { product: p, score: pf ? pf.views * 0.05 + pf.clicks * 0.2 + pf.add_to_carts + pf.purchases * 3 : 0, notes: [] as string[], pinned: -1 };
  });
  for (const r of relevant) {
    switch (r.rule_type) {
      case 'exclude': list = list.filter((x) => !r.product_ids.includes(x.product.id)); break;
      case 'exclude_out_of_stock': list = list.filter((x) => x.product.inventory_quantity > 0); break;
      case 'boost': list.forEach((x) => { if (r.product_ids.includes(x.product.id)) { x.score += 1000; x.notes.push(`Promoted by "${r.name}"`); } }); break;
      case 'bury': list.forEach((x) => { if (r.product_ids.includes(x.product.id)) { x.score -= 1000; x.notes.push(`Demoted by "${r.name}"`); } }); break;
      case 'prioritize_best_sellers': list.forEach((x) => { const pf = perf.get(x.product.id); x.score += (pf?.purchases ?? 0) * 20 + (pf?.add_to_carts ?? 0) * 4; }); break;
      case 'highlight_new_arrivals': list.forEach((x) => { if (Date.now() - new Date(x.product.created_at).getTime() < 30 * 86400000) { x.score += 300; x.notes.push('New arrival'); } }); break;
      case 'promote_seasonal': { const tag = String(r.config?.tag ?? '').toLowerCase(); list.forEach((x) => { if (tag && x.product.tags.map((t) => t.toLowerCase()).includes(tag)) { x.score += 500; x.notes.push(`Seasonal: ${tag}`); } }); break; }
      case 'prioritize_category': { const cat = String(r.config?.category_id ?? ''); list.forEach((x) => { if (x.product.category_id === cat) { x.score += 400; x.notes.push('Priority category'); } }); break; }
      case 'pin': r.product_ids.forEach((id, i) => { const x = list.find((y) => y.product.id === id); if (x && x.pinned < 0) { x.pinned = i; x.notes.push(`Pinned by "${r.name}"`); } }); break;
    }
  }
  return list.sort((a, b) => (a.pinned >= 0 || b.pinned >= 0 ? (a.pinned < 0 ? 1 : b.pinned < 0 ? -1 : a.pinned - b.pinned) : b.score - a.score));
}
