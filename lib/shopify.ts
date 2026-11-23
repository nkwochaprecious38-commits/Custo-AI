import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/env";

export const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const API = "2024-10";

export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function shopifyFetch(domain: string, token: string, path: string) {
  const res = await fetch(`https://${domain}/admin/api/${API}/${path}`, { headers: { "X-Shopify-Access-Token": token, Accept: "application/json" }, cache: "no-store", redirect: "error" });
  return res;
}

export async function testShopify(domain: string, token: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  try {
    const res = await shopifyFetch(domain, token, "shop.json");
    if (res.status === 401 || res.status === 403) return { ok: false, error: "Shopify rejected the access token. Check the token and its read_products scope." };
    if (res.status === 404) return { ok: false, error: "Shopify store not found. Check the myshopify.com domain." };
    if (!res.ok) return { ok: false, error: `Shopify responded with status ${res.status}.` };
    const j = await res.json();
    return { ok: true, name: j?.shop?.name || domain };
  } catch { return { ok: false, error: "Could not reach Shopify. Check the domain and try again." }; }
}

export async function syncShopifyProducts(sb: SupabaseClient, orgId: string, storeId: string, domain: string, token: string) {
  let path = "products.json?limit=250&fields=id,title,handle,vendor,product_type,tags,status,body_html,variants,images";
  const items: any[] = [];
  for (let page = 0; page < 8 && path; page++) {
    const res = await shopifyFetch(domain, token, path);
    if (!res.ok) throw new Error(`Shopify products request failed with status ${res.status}.`);
    items.push(...((await res.json()).products || []));
    const link = res.headers.get("link") || "";
    const next = /<([^>]+)>;\s*rel="next"/.exec(link)?.[1];
    path = next ? next.split(`/admin/api/${API}/`)[1] || "" : "";
  }
  const { data: existing } = await sb.from("products").select("id, external_id").eq("org_id", orgId).eq("store_id", storeId).not("external_id", "is", null);
  const byExt = new Map((existing || []).map((r: any) => [r.external_id, r.id]));
  const toRow = (p: any) => {
    const v = p.variants?.[0] || {};
    const stock = (p.variants || []).reduce((t: number, x: any) => t + Math.max(0, Number(x.inventory_quantity) || 0), 0);
    return { org_id: orgId, store_id: storeId, external_id: String(p.id), name: String(p.title || "Untitled").slice(0, 250), sku: v.sku || null, price: v.price ? Number(v.price) : null,
      category: p.product_type || null, brand: p.vendor || null, inventory: stock, image_url: p.images?.[0]?.src || null,
      status: p.status === "active" ? "active" : p.status === "archived" ? "archived" : "draft", description: String(p.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000) || null, tags: p.tags || null };
  };
  const inserts = items.filter((p) => !byExt.has(String(p.id))).map(toRow);
  for (let i = 0; i < inserts.length; i += 200) { const { error } = await sb.from("products").insert(inserts.slice(i, i + 200)); if (error) throw new Error(error.message); }
  for (const p of items.filter((p) => byExt.has(String(p.id)))) { const { org_id, ...rest } = toRow(p); await sb.from("products").update(rest).eq("id", byExt.get(String(p.id))!).eq("org_id", orgId); }
  await sb.from("stores").update({ status: "connected", last_synced_at: new Date().toISOString(), product_count: items.length }).eq("id", storeId).eq("org_id", orgId);
  return items.length;
}
