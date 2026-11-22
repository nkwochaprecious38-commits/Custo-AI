import type { Brand, Category, MerchRule, Perf, Product } from './types';

/** Concept expansion used for semantic matching. Each concept maps to related words that describe it in product copy. */
const CONCEPTS: Record<string, string[]> = {
  comfortable: ['comfort', 'cushioned', 'soft', 'plush', 'ergonomic', 'relaxed', 'all day', 'padded', 'supportive', 'breathable'],
  comfy: ['comfort', 'cushioned', 'soft', 'relaxed'],
  walking: ['walking', 'walk', 'sneakers', 'running', 'trainers', 'steps', 'everyday'],
  shoes: ['shoe', 'sneakers', 'footwear', 'boot', 'loafer', 'runner', 'trainers'],
  sneakers: ['sneakers', 'shoe', 'runner', 'running', 'trainers'],
  running: ['running', 'runner', 'sport', 'responsive'],
  hiking: ['hiking', 'trail', 'outdoor', 'boots', 'rugged'],
  rain: ['waterproof', 'rain', 'shell', 'taped seams'],
  waterproof: ['waterproof', 'water resistance', 'rain'],
  summer: ['linen', 'breathable', 'lightweight', 'warm weather', 'spf'],
  winter: ['wool', 'merino', 'warm', 'knitwear'],
  warm: ['wool', 'merino', 'warm', 'throw', 'blanket'],
  dry: ['hydrating', 'hyaluronic', 'moisturizer', 'rich', 'dry'],
  hydrating: ['hydrating', 'hyaluronic', 'moisturizer'],
  sensitive: ['sensitive', 'gentle', 'barrier', 'mineral'],
  sunscreen: ['spf', 'sunscreen', 'mineral'],
  makeup: ['makeup', 'lipstick', 'mascara', 'foundation', 'tint'],
  gift: ['gift', 'candle', 'set', 'trio'],
  office: ['office', 'desk', 'ergonomic', 'webcam', 'chair'],
  work: ['office', 'desk', 'laptop', 'webcam', 'loafer'],
  music: ['audio', 'headphones', 'earbuds', 'speaker'],
  audio: ['audio', 'headphones', 'earbuds', 'speaker'],
  fitness: ['fitness', 'running', 'sport', 'watch', 'heart rate'],
  kitchen: ['kitchen', 'coffee', 'dining', 'tableware'],
  bedroom: ['bedding', 'linen', 'throw', 'blanket'],
  cheap: [], affordable: [], budget: [],
};
const STOP = new Set(['for', 'the', 'a', 'an', 'and', 'with', 'of', 'to', 'in', 'on', 'my', 'me', 'i', 'that', 'is', 'are', 'best', 'good', 'great', 'some', 'something', 'women', 'men', 'womens', 'mens']);
const PRICE_WORDS = ['cheap', 'affordable', 'budget', 'under'];

export const tokenize = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

function stem(w: string) { return w.length > 4 ? w.replace(/(ing|es|s)$/, '') : w; }

