"use client";
import ResourcePage from "@/components/dashboard/ResourcePage";
import { PageHeader, StatusBadge } from "@/components/dashboard/ui";
import { useSegmentOptions } from "@/lib/dashboard/hooks";

const SURFACES = ["Homepage banner", "Promotional message", "Product collection section", "Landing page content", "Category page content", "Promotional popup", "Featured products"];

export default function Content() {
  const audiences = useSegmentOptions();
  return (
    <>
      <PageHeader title="Content Personalization" text="Create content for specific audiences, schedule it, preview it, and publish when you are ready." />
      <ResourcePage table="content_campaigns" noun="Content campaign" plural="content campaigns" hasCreator defaults={{ status: "draft", audience: "All shoppers", surface: SURFACES[0] }}
        emptyText="Choose a surface, write the message, pick an audience and a schedule."
        fields={[{ key: "name", label: "Campaign name", required: true, full: true }, { key: "surface", label: "Surface", type: "select", options: SURFACES }, { key: "audience", label: "Audience", type: "select", options: audiences },
          { key: "headline", label: "Headline", required: true, full: true }, { key: "body", label: "Message", type: "textarea" }, { key: "cta_label", label: "Button label" }, { key: "cta_url", label: "Button link", type: "url", placeholder: "https://" },
          { key: "starts_on", label: "Starts on", type: "date" }, { key: "ends_on", label: "Ends on", type: "date" }, { key: "status", label: "Status", type: "select", options: ["draft", "scheduled", "active", "paused"], hint: "Setting active publishes the campaign." }]}
        preview={(v) => (
          <div className="overflow-hidden rounded-2xl bg-charcoal p-6 text-white"><p className="text-[10px] font-semibold uppercase tracking-widest text-pink">{v.surface}</p>
            <p className="mt-3 font-heading text-xl font-extrabold leading-tight !text-white">{v.headline || "Your headline"}</p><p className="mt-2 text-sm text-white/70">{v.body || "Your message appears here."}</p>
            {v.cta_label && <span className="mt-4 inline-block rounded-lg bg-pink px-4 py-2 text-sm font-semibold text-ink">{v.cta_label}</span>}
            <p className="mt-4 text-[11px] text-white/50">Audience: {v.audience}</p></div>)}
        columns={[{ key: "name", label: "Campaign" }, { key: "surface", label: "Surface", hideOnMobile: true }, { key: "audience", label: "Audience", hideOnMobile: true },
          { key: "schedule", label: "Schedule", hideOnMobile: true, render: (r) => (r.starts_on || r.ends_on ? `${r.starts_on || "Now"} to ${r.ends_on || "Open ended"}` : <span className="text-muted">Always</span>) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> }]} />
    </>
  );
}
