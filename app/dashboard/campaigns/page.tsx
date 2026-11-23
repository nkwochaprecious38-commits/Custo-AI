"use client";
import ResourcePage from "@/components/dashboard/ResourcePage";
import { PageHeader, StatusBadge } from "@/components/dashboard/ui";
import { useSegmentOptions } from "@/lib/dashboard/hooks";

export default function Campaigns() {
  const audiences = useSegmentOptions();
  return (
    <>
      <PageHeader title="Campaigns" text="Plan and track commerce campaigns in one list. Recommendation and content campaigns have their own workspaces." />
      <ResourcePage table="campaigns" noun="Campaign" hasCreator defaults={{ status: "draft", channel: "Onsite", audience: "All shoppers" }}
        fields={[{ key: "name", label: "Campaign name", required: true, full: true }, { key: "channel", label: "Channel", type: "select", options: ["Onsite", "Email", "Paid media", "Social", "Marketplace"] },
          { key: "audience", label: "Audience", type: "select", options: audiences }, { key: "goal", label: "Goal", type: "textarea" }, { key: "starts_on", label: "Starts on", type: "date" }, { key: "ends_on", label: "Ends on", type: "date" },
          { key: "status", label: "Status", type: "select", options: ["draft", "scheduled", "active", "paused", "completed"] }]}
        columns={[{ key: "name", label: "Campaign" }, { key: "channel", label: "Channel", hideOnMobile: true }, { key: "audience", label: "Audience", hideOnMobile: true },
          { key: "schedule", label: "Schedule", render: (r) => (r.starts_on || r.ends_on ? `${r.starts_on || "Now"} to ${r.ends_on || "Open ended"}` : <span className="text-muted">Not scheduled</span>) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> }]} />
    </>
  );
}
