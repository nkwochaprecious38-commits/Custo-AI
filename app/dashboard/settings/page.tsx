"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader, useToast } from "@/components/dashboard/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ROLE_LABELS, useOrg } from "@/lib/dashboard/context";
import { friendlyAuthError, passwordIssues } from "@/lib/auth-errors";

export default function Settings() {
  const { orgId, orgName, role, userId, email, fullName, dbReady } = useOrg(); const toast = useToast(); const sb = supabaseBrowser();
  const [busy, setBusy] = useState(""); const [logs, setLogs] = useState<any[] | null>(null); const [pwErr, setPwErr] = useState("");
  useEffect(() => { if (orgId && dbReady) sb.from("audit_logs").select("id,action,entity,created_at,details").eq("org_id", orgId).order("created_at", { ascending: false }).limit(25).then(({ data }: any) => setLogs(data || [])); else setLogs([]); }, [orgId, dbReady, sb]);
  async function saveOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name") || "").trim(); if (name.length < 2) { toast("error", "Organization name is too short."); return; }
    setBusy("org"); const { error } = await sb.from("organizations").update({ name }).eq("id", orgId!); setBusy("");
    if (error) toast("error", error.message); else { await sb.from("audit_logs").insert({ org_id: orgId, user_id: userId, action: "organization.renamed", entity: "organization", entity_id: orgId, details: { name } }); toast("success", "Organization updated. Reload to see the new name in the sidebar."); }
  }
  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name") || "").trim(); setBusy("profile");
    const { error } = await sb.from("profiles").update({ full_name: name }).eq("id", userId); await sb.auth.updateUser({ data: { full_name: name } }); setBusy("");
    if (error) toast("error", error.message); else toast("success", "Profile saved.");
  }
  async function savePw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPwErr(""); const f = new FormData(e.currentTarget); const pw = String(f.get("password")), c = String(f.get("confirm"));
    const issue = passwordIssues(pw) || (pw !== c ? "Passwords do not match." : null); if (issue) { setPwErr(issue); return; }
    setBusy("pw"); const { error } = await sb.auth.updateUser({ password: pw }); setBusy("");
    if (error) setPwErr(friendlyAuthError(error.message, error.code)); else { toast("success", "Password updated."); (e.target as HTMLFormElement).reset(); }
  }
  const B = ({ k }: { k: string }) => <button className="btn-primary" disabled={busy === k}>{busy === k && <Loader2 size={16} className="animate-spin" />}Save</button>;
  return (
    <>
      <PageHeader title="Settings" text="Organization, profile, security and the audit log." />
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveOrg} className="card space-y-4 p-5"><h2 className="font-bold">Organization</h2><div><label className="label" htmlFor="on">Name</label><input id="on" name="name" className="input" defaultValue={orgName} disabled={role !== "org_admin"} /></div>
          <p className="text-xs text-muted">Your role: {ROLE_LABELS[role]}. {role !== "org_admin" && "Only admins can rename the organization."}</p>{role === "org_admin" && <B k="org" />}</form>
        <form onSubmit={saveProfile} className="card space-y-4 p-5"><h2 className="font-bold">Profile</h2><div><label className="label" htmlFor="pn">Full name</label><input id="pn" name="name" className="input" defaultValue={fullName} /></div>
          <div><label className="label" htmlFor="pe">Email</label><input id="pe" className="input" value={email} disabled readOnly /></div><B k="profile" /></form>
        <form onSubmit={savePw} className="card space-y-4 p-5" noValidate><h2 className="font-bold">Change password</h2>{pwErr && <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{pwErr}</div>}
          <div><label className="label" htmlFor="np">New password</label><input id="np" name="password" type="password" autoComplete="new-password" className="input" /></div>
          <div><label className="label" htmlFor="cp">Confirm password</label><input id="cp" name="confirm" type="password" autoComplete="new-password" className="input" /></div><B k="pw" /></form>
        <section className="card p-5"><h2 className="font-bold">Privacy</h2><p className="mt-2 text-sm leading-relaxed text-muted">Customer profiles are only activated for shoppers who have given consent. Store credentials are kept on the server and are never exposed to the browser.</p></section>
      </div>
      <section className="card mt-6 overflow-x-auto"><h2 className="p-5 font-bold">Audit log</h2>
        {logs === null ? <p className="px-5 pb-5 text-sm text-muted">Loading...</p> : logs.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">No recorded actions yet.</p> :
          <table className="w-full min-w-[480px] text-sm"><thead className="bg-soft/70 text-left text-xs uppercase text-muted"><tr><th className="px-5 py-3">Action</th><th>Detail</th><th>When</th></tr></thead><tbody className="divide-y divide-charcoal/10">{logs.map((l) => <tr key={l.id}><td className="px-5 py-2.5 font-medium">{l.action.replace(/[._]/g, " ")}</td><td className="text-muted">{l.details?.name || l.details?.email || l.entity}</td><td>{new Date(l.created_at).toLocaleString()}</td></tr>)}</tbody></table>}</section>
    </>
  );
}
