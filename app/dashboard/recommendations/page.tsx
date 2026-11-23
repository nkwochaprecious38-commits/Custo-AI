"use client";
import ResourcePage from "@/components/dashboard/ResourcePage";
import { PageHeader, StatusBadge } from "@/components/dashboard/ui";
import { useSegmentOptions } from "@/lib/dashboard/hooks";
import { PLACEMENTS, REC_TYPES } from "@/lib/dashboard/options";

export default function Recommendations() {
  const audiences = useSegmentOptions();
  return (
    <>
      <PageHeader title="Recommendations" text="Create recommendation campaigns, choose where they appear, and control which products are included or excluded." />
      <ResourcePage table="rec_campaigns" noun="Campaign" auditEntity="recommendation_campaign" hasCreator searchKeys={["name", "rec_type", "placement", "audience"]}
        defaults={{ status: "draft", audience: "All shoppers" }}
        emptyText="A campaign defines a recommendation type, an audience and a storefront placement."
        fields={[{ key: "name", label: "Campaign name", required: true, full: true }, { key: "rec_type", label: "Recommendation type", type: "select", options: REC_TYPES }, { key: "placement", label: "Placement", type: "select", options: PLACEMENTS },
          { key: "audience", label: "Target audience", type: "select", options: audiences }, { key: "status", label: "Status", type: "select", options: ["draft", "active", "paused"] },
          { key: "inclusion_rules", label: "Product inclusion rules", type: "textarea", placeholder: "Example: category is Footwear, inventory above 0" }, { key: "exclusion_rules", label: "Product exclusion rules", type: "textarea", placeholder: "Example: brand is Clearance, status is draft" }]}
        columns={[{ key: "name", label: "Campaign" }, { key: "rec_type", label: "Type", hideOnMobile: true }, { key: "audience", label: "Audience", hideOnMobile: true }, { key: "placement", label: "Placement" }, { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "perf", label: "Performance", render: () => <span className="text-xs text-muted">No data yet</span> }]} />
      <p className="mt-3 text-xs text-muted">Performance metrics appear after the storefront widget reports impressions and clicks for a campaign.</p>
    </>
  );
}
