"use client";
import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import ResourcePage, { type Row } from "@/components/dashboard/ResourcePage";
import { PageHeader, StatusBadge, useToast } from "@/components/dashboard/ui";
import { DEMO_PRODUCTS, fmt, money } from "@/lib/demo";
import { PRODUCT_CSV_TEMPLATE, parseCsv } from "@/lib/csv";
import { supabaseBrowser } from "@/lib/supabase/client";
import { canWriteRole, useOrg } from "@/lib/dashboard/context";

function Thumb({ r }: { r: Row }) {
  return r.image_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-mauve to-pink/40 text-xs font-bold text-charcoal/60">{String(r.name || "?")[0]}</div>;
}
const stock = (n: number) => (n <= 0 ? "out" : n < 20 ? "low" : "in_stock");

function CsvImport({ onDone }: { onDone: () => void }) {
  const { orgId, role, userId } = useOrg(); const toast = useToast(); const ref = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false);
  if (!canWriteRole(role)) return null;
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    if (file.size > 5_000_000) { toast("error", "File is larger than 5 MB."); return; }
    setBusy(true);
    const rows = parseCsv(await file.text());
    const head = rows[0]?.map((h) => h.trim().toLowerCase()) || [];
    if (!head.includes("name")) { setBusy(false); toast("error", "The CSV needs a header row that includes a name column."); return; }
    const idx = (k: string) => head.indexOf(k);
    const out: any[] = []; let skipped = 0;
    for (const r of rows.slice(1)) {
      const get = (k: string) => (idx(k) >= 0 ? (r[idx(k)] || "").trim() : "");
      const name = get("name"); const price = get("price"); const inv = get("inventory"); const status = get("status") || "active";
      if (!name || (price && isNaN(Number(price))) || Number(price) < 0 || (inv && (!Number.isInteger(Number(inv)) || Number(inv) < 0)) || !["active", "draft", "archived"].includes(status)) { skipped++; continue; }
      out.push({ org_id: orgId, name: name.slice(0, 250), sku: get("sku") || null, price: price ? Number(price) : null, category: get("category") || null, brand: get("brand") || null, inventory: inv ? Number(inv) : 0, image_url: /^https?:\/\//.test(get("image_url")) ? get("image_url") : null, status, description: get("description") || null, tags: get("tags") || null });
    }
    const sb = supabaseBrowser();
    for (let i = 0; i < out.length; i += 200) { const { error } = await sb.from("products").insert(out.slice(i, i + 200)); if (error) { setBusy(false); toast("error", error.message); return; } }
    await sb.from("audit_logs").insert({ org_id: orgId, user_id: userId, action: "products.imported", entity: "product", details: { imported: out.length, skipped } });
    setBusy(false); toast("success", `Imported ${out.length} products${skipped ? `, skipped ${skipped} invalid rows` : ""}.`); onDone();
  }
  function template() { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([PRODUCT_CSV_TEMPLATE], { type: "text/csv" })); a.download = "custo-products-template.csv"; a.click(); }
  return (<>
    <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} aria-label="Upload product CSV" />
    <button className="btn-ghost btn-sm !py-2.5" onClick={() => ref.current?.click()} disabled={busy}><Upload size={15} />{busy ? "Importing" : "Import CSV"}</button>
    <button className="btn-ghost btn-sm !py-2.5" onClick={template}><Download size={15} />Template</button></>);
}

export default function Catalog() {
  const [tab, setTab] = useState<"products" | "categories" | "brands">("products"); const [k, setK] = useState(0);
  return (
    <>
      <PageHeader title="Product Catalog" text="The foundation for search, recommendations, segments and merchandising. Import a CSV, connect a store, or add products by hand." />
      <div className="mb-4 flex gap-1 rounded-xl bg-white p-1 shadow-card sm:inline-flex" role="tablist">
        {(["products", "categories", "brands"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "bg-charcoal text-white" : "text-muted hover:text-charcoal"}`}>{t}</button>)}
      </div>
      {tab === "products" && <ResourcePage table="products" noun="Product" auditEntity="product" reloadKey={k} searchKeys={["name", "sku", "category", "brand"]} toolbar={<CsvImport onDone={() => setK((x) => x + 1)} />}
        defaults={{ status: "active", inventory: 0 }}
        demo={DEMO_PRODUCTS as unknown as Row[]} emptyText="Import a CSV or connect Shopify to fill your catalog."
        fields={[{ key: "name", label: "Name", required: true }, { key: "sku", label: "SKU" }, { key: "price", label: "Price", type: "number", min: 0 }, { key: "inventory", label: "Inventory", type: "number", min: 0 },
          { key: "category", label: "Category" }, { key: "brand", label: "Brand" }, { key: "status", label: "Status", type: "select", options: ["active", "draft", "archived"] },
          { key: "image_url", label: "Image URL", type: "url", placeholder: "https://" }, { key: "tags", label: "Search tags", full: true, hint: "Words that describe the product, used by semantic search." }, { key: "description", label: "Description", type: "textarea" }]}
        columns={[{ key: "image", label: "", render: (r) => <Thumb r={r} /> }, { key: "name", label: "Product", render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{r.sku || "No SKU"}</p></div> },
          { key: "price", label: "Price", render: (r) => (r.price == null ? <span className="text-muted">None</span> : money(Number(r.price))) }, { key: "category", label: "Category", hideOnMobile: true }, { key: "brand", label: "Brand", hideOnMobile: true },
          { key: "inventory", label: "Inventory", render: (r) => <span className="inline-flex items-center gap-2">{r.inventory}<StatusBadge value={stock(r.inventory)} /></span> },
          { key: "views", label: "Views", hideOnMobile: true, render: (r) => (r.views ? fmt(r.views) : <span className="text-muted">No data</span>) }]} />}
      {tab === "categories" && <ResourcePage table="product_categories" noun="Category" plural="categories" fields={[{ key: "name", label: "Name", required: true }, { key: "parent", label: "Parent category" }]} columns={[{ key: "name", label: "Category" }, { key: "parent", label: "Parent" }]} />}
      {tab === "brands" && <ResourcePage table="brands" noun="Brand" fields={[{ key: "name", label: "Name", required: true }, { key: "website", label: "Website", type: "url" }]} columns={[{ key: "name", label: "Brand" }, { key: "website", label: "Website" }]} />}
    </>
  );
}
