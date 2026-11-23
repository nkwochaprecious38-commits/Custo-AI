"use client";
import { useState } from "react";
import ResourcePage, { type Row } from "@/components/dashboard/ResourcePage";
import { PageHeader, StatusBadge } from "@/components/dashboard/ui";
import { MIN_VISITORS, compare, type Variation } from "@/lib/stats";
import { useOrg } from "@/lib/dashboard/context";

const TYPES = ["Product recommendation layout", "Homepage banner", "Product sorting rule", "Promotional message", "Search result layout", "Product display arrangement", "Call to action"];
const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(2) + "%" : "No data");

export default function Experiments() {
  const [sel, setSel] = useState<Row | null>(null); const [vars, setVars] = useState<Row[]>([]); const { orgId } = useOrg();
  const list = vars as unknown as Variation[];
  const control = list[list.length - 1]; // oldest variation is the control
  return (
    <>
      <PageHeader title="A/B Testing" text="Compare versions of a shopping experience. Select an experiment to record variation results and see observed metrics separately from the statistical conclusion." />
      <ResourcePage table="experiments" noun="Experiment" hasCreator selectedId={sel?.id} onSelect={setSel} defaults={{ status: "draft", primary_metric: "orders", test_type: TYPES[0] }}
        emptyText="An experiment compares two or more variations of one change."
        fields={[{ key: "name", label: "Experiment name", required: true, full: true }, { key: "test_type", label: "What are you testing", type: "select", options: TYPES },
          { key: "primary_metric", label: "Primary metric", type: "select", options: [{ value: "orders", label: "Conversion rate" }, { value: "add_to_carts", label: "Add to cart rate" }, { value: "clicks", label: "Click through rate" }] },
          { key: "hypothesis", label: "Hypothesis", type: "textarea" }, { key: "status", label: "Status", type: "select", options: ["draft", "running", "paused", "completed"] }]}
        columns={[{ key: "name", label: "Experiment" }, { key: "test_type", label: "Test", hideOnMobile: true }, { key: "primary_metric", label: "Primary metric", hideOnMobile: true, render: (r) => ({ orders: "Conversion rate", add_to_carts: "Add to cart rate", clicks: "Click through rate" } as any)[r.primary_metric] || r.primary_metric },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> }]} />
      {sel && orgId ? (
        <section className="mt-6 space-y-4">
          <h2 className="text-lg font-bold">Results: {sel.name}</h2>
          <ResourcePage key={sel.id} table="experiment_variations" noun="Variation" orderBy="created_at" fixed={{ experiment_id: sel.id }} onRows={setVars}
            emptyText="Add a control and at least one variation, then enter the counts reported by your tracking."
            fields={[{ key: "name", label: "Variation name", required: true, full: true, hint: "The first variation you add is treated as the control." }, { key: "visitors", label: "Visitors", type: "number", min: 0 }, { key: "clicks", label: "Clicks", type: "number", min: 0 },
              { key: "add_to_carts", label: "Add to carts", type: "number", min: 0 }, { key: "orders", label: "Orders", type: "number", min: 0 }, { key: "revenue", label: "Revenue", type: "number", min: 0 }]}
            defaults={{ visitors: 0, clicks: 0, add_to_carts: 0, orders: 0, revenue: 0 }}
            columns={[{ key: "name", label: "Variation" }, { key: "visitors", label: "Visitors", render: (r) => Number(r.visitors).toLocaleString() }, { key: "ctr", label: "CTR", render: (r) => pct(r.clicks, r.visitors) },
              { key: "atc", label: "Add to cart", render: (r) => pct(r.add_to_carts, r.visitors) }, { key: "cr", label: "Conversion", render: (r) => pct(r.orders, r.visitors) },
              { key: "aov", label: "AOV", hideOnMobile: true, render: (r) => (r.orders ? "$" + (r.revenue / r.orders).toFixed(2) : "No data") }, { key: "rpv", label: "Revenue per visitor", hideOnMobile: true, render: (r) => (r.visitors ? "$" + (r.revenue / r.visitors).toFixed(2) : "No data") }]} />
          {list.length >= 2 && <Conclusion control={control} others={list.filter((v) => v.id !== control.id)} metric={sel.primary_metric} />}
        </section>) : <p className="mt-4 text-sm text-muted">Select an experiment above to manage its variations.</p>}
    </>
  );
}

function Conclusion({ control, others, metric }: { control: Variation; others: Variation[]; metric: string }) {
  const m = (metric === "clicks" || metric === "add_to_carts" ? metric : "orders") as "orders" | "clicks" | "add_to_carts";
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2"><h3 className="font-bold">Statistical conclusion</h3><span className="badge bg-teal-light text-teal">Two proportion z test</span></div>
      <p className="mt-1 text-sm text-muted">Observed results above are descriptive. A winner is named only when each arm has at least {MIN_VISITORS.toLocaleString()} visitors and the difference is significant at the 95 percent level. Control: {control.name}.</p>
      <ul className="mt-4 space-y-3">
        {others.map((v) => {
          const r = compare(control, v, m); const enough = control.visitors >= MIN_VISITORS && v.visitors >= MIN_VISITORS;
          let text = "No visitor data yet.", tone = "text-muted";
          if (r) {
            const lift = r.lift == null ? "" : ` Observed relative change: ${(r.lift * 100).toFixed(1)} percent.`;
            if (!enough) text = `Not enough data. Each arm needs ${MIN_VISITORS.toLocaleString()} visitors before a conclusion is drawn.${lift}`;
            else if (r.p < 0.05) { tone = r.z > 0 ? "text-success" : "text-danger"; text = `${r.z > 0 ? v.name + " outperforms the control" : "The control outperforms " + v.name} with statistical significance (p = ${r.p.toFixed(3)}).${lift}`; }
            else text = `No statistically significant difference (p = ${r.p.toFixed(3)}). Keep the test running or treat the result as inconclusive.${lift}`;
          }
          return <li key={v.id} className="rounded-xl bg-soft/70 p-3.5 text-sm"><b>{v.name}</b> versus control: <span className={tone}>{text}</span></li>;
        })}
      </ul>
    </div>
  );
}
