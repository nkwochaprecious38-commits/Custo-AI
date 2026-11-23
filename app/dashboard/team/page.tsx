"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { Confirm, Modal, PageHeader, Spinner, StatusBadge, useToast } from "@/components/dashboard/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ROLE_LABELS, useOrg, type Role } from "@/lib/dashboard/context";
import { emailOk } from "@/lib/auth-errors";

const ROLES = Object.keys(ROLE_LABELS) as Role[];
export default function Team() {
  const { orgId, role, userId, dbReady } = useOrg(); const toast = useToast(); const sb = supabaseBrowser(); const admin = role === "org_admin";
  const [members, setMembers] = useState<any[] | null>(null); const [invites, setInvites] = useState<any[]>([]); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<any>(null); const [err, setErr] = useState("");
  const load = useCallback(async () => {
    if (!orgId || !dbReady) { setMembers([]); return; }
    const { data: m } = await sb.from("memberships").select("id,user_id,role,created_at").eq("org_id", orgId).order("created_at");
    const ids = (m || []).map((x: any) => x.user_id);
    const { data: p } = ids.length ? await sb.from("profiles").select("id,full_name").in("id", ids) : { data: [] as any[] };
    setMembers((m || []).map((x: any) => ({ ...x, name: (p || []).find((y: any) => y.id === x.user_id)?.full_name || "Team member" })));
    if (admin) { const { data: i } = await sb.from("invitations").select("*").eq("org_id", orgId).neq("status", "revoked").order("created_at", { ascending: false }); setInvites(i || []); }
  }, [orgId, dbReady, admin, sb]);
  useEffect(() => { load(); }, [load]);
  async function changeRole(id: string, r: string) {
    const { error } = await sb.from("memberships").update({ role: r }).eq("id", id).eq("org_id", orgId!);
    if (error) toast("error", error.message); else { await sb.from("audit_logs").insert({ org_id: orgId, user_id: userId, action: "member.role_changed", entity: "membership", entity_id: id, details: { role: r } }); toast("success", "Role updated."); load(); }
  }
  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); const f = new FormData(e.currentTarget); const email = String(f.get("email") || "").trim().toLowerCase(); const r = String(f.get("role"));
    if (!emailOk(email)) { setErr("Enter a valid email address."); return; }
    if (invites.some((i) => i.email === email && i.status === "pending")) { setErr("This email already has a pending invitation."); return; }
    setBusy(true); const { error } = await sb.from("invitations").insert({ org_id: orgId, email, role: r, invited_by: userId }); setBusy(false);
    if (error) { setErr(error.message); return; }
    await sb.from("audit_logs").insert({ org_id: orgId, user_id: userId, action: "member.invited", entity: "invitation", details: { email, role: r } });
    toast("success", "Invitation created. Share the sign up link with them."); setOpen(false); load();
  }
  async function doRemove() {
    setBusy(true); const { error } = await sb.from("memberships").delete().eq("id", remove.id).eq("org_id", orgId!); setBusy(false);
    if (error) toast("error", error.message); else { await sb.from("audit_logs").insert({ org_id: orgId, user_id: userId, action: "member.removed", entity: "membership", entity_id: remove.id }); toast("success", "Member removed."); }
    setRemove(null); load();
  }
  async function revoke(id: string) { await sb.from("invitations").update({ status: "revoked" }).eq("id", id).eq("org_id", orgId!); load(); }
  const link = (email: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/signup?email=${encodeURIComponent(email)}`;
  if (members === null) return <Spinner />;
  return (
    <>
      <PageHeader title="Team Management" text="Invite teammates and assign roles. Roles control who can change data in this organization." actions={admin ? <button className="btn-primary" onClick={() => setOpen(true)}>Invite member</button> : undefined} />
      {!admin && <p className="mb-4 rounded-xl bg-soft p-3 text-sm">Only Organization Admins can invite members or change roles.</p>}
      <section className="card overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead className="bg-soft/70 text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Member</th><th>Role</th><th>Joined</th>{admin && <th className="px-4 text-right">Actions</th>}</tr></thead><tbody className="divide-y divide-charcoal/10">
        {members.map((m) => <tr key={m.id}><td className="px-4 py-3 font-medium">{m.name}{m.user_id === userId && <span className="ml-2 text-xs text-muted">You</span>}</td>
          <td>{admin && m.user_id !== userId ? <select className="input !w-auto !py-1.5" value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} aria-label={`Role for ${m.name}`}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select> : ROLE_LABELS[m.role as Role]}</td>
          <td>{new Date(m.created_at).toLocaleDateString()}</td>{admin && <td className="px-4 text-right">{m.user_id !== userId && <button className="rounded-lg p-1.5 text-danger hover:bg-danger/10" aria-label={`Remove ${m.name}`} onClick={() => setRemove(m)}><Trash2 size={15} /></button>}</td>}</tr>)}</tbody></table></section>
      {admin && invites.length > 0 && <section className="card mt-6 overflow-x-auto"><h2 className="p-4 text-base font-bold">Invitations</h2><table className="w-full min-w-[520px] text-sm"><tbody className="divide-y divide-charcoal/10 border-t border-charcoal/10">
        {invites.map((i) => <tr key={i.id}><td className="px-4 py-3">{i.email}</td><td>{ROLE_LABELS[i.role as Role]}</td><td><StatusBadge value={i.status} /></td><td className="px-4 text-right">{i.status === "pending" && <span className="inline-flex gap-2"><button className="btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(link(i.email)); toast("success", "Sign up link copied."); }}><Copy size={13} />Copy link</button><button className="btn-ghost btn-sm" onClick={() => revoke(i.id)}>Revoke</button></span>}</td></tr>)}</tbody></table>
        <p className="border-t border-charcoal/10 p-4 text-xs text-muted">Custo AI does not send invitation emails yet. Share the sign up link yourself. When the invited person signs up with that email, they join this organization with the assigned role.</p></section>}
      {open && <Modal title="Invite a team member" onClose={() => setOpen(false)}><form onSubmit={invite} className="space-y-4" noValidate>{err && <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{err}</div>}
        <div><label className="label" htmlFor="iem">Work email</label><input id="iem" name="email" type="email" className="input" /></div>
        <div><label className="label" htmlFor="irole">Role</label><select id="irole" name="role" className="input" defaultValue="team_member">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Create invitation</button></div></form></Modal>}
      {remove && <Confirm danger title="Remove member" text={`Remove ${remove.name} from this organization? They will lose access immediately.`} confirmLabel="Remove" busy={busy} onConfirm={doRemove} onCancel={() => setRemove(null)} />}
    </>
  );
}
