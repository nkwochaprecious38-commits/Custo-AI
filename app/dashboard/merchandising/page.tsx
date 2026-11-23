"use client";
import { useMemo, useState } from "react";
import ResourcePage, { type Row } from "@/components/dashboard/ResourcePage";
import { DemoTag, PageHeader, StatusBadge } from "@/components/dashboard/ui";
import { DEMO_PRODUCTS, money } from "@/lib/demo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useOrg } from "@/lib/dashboard/context";
import { useEffect } from "react";

type P = { id: string; name: string; sku?: string | null; category?: string | null; brand?: string | null; inventory: number; price?: number | null; base: number };

function applyRules(products: P[], rules: Row[]) {
  const list = products.map((p) => ({ ...p, score: -p.base, flags: [] as string[] }));
  for (const r of rules) {
    const t = String(r.target).toLowerCase();
    const hit = (p: P) => (r.target_type === "category" ? String(p.category || "").toLowerCase() === t : r.target_type === "brand" ? String(p.brand || "").toLowerCase() === t : String(p.sku || "").toLowerCase() === t || p.name.toLowerCase() === t);
    list.forEach((p) => {
      if (!hit(p)) return;
      const b = Number(r.boost) || 1;
      if (r.action === "pin") { p.score = 1000 - b; p.flags.push("Pinned"); }
      else if (r.action === "promote" || r.action === "prioritize") { p.score -= 100 * b; p.flags.push("Promoted"); }
      else if (r.action === "demote") { p.score += 100 * b; p.flags.push("Demoted"); }
      else if (r.action === "exclude") p.flags.push("Excluded");
    });
  }
  const sortKey = (p: (typeof list)[number]) => (p.flags.includes("Pinned") ? -p.score : p.score);
  return list.filter((p) => !p.flags.includes("Excluded")).map((p) => ({ ...p, k: p.flags.includes("Pinned") ? -1e9 + (1000 - p.score) : p.score })).sort((a, b) => a.k - b.k || sortKey(a) - sortKey(b));
}

export default function Merchandising() {
  const { orgId, dbReady } = useOrg();
  const [rules, setRules] = useState<Row[]>([]);
  const [products, setProducts] = useState<P[]>([]);
  const [usingDemo, setUsingDemo] = useState(false);
  const [includeDraft, setIncludeDraft] = useState(true);
  useEffect(() => {
    if (!orgId || !dbReady) return;
    supabaseBrowser().from("products").select("id,name,sku,category,brand,inventory,price,status").eq("org_id", orgId).eq("status", "active").order("created_at", { ascending: false }).limit(60).then(({ data }: any) => {
      if (data && data.length) { setUsingDemo(false); setProducts(data.map((d: any, i: number) => ({ ...d, base: i }))); }
      else { setUsingDemo(true); setProducts(DEMO_PRODUCTS.map((d, i) => ({ ...d, base: i }))); }
    });
  }, [orgId, dbReady]);
  const effective = useMemo(() => rules.filter((r) => r.status === "active" || r.status === "scheduled" || (includeDraft && r.status === "draft")), [rules, includeDraft]);
  const ordered = useMemo(() => applyRules(products, effective), [products, effective]);
  const unavailable = products.filter((p) => p.inventory <= 0).length;
  return (
    <>
      <PageHeader title="Merchandising" text="Pin, promote, demote or exclude products, prioritize categories, and schedule rules. Preview the resulting order before publishing." />
      <ResourcePage table="merch_rules" noun="Rule" hasCreator onRows={setRules} defaults={{ action: "promote", target_type: "product", boost: 1, status: "draft" }}
        emptyText="Rules change how products are ordered in categories and search results."
        fields={[{ key: "name", label: "Rule name", required: true, full: true }, { key: "action", label: "Action", type: "select", options: ["pin", "promote", "demote", "exclude", "prioritize"] },
          { key: "target_type", label: "Applies to", type: "select", options: ["product", "category", "brand"] }, { key: "target", label: "Target", required: true, hint: "A product SKU or name, a category, or a brand." },
          { key: "boost", label: "Strength or position", type: "number", min: 1, hint: "Pin position, or boost strength for promote and demote." },
          { key: "starts_on", label: "Starts on", type: "date" }, { key: "ends_on", label: "Ends on", type: "date" }, { key: "status", label: "Status", type: "select", options: ["draft", "scheduled", "active", "paused"] }]}
        columns={[{ key: "name", label: "Rule" }, { key: "action", label: "Action", render: (r) => <span className="capitalize">{r.action}</span> }, { key: "target", label: "Target", render: (r) => <span>{r.target} <span className="text-xs text-muted">({r.target_type})</span></span> },
          { key: "schedule", label: "Schedule", hideOnMobile: true, render: (r) => (r.starts_on || r.ends_on ? `${r.starts_on || "Now"} to ${r.ends_on || "Open ended"}` : <span className="text-muted">Always</span>) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> }]} />
      <section className="card mt-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="text-lg font-bold">Ordering preview</h2>{usingDemo && <DemoTag />}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeDraft} onChange={(e) => setIncludeDraft(e.target.checked)} className="accent-teal" />Include draft rules in preview</label></div>
        <p className="mb-4 text-sm text-muted">{effective.length} rule{effective.length === 1 ? "" : "s"} applied. {unavailable > 0 && `${unavailable} out of stock product${unavailable === 1 ? "" : "s"} can be excluded with an exclude rule.`}</p>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ordered.slice(0, 12).map((p, i) => (
            <li key={p.id} className="rounded-xl border border-charcoal/10 p-2.5"><div className="relative aspect-square rounded-lg bg-gradient-to-br from-mauve to-pink/40"><span className="absolute left-1.5 top-1.5 rounded-full bg-charcoal px-2 py-0.5 text-[10px] font-bold text-white">{i + 1}</span></div>
              <p className="mt-2 truncate text-xs font-semibold">{p.name}</p><p className="text-xs text-muted">{p.price != null ? money(Number(p.price)) : "No price"}{p.inventory <= 0 ? " · Out of stock" : ""}</p>
              {p.flags.length > 0 && <p className="mt-1 text-[10px] font-semibold text-teal">{p.flags.join(", ")}</p>}</li>))}
        </ol>
      </section>
    </>
  );
}
