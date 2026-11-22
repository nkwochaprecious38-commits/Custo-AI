'use client';
import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Info, Send, ShieldCheck } from 'lucide-react';
import { Alert, Badge, Button, Card, Spinner, useConfirm, useToast } from '@/components/ui';
import { PageHeader } from '@/components/app/common';
import { getSupabase } from '@/lib/supabase/client';
import { logAudit, useOrg } from '@/lib/org';

type Action = { type: 'create_draft_content_campaign' | 'add_search_synonym' | 'create_draft_recommendation_campaign'; label: string; payload: Record<string, unknown> };
type Answer = { facts: string[]; suggestions: string[]; action: Action | null; source: 'ai' | 'rules'; data_label: string };
type Msg = { role: 'user'; text: string } | { role: 'assistant'; answer: Answer; done?: boolean } | { role: 'error'; text: string };

const PROMPTS = [
  'Which products are receiving the most views?',
  'Which products have high views but low add to cart activity?',
  'Summarize our best performing recommendation campaigns.',
  'Which customer segments are most engaged?',
  'What are the most common searches returning no results?',
  'Suggest products for a cross selling campaign.',
  'Summarize this month’s commerce performance.',
  'Identify products with declining engagement.',
  'Help draft a promotional campaign.',
];

export default function AssistantPage() {
  const { org, user, canEdit } = useOrg();
  const toast = useToast(); const confirm = useConfirm();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState(''); const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  async function ask(q: string) {
    const question = q.trim(); if (!question || busy) return;
    setMsgs((m) => [...m, { role: 'user', text: question }]); setInput(''); setBusy(true);
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ org_id: org.id, question }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'The assistant could not answer.');
      setMsgs((m) => [...m, { role: 'assistant', answer: j }]);
    } catch (e) { setMsgs((m) => [...m, { role: 'error', text: (e as Error).message }]); }
    setBusy(false);
  }

  async function approve(index: number, a: Action) {
    if (!canEdit) return toast('error', 'Your role cannot create campaign content.');
    if (!(await confirm({ title: 'Approve this action?', message: `${a.label}. It is created as a draft and nothing goes live until you publish it.`, confirmLabel: 'Create draft' }))) return;
    const s = getSupabase(); const p = a.payload as Record<string, string | string[]>;
    let error: { message: string } | null = null; let entity = '';
    if (a.type === 'create_draft_content_campaign') {
      ({ error } = await s.from('content_campaigns').insert({ org_id: org.id, name: String(p.name).slice(0, 160), content_type: 'homepage_banner', placement: 'home_hero', status: 'draft', created_by: user.id, content: { headline: p.headline, body: p.body, cta_label: p.cta_label, theme: 'charcoal' } })); entity = 'content_campaign';
    } else if (a.type === 'add_search_synonym') {
      const terms = [...new Set((p.terms as string[]).map((t) => String(t).toLowerCase().trim()).filter(Boolean))];
      if (terms.length < 2) return toast('error', 'Not enough terms to create a synonym group. Add it manually in Search.');
      ({ error } = await s.from('search_synonyms').insert({ org_id: org.id, terms })); entity = 'search_synonym';
    } else {
      const valid = ['recommended_for_you', 'frequently_bought_together', 'similar_products', 'recently_viewed', 'best_sellers', 'trending', 'related_products', 'new_arrivals', 'complementary', 'replenishment'];
      const places = ['home_page', 'product_page', 'category_page', 'cart_page', 'checkout', 'post_purchase', 'search_results', 'email'];
      ({ error } = await s.from('recommendation_campaigns').insert({ org_id: org.id, name: String(p.name).slice(0, 160), rec_type: valid.includes(String(p.rec_type)) ? p.rec_type : 'complementary', placement: places.includes(String(p.placement)) ? p.placement : 'cart_page', status: 'draft', created_by: user.id })); entity = 'recommendation_campaign';
    }
    if (error) return toast('error', error.message);
    await logAudit(org.id, user.id, 'assistant.action_approved', entity, undefined, { name: a.label });
    setMsgs((m) => m.map((x, i) => (i === index && x.role === 'assistant' ? { ...x, done: true } : x)));
    toast('success', 'Draft created. Review and publish it from its module.');
  }

  return (
    <>
      <PageHeader title="AI Assistant" description="Ask questions about your store. Answers come from your connected data and separate measured facts from suggestions." />
      <Alert tone="info" className="mb-4"><span className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />The assistant never changes live storefront content, campaigns or merchandising rules. Any action it proposes is created as a draft only after you approve it.</span></Alert>
      <Card className="flex min-h-[520px] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-5" aria-live="polite">
          {msgs.length === 0 && (
            <div className="mx-auto max-w-2xl py-6 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mauve"><Bot className="h-6 w-6" /></div>
              <h2 className="mt-4 font-display text-xl font-bold">What would you like to know?</h2>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">{PROMPTS.map((q) => <button key={q} onClick={() => ask(q)} className="rounded-xl border border-charcoal/10 px-4 py-3 text-left text-sm hover:border-teal hover:bg-teal-soft/40">{q}</button>)}</div></div>
          )}
          {msgs.map((m, i) => m.role === 'user' ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-charcoal px-4 py-2.5 text-sm text-white">{m.text}</div>
          ) : m.role === 'error' ? <Alert key={i} tone="error">{m.text}</Alert> : (
            <div key={i} className="max-w-[92%] space-y-3 rounded-2xl rounded-bl-md bg-soft/70 p-4 text-sm">
              <div className="flex flex-wrap gap-1.5"><Badge tone="warning">{m.answer.data_label}</Badge><Badge tone={m.answer.source === 'ai' ? 'teal' : 'neutral'}>{m.answer.source === 'ai' ? 'AI analysis' : 'Built in analysis'}</Badge></div>
              {m.answer.facts.length > 0 && <div><div className="mb-1 text-xs font-bold uppercase tracking-wide text-teal">Measured from your data</div><ul className="space-y-1">{m.answer.facts.map((f, j) => <li key={j}>{f}</li>)}</ul></div>}
              {m.answer.suggestions.length > 0 && <div className="rounded-xl bg-white p-3"><div className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#9b1f67]"><Info className="h-3.5 w-3.5" /> Suggestions, not measured results</div><ul className="space-y-1">{m.answer.suggestions.map((f, j) => <li key={j}>{f}</li>)}</ul></div>}
              {m.answer.action && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-charcoal/20 p-3"><span>{m.answer.action.label}</span>
                {m.done ? <Badge tone="success"><Check className="h-3 w-3" /> Draft created</Badge> : <Button size="sm" onClick={() => approve(i, m.answer.action!)} disabled={!canEdit}>Approve and create draft</Button>}</div>}
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Analyzing your data</div>}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2 border-t border-charcoal/10 p-4">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about products, searches, segments or campaigns" maxLength={500} aria-label="Question"
            className="flex-1 rounded-full border border-charcoal/15 px-5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20" />
          <Button type="submit" disabled={!input.trim() || busy} aria-label="Send"><Send className="h-4 w-4" /></Button>
        </form>
      </Card>
    </>
  );
}
