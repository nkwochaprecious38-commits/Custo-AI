"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, ShieldCheck } from "lucide-react";
import { Confirm, DemoTag, PageHeader, useToast } from "@/components/dashboard/ui";
import { DEMO_CAMPAIGNS, DEMO_PRODUCTS, DEMO_QUERIES, DEMO_SEGMENTS, buildSeries, fmt, money, sum } from "@/lib/demo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { canWriteRole, useOrg } from "@/lib/dashboard/context";

type Block = { kind: "data" | "suggestion"; text: string };
type Msg = { role: "user" | "assistant"; text?: string; blocks?: Block[]; draft?: { name: string; headline: string; body: string } };
const PROMPTS = ["Which products are receiving the most views?", "Which products have high views but low add to cart activity?", "Summarize our best performing recommendation campaigns.", "Which customer segments are most engaged?", "What are the most common searches returning no results?", "Suggest products for a cross selling campaign.", "Summarize this month's commerce performance.", "Identify products with declining engagement.", "Help draft a promotional campaign."];

export default function Assistant() {
  const { orgId, role, userId, dbReady } = useOrg(); const toast = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: "Ask about your store performance. Answers label actual data separately from my suggestions. I never change live storefront content, campaigns or merchandising rules without your approval." }]);
  const [input, setInput] = useState(""); const [confirm, setConfirm] = useState<Msg["draft"] | null>(null); const [realCount, setRealCount] = useState(0); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (orgId && dbReady) supabaseBrowser().from("products").select("id", { count: "exact", head: true }).eq("org_id", orgId).then(({ count }: any) => setRealCount(count || 0)); }, [orgId, dbReady]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);
  const src = "Source: demo data. Behavioral metrics are not yet collected from your store.";

  function answer(q: string): Msg {
    const t = q.toLowerCase(); const s = buildSeries(30, "all", "all");
    if (/(publish|activate|go live|delete|pause|launch|change|update)/.test(t) && /(campaign|rule|banner|storefront|merchandis)/.test(t))
      return { role: "assistant", blocks: [{ kind: "data", text: "I cannot change live campaigns, rules or storefront content from chat." }, { kind: "suggestion", text: "Open the relevant module, review the change and publish it yourself. I can prepare a draft for you to approve if you ask me to draft a campaign." }] };
    if (/draft|promotional|promo/.test(t)) {
      const d = { name: "Seasonal promotion draft", headline: "Find your next favorite, picked for you", body: "A short message highlighting new arrivals and best sellers for returning customers. Edit the wording before publishing." };
      return { role: "assistant", blocks: [{ kind: "suggestion", text: `Suggested campaign. Headline: "${d.headline}". Message: ${d.body}` }, { kind: "data", text: "Nothing has been saved. Approving below creates a draft content campaign only. It will not go live." }], draft: d };
    }
    if (/zero|no results|common search/.test(t)) { const z = DEMO_QUERIES.filter((x) => x.results === 0); return { role: "assistant", blocks: [{ kind: "data", text: z.map((x) => `${x.query}: ${x.searches} searches`).join("; ") + `. ${src}` }, { kind: "suggestion", text: "Consider adding catalog tags or synonyms for these terms on the Search page, or sourcing matching products." }] }; }
    if (/cross sell|cross-sell|complement/.test(t)) return { role: "assistant", blocks: [{ kind: "data", text: `${realCount > 0 ? `Your catalog has ${realCount} products, but order history is not connected, so pairings cannot be measured.` : "No catalog imported yet."} Sample pairings below use demo products only.` }, { kind: "suggestion", text: "Cross sell candidates from the sample catalog: Wireless Noise Cancelling Headphones with Compact Bluetooth Speaker, and Hydra Barrier Moisturizer with Daily Mineral Sunscreen. Validate any pairing against real order data before launching a campaign." }] };
    if (/high views|low add|views but/.test(t)) { const l = [...DEMO_PRODUCTS].map((p) => ({ ...p, r: p.carts / p.views })).sort((a, b) => a.r - b.r).slice(0, 3); return { role: "assistant", blocks: [{ kind: "data", text: l.map((p) => `${p.name}: ${fmt(p.views)} views, ${(p.r * 100).toFixed(1)}% add to cart`).join("; ") + `. ${src}` }, { kind: "suggestion", text: "These pages are worth a closer look: price, imagery, stock or copy may be causing hesitation. An A/B test is a good next step." }] }; }
    if (/view/.test(t) || /most viewed|top product/.test(t)) { const l = [...DEMO_PRODUCTS].sort((a, b) => b.views - a.views).slice(0, 5); return { role: "assistant", blocks: [{ kind: "data", text: l.map((p, i) => `${i + 1}. ${p.name} (${fmt(p.views)} views)`).join("; ") + `. ${src}` }] }; }
    if (/campaign/.test(t) && /(best|perform|summar)/.test(t)) { const l = [...DEMO_CAMPAIGNS].sort((a, b) => b.revenue - a.revenue); return { role: "assistant", blocks: [{ kind: "data", text: l.map((c) => `${c.name}: ${fmt(c.clicks)} clicks, ${money(c.revenue)} attributed revenue`).join("; ") + `. ${src}` }, { kind: "suggestion", text: "Compare these with a controlled experiment before drawing causal conclusions." }] }; }
    if (/segment|engaged/.test(t)) { const l = [...DEMO_SEGMENTS].sort((a, b) => b.conversion - a.conversion).slice(0, 3); return { role: "assistant", blocks: [{ kind: "data", text: l.map((x) => `${x.name}: ${x.conversion}% conversion, ${fmt(x.members)} shoppers`).join("; ") + `. ${src}` }, { kind: "suggestion", text: "Smaller high converting segments are good audiences for tailored content and recommendations." }] }; }
    if (/declin/.test(t)) { const l = [...DEMO_PRODUCTS].filter((p) => p.carts / p.views < 0.04 || p.inventory === 0).slice(0, 3); return { role: "assistant", blocks: [{ kind: "data", text: `Trend history is not available yet, so I cannot measure decline. Products with weak add to cart rates or no stock in the sample: ${l.map((p) => p.name).join(", ")}. ${src}` }, { kind: "suggestion", text: "Once events are collected over several weeks, I can compare period over period engagement." }] }; }
    if (/summar|month|performance|overview/.test(t)) return { role: "assistant", blocks: [{ kind: "data", text: `Last 30 days: ${fmt(sum(s, "visitors"))} visitors, ${((sum(s, "orders") / sum(s, "visitors")) * 100).toFixed(2)}% conversion, ${money(sum(s, "revenue"))} revenue, ${money(sum(s, "revenue") / sum(s, "orders"))} average order value. ${src}` }, { kind: "suggestion", text: "Connect a store and collect behavioral events to replace these figures with your own." }] };
    return { role: "assistant", text: "I can answer questions about views, add to cart activity, recommendation campaigns, segments, zero result searches, cross selling and monthly performance, and help draft a campaign. Try one of the suggested questions." };
  }
  function send(text: string) { const q = text.trim(); if (!q) return; setMsgs((m) => [...m, { role: "user", text: q }, answer(q)]); setInput(""); }
  async function approve() {
    if (!confirm || !orgId) return;
    const { error } = await supabaseBrowser().from("content_campaigns").insert({ org_id: orgId, name: confirm.name, surface: "Homepage banner", headline: confirm.headline, body: confirm.body, audience: "All shoppers", status: "draft", created_by: userId });
    if (error) toast("error", error.message); else { await supabaseBrowser().from("audit_logs").insert({ org_id: orgId, user_id: userId, action: "assistant.draft_created", entity: "content_campaign", details: { name: confirm.name } }); toast("success", "Draft saved in Content Personalization."); }
    setConfirm(null);
  }
  return (
    <>
      <PageHeader title="AI Assistant" text="Ask questions about your commerce performance." actions={<DemoTag>Demo data answers</DemoTag>} />
      <div className="card flex h-[calc(100vh-15rem)] min-h-[420px] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-charcoal text-pink"><Bot size={16} /></span>}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-charcoal text-white" : "bg-soft"}`}>
                {m.text && <p>{m.text}</p>}
                {m.blocks?.map((b, j) => <div key={j} className="mt-2 first:mt-0"><span className={`badge mb-1 ${b.kind === "data" ? "bg-teal-light text-teal" : "bg-pink/25 text-charcoal"}`}>{b.kind === "data" ? "Actual data" : "AI suggestion"}</span><p>{b.text}</p></div>)}
                {m.draft && (canWriteRole(role) ? <button className="btn-primary btn-sm mt-3" onClick={() => setConfirm(m.draft!)}><ShieldCheck size={14} />Review and save as draft</button> : <p className="mt-2 text-xs text-muted">Your role cannot create campaigns.</p>)}
              </div>
            </div>))}
          <div ref={end} />
        </div>
        <div className="border-t border-charcoal/10 p-3 sm:p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{PROMPTS.map((p) => <button key={p} onClick={() => send(p)} className="shrink-0 rounded-full border border-charcoal/15 px-3 py-1.5 text-xs font-medium hover:bg-mauve">{p}</button>)}</div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2"><input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your store" aria-label="Message" /><button className="btn-primary" aria-label="Send"><Send size={16} /></button></form>
        </div>
      </div>
      {confirm && <Confirm title="Save draft campaign" text={`Create a draft content campaign named "${confirm.name}"? It will stay a draft and will not appear on your storefront until you publish it.`} confirmLabel="Save draft" onConfirm={approve} onCancel={() => setConfirm(null)} />}
    </>
  );
}
