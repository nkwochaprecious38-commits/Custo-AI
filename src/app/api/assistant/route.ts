import { NextResponse, type NextRequest } from 'next/server';
import { requireMember } from '@/lib/serverAuth';
import { aiConfigured, askClaudeJson } from '@/lib/ai';

type Action =
  | { type: 'create_draft_content_campaign'; label: string; payload: { name: string; headline: string; body: string; cta_label: string } }
  | { type: 'add_search_synonym'; label: string; payload: { terms: string[] } }
  | { type: 'create_draft_recommendation_campaign'; label: string; payload: { name: string; rec_type: string; placement: string } };
type Answer = { facts: string[]; suggestions: string[]; action: Action | null; source: 'ai' | 'rules'; data_label: string };

const n = (x: unknown) => Number(x ?? 0);
const money = (x: number) => `$${x.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : 'n/a');

async function buildContext(supabase: Awaited<ReturnType<typeof requireMember>> extends infer R ? R extends { supabase: infer S } ? S : never : never, org: string) {
  const now = Date.now();
  const r = (d: number, off = 0) => ({ p_org: org, p_from: new Date(now - (off + d) * 86400000).toISOString(), p_to: new Date(now - off * 86400000).toISOString() });
  const [cur, prev, perf, segs, prods] = await Promise.all([
    supabase.rpc('analytics_summary', r(30)), supabase.rpc('analytics_summary', r(30, 30)),
    supabase.rpc('product_performance', r(30)), supabase.rpc('segment_performance', { p_org: org }),
    supabase.from('products').select('id, title, price, inventory_quantity, category_id, product_categories(name)').eq('org_id', org).eq('status', 'active').limit(1000),
  ]);
  type P = { id: string; title: string; product_categories: { name: string } | null; price: number; inventory_quantity: number };
  const titles = new Map(((prods.data ?? []) as unknown as P[]).map((p) => [p.id, p]));
  const perfRows = ((perf.data ?? []) as { product_id: string; views: number; add_to_carts: number; purchases: number; prior_views: number; clicks: number }[])
    .filter((p) => titles.has(p.product_id)).map((p) => ({ ...p, title: titles.get(p.product_id)!.title, category: titles.get(p.product_id)!.product_categories?.name ?? null, views: n(p.views), add_to_carts: n(p.add_to_carts), purchases: n(p.purchases), prior_views: n(p.prior_views), clicks: n(p.clicks) }));
  const c = cur.data as Record<string, any>;
  return {
    period: 'last 30 days compared with the 30 days before',
    demo: !!c?.flags?.has_sample && !c?.flags?.has_live,
    totals: c?.totals, previous_totals: (prev.data as Record<string, any>)?.totals,
    most_viewed: [...perfRows].sort((a, b) => b.views - a.views).slice(0, 8).map(({ title, category, views, add_to_carts, purchases }) => ({ title, category, views, add_to_carts, purchases })),
    high_views_low_cart: perfRows.filter((p) => p.views >= 50).map((p) => ({ title: p.title, views: p.views, add_to_carts: p.add_to_carts, cart_rate: p.add_to_carts / p.views })).sort((a, b) => a.cart_rate - b.cart_rate).slice(0, 6),
    declining: perfRows.filter((p) => p.prior_views >= 30).map((p) => ({ title: p.title, views: p.views, prior_views: p.prior_views, change: (p.views - p.prior_views) / p.prior_views })).sort((a, b) => a.change - b.change).slice(0, 6),
    top_purchased: [...perfRows].sort((a, b) => b.purchases - a.purchases).slice(0, 6).map(({ title, category, purchases }) => ({ title, category, purchases })),
    recommendation_campaigns: c?.campaigns ?? [],
    search: c?.search,
    segments: segs.data ?? [],
    categories: c?.categories ?? [],
  };
}

type Ctx = Awaited<ReturnType<typeof buildContext>>;

function ruleAnswer(q: string, d: Ctx): Omit<Answer, 'source' | 'data_label'> {
  const s = q.toLowerCase();
  const t = d.totals ?? {}, p = d.previous_totals ?? {};
  if (/zero|no result|returning no/.test(s)) {
    const z = d.search?.zero_queries ?? [];
    if (!z.length) return { facts: ['No searches returned zero results in the last 30 days.'], suggestions: [], action: null };
    return {
      facts: [`${n(d.search.zero_results)} of ${n(d.search.total)} searches (${pct(n(d.search.zero_results), n(d.search.total))}) returned no results.`, ...z.slice(0, 5).map((x: { query: string; searches: number }) => `"${x.query}" was searched ${x.searches} times with no results.`)],
      suggestions: ['Add synonyms that map these queries to products you carry.', 'Consider whether frequently searched items indicate a gap in the catalog.'],
      action: { type: 'add_search_synonym', label: `Add a synonym group for "${z[0].query}"`, payload: { terms: [z[0].query, ...z[0].query.split(' ').slice(-1)] } },
    };
  }
  if (/high views|low add|add to cart activity|hesitat/.test(s)) {
    const h = d.high_views_low_cart;
    return { facts: h.length ? h.map((x) => `${x.title}: ${x.views} views and ${x.add_to_carts} add to cart events (${(x.cart_rate * 100).toFixed(1)}%).`) : ['No products with at least 50 views in the last 30 days.'],
      suggestions: h.length ? ['Review pricing, imagery, availability and product descriptions for these items.', 'Test a different product page layout with an A/B experiment.'] : [], action: null };
  }
  if (/most views|most viewed|receiving the most/.test(s)) {
    return { facts: d.most_viewed.map((x, i) => `${i + 1}. ${x.title}: ${x.views} views, ${x.add_to_carts} add to cart events, ${x.purchases} purchases.`), suggestions: [], action: null };
  }
  if (/recommendation campaign|best performing rec/.test(s)) {
    const rc = [...(d.recommendation_campaigns as { name: string; impressions: number; clicks: number; attributed_revenue: number; status: string }[])].sort((a, b) => (b.clicks / (b.impressions || 1)) - (a.clicks / (a.impressions || 1)));
    if (!rc.length) return { facts: ['There are no recommendation campaigns yet.'], suggestions: ['Create a campaign in Recommendations.'], action: null };
    return { facts: rc.map((c) => `${c.name} (${c.status}): ${c.impressions} impressions, ${c.clicks} clicks, CTR ${pct(c.clicks, c.impressions)}, ${money(n(c.attributed_revenue))} attributed revenue.`), suggestions: ['Click through rate compares engagement, not cause and effect. Use an A/B test to confirm the impact of a change.'], action: null };
  }
  if (/segment/.test(s)) {
    const sg = [...(d.segments as { name: string; customers: number; revenue: number; orders: number }[])].sort((a, b) => n(b.revenue) / (n(b.customers) || 1) - n(a.revenue) / (n(a.customers) || 1));
    if (!sg.length) return { facts: ['No customer segments have been created yet.'], suggestions: [], action: null };
    return { facts: sg.map((x) => `${x.name}: ${x.customers} customers, ${x.orders} orders, ${money(n(x.revenue))} lifetime revenue (${money(n(x.revenue) / (n(x.customers) || 1))} per customer).`), suggestions: ['Segments with high revenue per customer are good candidates for loyalty messaging.'], action: null };
  }
  if (/cross sell|cross-sell|crosssell|bundle/.test(s)) {
    const top = d.top_purchased.slice(0, 4);
    return { facts: top.map((x) => `${x.title} (${x.category ?? 'uncategorized'}) had ${x.purchases} purchases.`),
      suggestions: ['Pair these best sellers with products from other categories using a complementary recommendation campaign on the cart page.'],
      action: { type: 'create_draft_recommendation_campaign', label: 'Create a draft cross selling campaign on the cart page', payload: { name: 'Cart: complementary products', rec_type: 'complementary', placement: 'cart_page' } } };
  }
  if (/declin/.test(s)) {
    const dec = d.declining.filter((x) => x.change < 0);
    return { facts: dec.length ? dec.map((x) => `${x.title}: ${x.views} views, down ${Math.abs(x.change * 100).toFixed(0)}% from ${x.prior_views}.`) : ['No products show declining views compared with the previous period.'], suggestions: dec.length ? ['Check stock levels and whether these products are still visible in key categories.'] : [], action: null };
  }
  if (/draft|promotion|campaign idea|promotional/.test(s)) {
    const top = d.most_viewed[0];
    return { facts: top ? [`Your most viewed product in the last 30 days was ${top.title} with ${top.views} views.`] : [],
      suggestions: ['Draft idea: feature your most viewed category on the homepage for returning customers, with a clear call to action. Measure it with impressions and clicks before rolling out widely.'],
      action: { type: 'create_draft_content_campaign', label: 'Save this idea as a draft homepage banner', payload: { name: `Promotion: ${top?.category ?? 'featured products'}`, headline: top ? `Discover ${top.category ?? 'our favorites'}` : 'Discover our favorites', body: 'Explore the products shoppers are viewing most this month.', cta_label: 'Shop now' } } };
  }
  // Default: performance summary
  const conv = (o: number, v: number) => (v > 0 ? o / v : 0);
  return {
    facts: [
      `Visitors: ${n(t.visitors).toLocaleString()} (previous period ${n(p.visitors).toLocaleString()}).`,
      `Orders: ${n(t.orders)} with revenue of ${money(n(t.revenue))} (previous period ${money(n(p.revenue))}).`,
      `Conversion rate: ${(conv(n(t.orders), n(t.visitors)) * 100).toFixed(2)}% (previous ${(conv(n(p.orders), n(p.visitors)) * 100).toFixed(2)}%).`,
      `Average order value: ${money(n(t.orders) ? n(t.revenue) / n(t.orders) : 0)}.`,
      `Recommendation clicks: ${n(t.rec_clicks).toLocaleString()} from ${n(t.rec_impressions).toLocaleString()} impressions.`,
    ],
    suggestions: ['Ask about zero result searches, declining products or segment engagement for more detail.'], action: null,
  };
}

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['facts', 'suggestions', 'action'],
  properties: {
    facts: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
    action: {
      anyOf: [{ type: 'null' }, {
        type: 'object', additionalProperties: false, required: ['type', 'label', 'payload'],
        properties: {
          type: { type: 'string', enum: ['create_draft_content_campaign', 'add_search_synonym', 'create_draft_recommendation_campaign'] },
          label: { type: 'string' },
          payload: { type: 'object', additionalProperties: false, required: ['name', 'headline', 'body', 'cta_label', 'terms', 'rec_type', 'placement'],
            properties: { name: { type: 'string' }, headline: { type: 'string' }, body: { type: 'string' }, cta_label: { type: 'string' }, terms: { type: 'array', items: { type: 'string' } }, rec_type: { type: 'string' }, placement: { type: 'string' } } },
        },
      }],
    },
  },
};

const SYSTEM = `You are the Custo AI Commerce Assistant for an e-commerce team. Answer using only the JSON store data provided.
Put measured numbers taken directly from the data in "facts". Never invent numbers, customers, revenue improvements or results that are not in the data.
Put recommendations, interpretations and ideas in "suggestions", phrased as suggestions. Do not claim causation from correlations, and do not promise outcomes.
If the data cannot answer the question, say so in facts and suggest what data would be needed.
You may propose at most one "action" that creates a draft (never live) item: a draft content campaign, a search synonym group, or a draft recommendation campaign (rec_type one of recommended_for_you, frequently_bought_together, similar_products, recently_viewed, best_sellers, trending, related_products, new_arrivals, complementary, replenishment; placement one of home_page, product_page, category_page, cart_page, checkout, post_purchase, search_results, email). Fill unused payload fields with empty values. Use null when no action is useful.
Write plain sentences without dashes used as punctuation and without markdown.`;

export async function POST(req: NextRequest) {
  const { org_id, question } = await req.json().catch(() => ({}));
  const auth = await requireMember(org_id);
  if ('error' in auth) return auth.error;
  const q = String(question ?? '').trim().slice(0, 1000);
  if (!q) return NextResponse.json({ error: 'Ask a question.' }, { status: 400 });
  const ctx = await buildContext(auth.supabase, org_id);
  const data_label = ctx.demo ? 'Based on demo data' : 'Based on your store data';
  if (aiConfigured()) {
    try {
      const out = await askClaudeJson<Omit<Answer, 'source' | 'data_label'>>(SYSTEM, `Store data:\n${JSON.stringify(ctx)}\n\nQuestion: ${q}`, SCHEMA, 4000);
      if (out) {
        const a = out.action as Action | null;
        if (a?.type === 'add_search_synonym') a.payload = { terms: (a.payload.terms ?? []).filter(Boolean).slice(0, 10) };
        return NextResponse.json({ ...out, action: a, source: 'ai', data_label } satisfies Answer);
      }
    } catch {
      // fall through to the built in analysis
    }
  }
  return NextResponse.json({ ...ruleAnswer(q, ctx), source: 'rules', data_label } satisfies Answer);
}
