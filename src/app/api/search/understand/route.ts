import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, requireMember } from '@/lib/serverAuth';
import { aiConfigured, askClaudeJson } from '@/lib/ai';

/** Optional AI query understanding: turns a shopper query into extra search terms. */
export async function POST(req: NextRequest) {
  const { org_id, query } = await req.json().catch(() => ({}));
  const auth = await requireMember(org_id);
  if ('error' in auth) return auth.error;
  if (!aiConfigured()) return NextResponse.json({ available: false, terms: [] });
  if (typeof query !== 'string' || !query.trim()) return jsonError('Enter a query.');
  try {
    const out = await askClaudeJson<{ terms: string[]; intent: string }>(
      'You help an e-commerce search engine. Given a shopper query, return short lowercase product keywords (synonyms, product types, attributes) a catalog might use, and a one sentence description of the intent. Return at most 10 terms.',
      `Shopper query: ${query.slice(0, 200)}`,
      { type: 'object', properties: { terms: { type: 'array', items: { type: 'string' } }, intent: { type: 'string' } }, required: ['terms', 'intent'], additionalProperties: false },
      1000,
    );
    return NextResponse.json({ available: true, terms: (out?.terms ?? []).slice(0, 10), intent: out?.intent ?? null });
  } catch (e) {
    return NextResponse.json({ available: true, terms: [], error: 'AI query understanding is temporarily unavailable.' , detail: (e as Error).message.slice(0, 200) });
  }
}
