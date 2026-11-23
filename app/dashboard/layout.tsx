import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/Shell";
import type { Role } from "@/lib/dashboard/context";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const meta = (user.user_metadata || {}) as Record<string, string>;
  const fetchMembership = () => sb.from("memberships").select("org_id, role, organizations(name)").eq("user_id", user.id).order("created_at").limit(1);
  let { data, error } = await fetchMembership();
  if (!error && (!data || data.length === 0)) { await sb.rpc("ensure_workspace"); ({ data, error } = await fetchMembership()); }
  const m: any = data?.[0];
  const org = Array.isArray(m?.organizations) ? m.organizations[0] : m?.organizations;
  return (
    <DashboardShell ctx={{
      userId: user.id, email: user.email || "", fullName: meta.full_name || "",
      orgId: m?.org_id ?? null, orgName: org?.name || meta.company || "Your workspace", role: (m?.role as Role) || "org_admin", dbReady: !error && !!m,
    }}>{children}</DashboardShell>
  );
}
