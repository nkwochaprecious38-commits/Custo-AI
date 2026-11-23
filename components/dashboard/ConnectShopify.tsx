"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal, useToast } from "./ui";
import { canWriteRole, useOrg } from "@/lib/dashboard/context";

export default function ConnectShopify({ onDone, label = "Connect Shopify" }: { onDone: () => void; label?: string }) {
  const { role } = useOrg(); const toast = useToast();
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  if (!["org_admin", "store_manager", "ecommerce_manager"].includes(role) || !canWriteRole(role)) return null;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/integrations/shopify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.get("name"), domain: f.get("domain"), token: f.get("token") }) });
    const j = await res.json().catch(() => ({})); setBusy(false);
    if (!res.ok) { setErr(j.error || "Connection failed."); return; }
    toast("success", `Connected ${j.shop}. Imported ${j.products} products.`); setOpen(false); onDone();
  }
  return (
    <>
      <button className="btn-dark btn-sm !py-2.5" onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <Modal title="Connect a Shopify store" onClose={() => setOpen(false)}>
          <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-sm text-muted">
            <li>In Shopify admin, open Settings, then Apps and sales channels, then Develop apps.</li>
            <li>Create an app and grant the Admin API scope <code className="font-mono text-xs">read_products</code>.</li>
            <li>Install the app and copy the Admin API access token.</li>
            <li>Enter the details below. We test the connection before saving anything.</li>
          </ol>
          <form onSubmit={submit} className="space-y-4">
            {err && <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{err}</div>}
            <div><label className="label" htmlFor="sname">Store name (optional)</label><input id="sname" name="name" className="input" /></div>
            <div><label className="label" htmlFor="sdomain">Shopify domain</label><input id="sdomain" name="domain" required placeholder="yourstore.myshopify.com" className="input" /></div>
            <div><label className="label" htmlFor="stoken">Admin API access token</label><input id="stoken" name="token" type="password" required autoComplete="off" className="input" />
              <p className="mt-1 text-xs text-muted">The token is stored server side and is never sent back to the browser.</p></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Test and connect</button></div>
          </form>
        </Modal>)}
    </>
  );
}
