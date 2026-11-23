import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { SHOP_RE, serviceClient, syncShopifyProducts, testShopify } from "@/lib/shopify";

const WRITE_ROLES = ["org_admin", "store_manager", "ecommerce_manager"];

// Connect a Shopify store: validate input, test the credentials, store the token server side, import products.
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const domain = String(body?.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const token = String(body?.token || "").trim();
  const name = String(body?.name || "").trim().slice(0, 120);
  if (!SHOP_RE.test(domain)) return NextResponse.json({ error: "Enter your store domain in the form yourstore.myshopify.com." }, { status: 400 });
  if (token.length < 10 || token.length > 200) return NextResponse.json({ error: "Enter a valid Admin API access token." }, { status: 400 });
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY, so credentials cannot be stored securely." }, { status: 501 });
  const { data: m } = await sb.from("memberships").select("org_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!m || !WRITE_ROLES.includes(m.role)) return NextResponse.json({ error: "Your role cannot connect stores." }, { status: 403 });

  const test = await testShopify(domain, token);
  if (!test.ok) return NextResponse.json({ error: test.error }, { status: 422 });

  let { data: store } = await sb.from("stores").select("id").eq("org_id", m.org_id).eq("platform", "shopify").ilike("url", `%${domain}%`).maybeSingle();
  if (!store) {
    const ins = await sb.from("stores").insert({ org_id: m.org_id, name: name || test.name, url: `https://${domain}`, platform: "shopify", status: "not_connected", created_by: user.id }).select("id").single();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    store = ins.data;
  }
  const integ = await sb.from("store_integrations").upsert({ org_id: m.org_id, store_id: store!.id, provider: "shopify", status: "connected", shop_domain: domain, last_tested_at: new Date().toISOString(), last_error: null }, { onConflict: "store_id,provider" }).select("id").single();
  if (integ.error) return NextResponse.json({ error: integ.error.message }, { status: 500 });
  const sec = await svc.from("integration_secrets").upsert({ integration_id: integ.data.id, org_id: m.org_id, secret: token });
  if (sec.error) return NextResponse.json({ error: "Could not store credentials securely." }, { status: 500 });
  let count = 0;
  try { count = await syncShopifyProducts(sb, m.org_id, store!.id, domain, token); }
  catch (e: any) { await sb.from("store_integrations").update({ status: "error", last_error: e.message }).eq("id", integ.data.id); return NextResponse.json({ error: `Connected, but product sync failed: ${e.message}` }, { status: 502 }); }
  await sb.from("audit_logs").insert({ org_id: m.org_id, user_id: user.id, action: "integration.connected", entity: "shopify", entity_id: store!.id, details: { name: test.name, products: count } });
  return NextResponse.json({ ok: true, products: count, shop: test.name });
}
