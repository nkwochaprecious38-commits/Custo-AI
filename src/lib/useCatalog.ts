'use client';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from './supabase/client';
import { useOrg } from './org';
import type { Brand, Category, Perf, Product } from './types';

/** Fetches all rows of a query in pages of 1000 (PostgREST row limit). */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function useCatalog(days = 30) {
  const { org } = useOrg();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [perf, setPerf] = useState<Map<string, Perf>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    const s = getSupabase();
    try {
      const to = new Date(); const from = new Date(to.getTime() - days * 86400000);
      const [p, c, b, pf] = await Promise.all([
        fetchAll<Product>((a, z) => s.from('products').select('*').eq('org_id', org.id).order('title').range(a, z)),
        s.from('product_categories').select('id, name, parent_id').eq('org_id', org.id).order('name'),
        s.from('brands').select('id, name').eq('org_id', org.id).order('name'),
        s.rpc('product_performance', { p_org: org.id, p_from: from.toISOString(), p_to: to.toISOString() }),
      ]);
      if (c.error || b.error || pf.error) throw new Error((c.error ?? b.error ?? pf.error)!.message);
      setProducts(p.map((x) => ({ ...x, price: Number(x.price), compare_at_price: x.compare_at_price == null ? null : Number(x.compare_at_price) })));
      setCategories((c.data as Category[]) ?? []);
      setBrands((b.data as Brand[]) ?? []);
      setPerf(new Map(((pf.data as Perf[]) ?? []).map((r) => [r.product_id, { ...r, views: Number(r.views), clicks: Number(r.clicks), add_to_carts: Number(r.add_to_carts), purchases: Number(r.purchases), prior_views: Number(r.prior_views) }])));
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [org.id, days]);

  useEffect(() => { reload(); }, [reload]);
  return { products, categories, brands, perf, loading, error, reload, setProducts };
}
