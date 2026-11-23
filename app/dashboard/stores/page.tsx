"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import ResourcePage from "@/components/dashboard/ResourcePage";
import ConnectShopify from "@/components/dashboard/ConnectShopify";
import { PageHeader, StatusBadge, useToast } from "@/components/dashboard/ui";

export default function Stores() {
  const [k, setK] = useState(0); const toast = useToast(); const [syncing, setSyncing] = useState("");
  async function sync(id: string, reload: () => void) {
    setSyncing(id);
    const res = await fetch("/api/integrations/shopify/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: id }) });
    const j = await res.json().catch(() => ({})); setSyncing("");
    if (!res.ok) toast("error", j.error || "Sync failed."); else toast("success", `Synced ${j.products} products.`); reload();
  }
  return (
    <>
      <PageHeader title="Store Connections" text="Connect your storefronts. A store is marked connected only after its credentials are saved and a connection test passes." />
      <ResourcePage table="stores" noun="Store" auditEntity="store" hasCreator reloadKey={k} defaults={{ platform: "shopify" }}
        toolbar={<ConnectShopify onDone={() => setK((x) => x + 1)} />}
        emptyText="Connect Shopify to import products, or add a store record for a platform whose connector is not available yet."
        fields={[{ key: "name", label: "Store name", required: true }, { key: "url", label: "Store URL", type: "url", required: true, placeholder: "https://mystore.com" },
          { key: "platform", label: "Platform", type: "select", options: ["shopify", "shopify_plus", "woocommerce", "bigcommerce", "adobe_commerce", "shopware", "salesforce_commerce_cloud", "other"] }]}
        columns={[{ key: "name", label: "Store" }, { key: "url", label: "URL", hideOnMobile: true }, { key: "platform", label: "Platform", render: (r) => <span className="capitalize">{String(r.platform).replace(/_/g, " ")}</span> },
          { key: "status", label: "Connection", render: (r) => <StatusBadge value={r.status} /> },
          { key: "last_synced_at", label: "Last sync", hideOnMobile: true, render: (r) => r.last_synced_at ? new Date(r.last_synced_at).toLocaleString() : <span className="text-muted">Never</span> },
          { key: "product_count", label: "Products", render: (r) => r.product_count ?? 0 }]}
        rowActions={(r, reload) => r.platform === "shopify" && r.status !== "not_connected" ? <button className="rounded-lg p-1.5 hover:bg-soft" aria-label={`Sync ${r.name}`} onClick={() => sync(r.id, reload)} disabled={syncing === r.id}><RefreshCw size={15} className={syncing === r.id ? "animate-spin" : ""} /></button> : null} />
      <p className="mt-4 text-xs text-muted">Recent data activity is recorded in the audit log on the Settings page.</p>
    </>
  );
}
