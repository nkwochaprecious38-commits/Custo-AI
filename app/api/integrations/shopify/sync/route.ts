import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { serviceClient, syncShopifyProducts } from "@/lib/shopify";

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const storeId = String((await req.json().catch(() => ({})))?.storeId || "");
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." }, { status: 501 });
  const { data: m } = await sb.from("memberships").select("org_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!m || !["org_admin", "store_manager", "ecommerce_manager"].includes(m.role)) return NextResponse.json({ error: "Your role cannot sync stores." }, { status: 403 });
  const { data: integ } = await sb.from("store_integrations").select("id, shop_domain").eq("org_id", m.org_id).eq("store_id", storeId).eq("provider", "shopify").maybeSingle();
  if (!integ?.shop_domain) return NextResponse.json({ error: "This store has no Shopify connection." }, { status: 404 });
  const { data: sec } = await svc.from("integration_secrets").select("secret").eq("integration_id", integ.id).eq("org_id", m.org_id).maybeSingle();
  if (!sec) return NextResponse.json({ error: "Credentials not found. Reconnect the store." }, { status: 404 });
  try {
    const count = await syncShopifyProducts(sb, m.org_id, storeId, integ.shop_domain, sec.secret);
    await sb.from("store_integrations").update({ status: "connected", last_error: null, last_tested_at: new Date().toISOString() }).eq("id", integ.id);
    return NextResponse.json({ ok: true, products: count });
  } catch (e: any) {
    await sb.from("store_integrations").update({ status: "error", last_error: e.message }).eq("id", integ.id);
    await sb.from("stores").update({ status: "error" }).eq("id", storeId).eq("org_id", m.org_id);
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
