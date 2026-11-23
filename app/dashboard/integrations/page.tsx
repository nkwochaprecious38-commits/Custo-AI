"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import ConnectShopify from "@/components/dashboard/ConnectShopify";
import { PageHeader, Spinner, StatusBadge } from "@/components/dashboard/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useOrg } from "@/lib/dashboard/context";

type Provider = { id: string; name: string; available: boolean; steps: string[] };
const PROVIDERS: Provider[] = [
  { id: "shopify", name: "Shopify", available: true, steps: ["Create a custom app in Shopify admin and grant read_products.", "Copy the Admin API access token.", "Select Connect and enter your myshopify.com domain and the token."] },
  { id: "shopify_plus", name: "Shopify Plus", available: true, steps: ["Shopify Plus stores use the same custom app flow as Shopify.", "Connect with your myshopify.com domain and Admin API token."] },
  { id: "woocommerce", name: "WooCommerce", available: false, steps: ["Generate REST API keys in WooCommerce settings.", "The Custo AI connector for WooCommerce is not built yet. Import products with a CSV in the meantime."] },
  { id: "bigcommerce", name: "BigCommerce", available: false, steps: ["Create an API account with catalog read access.", "The BigCommerce connector is not built yet. Use CSV import for now."] },
  { id: "adobe_commerce", name: "Adobe Commerce", available: false, steps: ["Create an integration with catalog access.", "The Adobe Commerce connector is not built yet. Use CSV import for now."] },
  { id: "shopware", name: "Shopware", available: false, steps: ["Create an integration in the Shopware admin.", "The Shopware connector is not built yet. Use CSV import for now."] },
  { id: "salesforce_commerce_cloud", name: "Salesforce Commerce Cloud", available: false, steps: ["Create an API client in Account Manager.", "This connector is not built yet. Use CSV import for now."] },
  { id: "google_analytics", name: "Google Analytics", available: false, steps: ["This connector is not built yet. Behavioral data will come from the Custo AI storefront script when it is released."] },
  { id: "marketing_automation", name: "Marketing automation platforms", available: false, steps: ["Not built yet. Segments are available inside Custo AI today."] },
  { id: "cdp", name: "Customer data platforms", available: false, steps: ["Not built yet. Consent aware profile sync will be added with the API layer."] },
];

export default function Integrations() {
  const { orgId, dbReady } = useOrg(); const [rows, setRows] = useState<any[] | null>(null); const [open, setOpen] = useState<string>("shopify");
  const load = useCallback(() => { if (!orgId || !dbReady) { setRows([]); return; } supabaseBrowser().from("store_integrations").select("provider,status,shop_domain,last_tested_at,last_error").eq("org_id", orgId).then(({ data }: any) => setRows(data || [])); }, [orgId, dbReady]);
  useEffect(load, [load]);
  if (rows === null) return <Spinner />;
  return (
    <>
      <PageHeader title="Integrations" text="Connections show their real status. An integration is connected only after credentials are saved and a connection test passes." actions={<ConnectShopify onDone={load} />} />
      <div className="space-y-3">
        {PROVIDERS.map((p) => {
          const mine = rows.filter((r) => r.provider === (p.id === "shopify_plus" ? "shopify" : p.id));
          const status = p.available ? (mine.some((r) => r.status === "connected") ? "connected" : mine.some((r) => r.status === "error") ? "error" : "not_connected") : "not_connected";
          return (
            <div key={p.id} className="card overflow-hidden">
              <button className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? "" : p.id)}>
                <div><p className="font-heading font-bold">{p.name}</p><p className="text-xs text-muted">{p.available ? (mine.length ? `${mine.length} store connection${mine.length > 1 ? "s" : ""}` : "API connector available") : "Connector not available yet"}</p></div>
                <span className="flex items-center gap-3">{p.available ? <StatusBadge value={status} /> : <span className="badge bg-soft text-muted">Not available yet</span>}<ChevronDown size={18} className={open === p.id ? "rotate-180" : ""} /></span></button>
              {open === p.id && <div className="border-t border-charcoal/10 bg-soft/50 p-4 sm:p-5">
                <p className="mb-2 text-sm font-semibold">Setup instructions</p><ol className="list-decimal space-y-1 pl-5 text-sm text-muted">{p.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                {mine.map((m, i) => <p key={i} className="mt-3 text-xs text-muted">{m.shop_domain}: {m.status.replace("_", " ")}{m.last_tested_at ? `, tested ${new Date(m.last_tested_at).toLocaleString()}` : ""}{m.last_error ? `. Error: ${m.last_error}` : ""}</p>)}
              </div>}
            </div>);
        })}
      </div>
    </>
  );
}
