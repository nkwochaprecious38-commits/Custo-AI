"use client";
import ResourcePage from "@/components/dashboard/ResourcePage";
import { PageHeader, StatusBadge } from "@/components/dashboard/ui";
import { DEMO_SEGMENTS } from "@/lib/demo";
import { SEGMENT_ATTRS } from "@/lib/dashboard/options";

const demoRows = DEMO_SEGMENTS.map((s, i) => ({ id: `ds${i}`, name: s.name, description: "Sample segment", attribute: "total_orders", operator: ">=", value: "1", status: "active", member_count: s.members }));
const label = (v: string) => SEGMENT_ATTRS.find((a) => a.value === v)?.label || v;

export default function Segments() {
  return (
    <>
      <PageHeader title="Customer Segments" text="Group shoppers by attributes and behavior. Segments can be used as audiences in recommendation and content campaigns." />
      <ResourcePage table="segments" noun="Segment" hasCreator defaults={{ operator: ">=", status: "active" }} demo={demoRows} searchKeys={["name", "description"]}
        emptyText="Define a segment with an attribute, an operator and a value."
        fields={[{ key: "name", label: "Segment name", required: true, full: true }, { key: "description", label: "Description", type: "textarea" },
          { key: "attribute", label: "Attribute", type: "select", options: SEGMENT_ATTRS }, { key: "operator", label: "Operator", type: "select", options: [">=", "<=", "=", ">", "<", "contains"] },
          { key: "value", label: "Value", required: true }, { key: "status", label: "Status", type: "select", options: ["active", "paused", "draft"] }]}
        columns={[{ key: "name", label: "Segment", render: (r) => <div><p className="font-medium">{r.name}</p>{r.description && <p className="text-xs text-muted">{r.description}</p>}</div> },
          { key: "rule", label: "Rule", hideOnMobile: true, render: (r) => <span className="text-muted">{label(r.attribute)} {r.operator} {r.value}</span> },
          { key: "member_count", label: "Shoppers", render: (r) => (r.member_count ? Number(r.member_count).toLocaleString() : <span className="text-muted">Not calculated</span>) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> }]} />
      <p className="mt-3 text-xs text-muted">Shopper counts are calculated once customer profiles and behavioral events are collected. Only profiles with recorded consent are activated.</p>
    </>
  );
}
