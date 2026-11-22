import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = 'claude-opus-5-5';

/**
 * Single structured call to Claude. Returns parsed JSON matching the schema, or null when the
 * model declined or the output could not be parsed. Server side only: the API key never reaches the browser.
 */
export async function askClaudeJson<T>(system: string, user: string, schema: Record<string, unknown>, maxTokens = 4000): Promise<T | null> {
  const client = new Anthropic();
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: user }],
  };
  const res = await client.beta.messages.create(params as unknown as Parameters<typeof client.beta.messages.create>[0]) as Anthropic.Beta.BetaMessage;
  if (res.stop_reason === 'refusal') return null;
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  try { return JSON.parse(text) as T; } catch { return null; }
}
