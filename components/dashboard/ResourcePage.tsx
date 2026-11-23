"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { canWriteRole, useOrg } from "@/lib/dashboard/context";
import { Confirm, DemoTag, EmptyState, ErrorBox, Modal, Spinner, StatusBadge, useToast } from "./ui";
import { Loader2 } from "lucide-react";

export type Opt = string | { value: string; label: string };
export type FieldDef = { key: string; label: string; type?: "text" | "number" | "textarea" | "select" | "date" | "url"; options?: Opt[]; required?: boolean; placeholder?: string; hint?: string; min?: number; full?: boolean };
export type Row = Record<string, any> & { id: string };
export type ColumnDef = { key: string; label: string; render?: (r: Row) => ReactNode; hideOnMobile?: boolean };

type Props = {
  table: string; noun: string; plural?: string; fields: FieldDef[]; columns: ColumnDef[]; demo?: Row[];
  fixed?: Record<string, any>; searchKeys?: string[]; orderBy?: string; toolbar?: ReactNode; reloadKey?: number;
  onRows?: (rows: Row[]) => void; hasCreator?: boolean; preview?: (values: Record<string, any>) => ReactNode; canCreate?: boolean;
  emptyText?: string; rowActions?: (r: Row, reload: () => void) => ReactNode; onSelect?: (r: Row) => void; selectedId?: string; defaults?: Record<string, any>; auditEntity?: string;
};
const optVal = (o: Opt) => (typeof o === "string" ? o : o.value);
const optLabel = (o: Opt) => (typeof o === "string" ? o : o.label);

export default function ResourcePage(p: Props) {
  const { orgId, role, userId, dbReady } = useOrg();
  const toast = useToast();
  const canWrite = canWriteRole(role);
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [edit, setEdit] = useState<Row | "new" | null>(null);
  const [del, setDel] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const fixedKey = JSON.stringify(p.fixed || {});

  const load = useCallback(async () => {
    if (!orgId || !dbReady) { setState("error"); setError(!dbReady ? "The database is not reachable or not set up." : "No organization found for this account."); return; }
    setState("loading");
    let query = sb.from(p.table).select("*").eq("org_id", orgId);
    for (const [k, v] of Object.entries(JSON.parse(fixedKey))) query = query.eq(k, v as any);
    const { data, error } = await query.order(p.orderBy || "created_at", { ascending: false }).limit(500);
    if (error) { setError(error.message); setState("error"); return; }
    setRows((data as Row[]) || []); p.onRows?.((data as Row[]) || []); setState("ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, dbReady, p.table, fixedKey, p.orderBy, version, p.reloadKey]);
  useEffect(() => { load(); }, [load]);

  const showingDemo = state === "ready" && rows.length === 0 && !!p.demo;
  const source = showingDemo ? p.demo! : rows;
  const hasStatus = p.fields.some((f) => f.key === "status");
  const statusOptions = useMemo(() => Array.from(new Set(source.map((r) => r.status).filter(Boolean))), [source]);
  const visible = useMemo(() => source.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!q.trim()) return true;
    const keys = p.searchKeys || p.columns.map((c) => c.key);
    return keys.some((k) => String(r[k] ?? "").toLowerCase().includes(q.trim().toLowerCase()));
  }), [source, q, status, p.searchKeys, p.columns]);

  async function audit(action: string, id: string, details: object) {
    if (!orgId) return;
    await sb.from("audit_logs").insert({ org_id: orgId, user_id: userId, action, entity: p.auditEntity || p.table, entity_id: id, details });
  }
  async function save(values: Record<string, any>) {
    setBusy(true);
    const payload: Record<string, any> = { ...(p.fixed || {}) };
    for (const f of p.fields) {
      const raw = values[f.key];
      payload[f.key] = raw === "" || raw === undefined ? null : f.type === "number" ? Number(raw) : raw;
    }
    let err; let id = "";
    if (edit && edit !== "new") { id = edit.id; ({ error: err } = await sb.from(p.table).update(payload).eq("id", edit.id).eq("org_id", orgId!)); }
    else {
      const ins: Record<string, any> = { ...payload, org_id: orgId }; if (p.hasCreator) ins.created_by = userId;
      const res = await sb.from(p.table).insert(ins).select("id").single(); err = res.error; id = (res.data as any)?.id || "";
    }
    setBusy(false);
    if (err) { toast("error", err.message); return; }
    await audit(edit === "new" ? `${p.table}.created` : `${p.table}.updated`, id, { name: values.name ?? null });
    toast("success", `${p.noun} ${edit === "new" ? "created" : "saved"}.`); setEdit(null); setVersion((v) => v + 1);
  }
  async function remove() {
    if (!del) return; setBusy(true);
    const { error } = await sb.from(p.table).delete().eq("id", del.id).eq("org_id", orgId!);
    setBusy(false);
    if (error) { toast("error", error.message); return; }
    await audit(`${p.table}.deleted`, del.id, { name: del.name ?? null });
    toast("success", `${p.noun} deleted.`); setDel(null); setVersion((v) => v + 1);
  }

  const cell = (r: Row, c: ColumnDef) => c.render ? c.render(r) : c.key === "status" ? <StatusBadge value={String(r.status ?? "draft")} /> : (r[c.key] ?? "") === "" ? <span className="text-muted">None</span> : String(r[c.key]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-charcoal/10 p-3 sm:p-4">
        <div className="relative min-w-[180px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder={`Search ${p.plural || p.noun.toLowerCase() + "s"}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </div>
        {hasStatus && statusOptions.length > 0 && (
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>{statusOptions.map((s) => <option key={s} value={s}>{String(s).replace(/_/g, " ")}</option>)}
          </select>)}
        {p.toolbar}
        {showingDemo && <DemoTag />}
        {!canWrite && <span className="badge bg-soft text-muted">View only</span>}
        {canWrite && p.canCreate !== false && <button className="btn-primary btn-sm !py-2.5" onClick={() => setEdit("new")}><Plus size={16} />New {p.noun.toLowerCase()}</button>}
      </div>
      {state === "loading" ? <Spinner /> : state === "error" ? <ErrorBox message={error} /> : visible.length === 0 ? (
        <EmptyState title={q || status !== "all" ? "No matches" : `No ${p.plural || p.noun.toLowerCase() + "s"} yet`} text={q || status !== "all" ? "Try a different search or filter." : p.emptyText || `Create your first ${p.noun.toLowerCase()} to get started.`}
          action={canWrite && !q && p.canCreate !== false ? <button className="btn-primary btn-sm" onClick={() => setEdit("new")}><Plus size={16} />New {p.noun.toLowerCase()}</button> : undefined} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-soft/70 text-xs uppercase tracking-wide text-muted"><tr>
              {p.columns.map((c) => <th key={c.key} className={`px-4 py-3 font-semibold ${c.hideOnMobile ? "hidden md:table-cell" : ""}`}>{c.label}</th>)}
              {canWrite && <th className="w-24 px-4 py-3 text-right font-semibold">Actions</th>}</tr></thead>
            <tbody className="divide-y divide-charcoal/10">
              {visible.map((r) => (
                <tr key={r.id} className={`${p.onSelect ? "cursor-pointer hover:bg-mauve/40" : ""} ${p.selectedId === r.id ? "bg-mauve/60" : ""}`} onClick={() => p.onSelect?.(r)}>
                  {p.columns.map((c) => <td key={c.key} className={`px-4 py-3 ${c.hideOnMobile ? "hidden md:table-cell" : ""}`}>{cell(r, c)}</td>)}
                  {canWrite && <td className="px-4 py-3 text-right">{showingDemo ? <span className="text-xs text-muted">Sample</span> : (
                    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {p.rowActions?.(r, () => setVersion((v) => v + 1))}
                      <button className="rounded-lg p-1.5 hover:bg-soft" onClick={() => setEdit(r)} aria-label={`Edit ${r.name ?? p.noun}`}><Pencil size={15} /></button>
                      <button className="rounded-lg p-1.5 text-danger hover:bg-danger/10" onClick={() => setDel(r)} aria-label={`Delete ${r.name ?? p.noun}`}><Trash2 size={15} /></button></span>)}</td>}
                </tr>))}
            </tbody>
          </table>
        </div>)}
      {edit && <FormModal noun={p.noun} fields={p.fields} initial={edit === "new" ? p.defaults || {} : edit} isNew={edit === "new"} busy={busy} onClose={() => setEdit(null)} onSave={save} preview={p.preview} />}
      {del && <Confirm danger title={`Delete ${p.noun.toLowerCase()}`} text={`Delete "${del.name ?? "this record"}"? This cannot be undone.`} confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />}
    </div>
  );
}

