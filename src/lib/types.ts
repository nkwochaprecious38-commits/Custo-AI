export type Product = {
  id: string; org_id: string; store_id: string | null; external_id: string | null; title: string; description: string | null;
  price: number; compare_at_price: number | null; currency: string; sku: string | null; category_id: string | null; brand_id: string | null;
  inventory_quantity: number; status: 'active' | 'draft' | 'archived'; image_url: string | null; tags: string[]; attributes: Record<string, string>;
  is_sample: boolean; created_at: string; updated_at: string;
};
export type Category = { id: string; name: string; parent_id: string | null };
export type Brand = { id: string; name: string };
export type Perf = { product_id: string; views: number; clicks: number; add_to_carts: number; purchases: number; prior_views: number };
export type Segment = { id: string; name: string; description: string | null; match_type: 'all' | 'any'; rules: SegmentRule[]; status: string; is_sample: boolean; created_at: string; updated_at: string };
export type SegmentRule = { field: string; operator: string; value: string };
export type MerchRule = {
  id: string; name: string; scope: 'all' | 'category' | 'search'; category_id: string | null; search_term: string | null; rule_type: string;
  product_ids: string[]; config: Record<string, unknown>; priority: number; status: string; starts_at: string | null; ends_at: string | null; is_sample: boolean; campaign_id: string | null;
};