function editDistance1(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

export type Synonym = { terms: string[]; one_way: boolean };
export type SearchFilters = { category?: string; brand?: string; minPrice?: number | null; maxPrice?: number | null; inStock?: boolean; attribute?: { key: string; value: string } | null };
export type SearchHit = { product: Product; score: number; matched: string[]; pinned?: boolean };

export function expandQuery(query: string, synonyms: Synonym[], extraTerms: string[] = []) {
  const base = tokenize(query).filter((t) => !STOP.has(t));
  const expanded = new Map<string, number>(); // term -> weight
  base.forEach((t) => expanded.set(t, 1));
  for (const t of base) {
    (CONCEPTS[t] ?? CONCEPTS[stem(t)] ?? []).forEach((c) => { if (!expanded.has(c)) expanded.set(c, 0.6); });
    for (const s of synonyms) {
      const terms = s.terms.map((x) => x.toLowerCase());
      const hit = s.one_way ? terms[0] === t : terms.includes(t);
      if (hit) terms.forEach((x) => { if (!expanded.has(x)) expanded.set(x, 0.9); });
    }
  }
  extraTerms.forEach((x) => { const k = x.toLowerCase(); if (!expanded.has(k)) expanded.set(k, 0.7); });
  const priceIntent = base.some((t) => PRICE_WORDS.includes(t));
  const under = query.match(/under\s*\$?(\d+)/i);
  return { base, expanded, priceIntent, maxPrice: under ? Number(under[1]) : null };
}

export function runSearch(opts: {
  query: string; products: Product[]; categories: Category[]; brands: Brand[]; synonyms: Synonym[]; filters?: SearchFilters;
  rules?: MerchRule[]; perf?: Map<string, Perf>; extraTerms?: string[]; limit?: number;
}) {
  const { query, products, categories, brands, synonyms, filters = {}, rules = [], perf, extraTerms, limit = 24 } = opts;
  const q = expandQuery(query, synonyms, extraTerms);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const brandName = new Map(brands.map((b) => [b.id, b.name]));
  const hits: SearchHit[] = [];
  for (const p of products) {
    if (p.status !== 'active') continue;
    if (filters.category && p.category_id !== filters.category) continue;
    if (filters.brand && p.brand_id !== filters.brand) continue;
    if (filters.minPrice != null && p.price < filters.minPrice) continue;
    const maxP = filters.maxPrice ?? q.maxPrice;
    if (maxP != null && p.price > maxP) continue;
    if (filters.inStock && p.inventory_quantity <= 0) continue;
    if (filters.attribute && String(p.attributes?.[filters.attribute.key] ?? '').toLowerCase() !== filters.attribute.value.toLowerCase()) continue;

    const fields = {
      title: p.title.toLowerCase(), tags: p.tags.join(' ').toLowerCase(), cat: (catName.get(p.category_id ?? '') ?? '').toLowerCase(),
      brand: (brandName.get(p.brand_id ?? '') ?? '').toLowerCase(), desc: (p.description ?? '').toLowerCase(), attrs: Object.values(p.attributes ?? {}).join(' ').toLowerCase(),
    };
    const words = new Set(tokenize(`${fields.title} ${fields.tags} ${fields.cat} ${fields.brand}`));
    let score = 0; const matched: string[] = [];
    for (const [term, w] of q.expanded) {
      const st = stem(term);
      let s = 0;
      if (fields.title.includes(term) || fields.title.includes(st)) s += 5;
      if (fields.tags.includes(term) || fields.tags.includes(st)) s += 4;
      if (fields.cat.includes(st) || fields.brand.includes(term)) s += 3;
      if (fields.desc.includes(term) || fields.desc.includes(st)) s += 2;
      if (fields.attrs.includes(term)) s += 1.5;
      if (!s && w === 1 && [...words].some((x) => editDistance1(x, term))) s += 3; // typo tolerance on original words
      if (s) { score += s * w; matched.push(term); }
    }
    if (query.trim() && !score) continue;
    const pf = perf?.get(p.id);
    if (pf) score += Math.log1p(pf.purchases * 3 + pf.clicks) * 0.5;
    if (q.priceIntent) score += Math.max(0, 3 - p.price / 50);
    hits.push({ product: p, score, matched });
  }
  // Merchandising rules for this search term
  const term = query.trim().toLowerCase();
  const active = rules.filter((r) => r.status === 'active' && r.scope === 'search' && r.search_term && term.includes(r.search_term.toLowerCase())).sort((a, b) => a.priority - b.priority);
  let result = hits;
  for (const r of active) {
    if (r.rule_type === 'exclude') result = result.filter((h) => !r.product_ids.includes(h.product.id));
    if (r.rule_type === 'boost') result.forEach((h) => { if (r.product_ids.includes(h.product.id)) h.score += 20; });
    if (r.rule_type === 'bury') result.forEach((h) => { if (r.product_ids.includes(h.product.id)) h.score -= 20; });
  }
  result.sort((a, b) => b.score - a.score);
  for (const r of active.filter((x) => x.rule_type === 'pin').reverse()) {
    const pinned = r.product_ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
    result = [...pinned.map((p) => ({ product: p, score: Infinity, matched: [], pinned: true })), ...result.filter((h) => !r.product_ids.includes(h.product.id))];
  }
  return { hits: result.slice(0, limit), total: result.length, expandedTerms: [...q.expanded.keys()].filter((t) => !q.base.includes(t)), baseTerms: q.base };
}

export function suggestions(prefix: string, products: Product[], recentQueries: string[]) {
  const p = prefix.toLowerCase().trim();
  if (p.length < 2) return [];
  const fromQueries = recentQueries.filter((q) => q.startsWith(p));
  const fromTitles = products.filter((x) => x.status === 'active' && x.title.toLowerCase().includes(p)).map((x) => x.title);
  return [...new Set([...fromQueries, ...fromTitles])].slice(0, 6);
}