function FormModal({ noun, fields, initial, isNew, busy, onClose, onSave, preview }: { noun: string; fields: FieldDef[]; initial: Record<string, any>; isNew: boolean; busy: boolean; onClose: () => void; onSave: (v: Record<string, any>) => void; preview?: (v: Record<string, any>) => ReactNode }) {
  const [v, setV] = useState<Record<string, any>>(() => { const o: Record<string, any> = {}; fields.forEach((f) => { o[f.key] = initial[f.key] ?? (f.type === "select" && f.options ? optVal(f.options[0]) : ""); }); return o; });
  const [errs, setErrs] = useState<Record<string, string>>({});
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n: Record<string, string> = {};
    fields.forEach((f) => {
      const val = String(v[f.key] ?? "").trim();
      if (f.required && !val) n[f.key] = `${f.label} is required.`;
      else if (val && f.type === "number" && (isNaN(Number(val)) || (f.min !== undefined && Number(val) < f.min))) n[f.key] = `Enter a valid number${f.min !== undefined ? ` of at least ${f.min}` : ""}.`;
      else if (val && f.type === "url" && !/^https?:\/\/\S+\.\S+/i.test(val)) n[f.key] = "Enter a full URL starting with http:// or https://.";
    });
    setErrs(n); if (!Object.keys(n).length) onSave(v);
  }
  return (
    <Modal title={`${isNew ? "New" : "Edit"} ${noun.toLowerCase()}`} onClose={onClose} wide={!!preview}>
      <div className={preview ? "grid gap-6 md:grid-cols-[1.2fr_1fr]" : ""}>
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
              <label htmlFor={`f_${f.key}`} className="label">{f.label}{f.required && <span className="text-danger"> *</span>}</label>
              {f.type === "textarea" ? <textarea id={`f_${f.key}`} rows={3} className="input" value={v[f.key]} placeholder={f.placeholder} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                : f.type === "select" ? <select id={`f_${f.key}`} className="input" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>{f.options!.map((o) => <option key={optVal(o)} value={optVal(o)}>{optLabel(o)}</option>)}</select>
                : <input id={`f_${f.key}`} className={`input ${errs[f.key] ? "!border-danger" : ""}`} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} step={f.type === "number" ? "any" : undefined} value={v[f.key]} placeholder={f.placeholder} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
              {errs[f.key] ? <p className="mt-1 text-xs text-danger">{errs[f.key]}</p> : f.hint ? <p className="mt-1 text-xs text-muted">{f.hint}</p> : null}
            </div>))}
          <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Save</button></div>
        </form>
        {preview && <div><p className="label">Preview</p>{preview(v)}</div>}
      </div>
    </Modal>
  );
}
