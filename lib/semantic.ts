// Lightweight semantic matching: query intent is expanded into concept groups, then matched against
// product text, tags and category. This runs locally. A vector or LLM backed engine can replace rank().
const CONCEPTS: Record<string, string[]> = {
  footwear: ["shoes", "shoe", "sneakers", "sneaker", "trainers", "boots", "footwear"],
  walking: ["walking", "walk", "everyday", "cushioned", "comfortable", "comfort", "hiking"],
  comfort: ["comfortable", "comfort", "cushioned", "soft", "cozy", "relaxed"],
  skin: ["skin", "skincare", "face", "moisturizer", "cream", "hydration", "dry"],
  sun: ["sun", "sunscreen", "spf", "protection"],
  audio: ["headphones", "audio", "music", "speaker", "wireless", "bluetooth", "noise"],
  warm: ["warm", "winter", "wool", "cozy", "blanket", "sweater"],
  gift: ["gift", "candle", "scent", "present"],
  home: ["home", "kitchen", "living", "tableware", "blanket", "candle"],
  travel: ["travel", "bag", "luggage", "weekend", "leather"],
};
const STOP = new Set(["for", "the", "a", "an", "and", "of", "to", "with", "in", "on", "my", "i", "need", "want", "looking"]);
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t && !STOP.has(t));
export type Rankable = { id: string; name: string; category?: string | null; brand?: string | null; tags?: string | null; description?: string | null };

export function expand(query: string, synonyms: Record<string, string[]> = {}) {
  const base = tokens(query); const extra = new Set<string>();
  for (const t of base) {
    (synonyms[t] || []).forEach((s) => tokens(s).forEach((x) => extra.add(x)));
    for (const group of Object.values(CONCEPTS)) if (group.includes(t)) group.forEach((g) => extra.add(g));
  }
  return { base, extra: Array.from(extra).filter((e) => !base.includes(e)) };
}
export function rank<T extends Rankable>(items: T[], query: string, synonyms: Record<string, string[]> = {}) {
  const { base, extra } = expand(query, synonyms); if (!base.length) return [];
  return items.map((p) => {
    const title = tokens(p.name); const text = tokens([p.category, p.brand, p.tags, p.description].filter(Boolean).join(" "));
    let score = 0; const why: string[] = [];
    base.forEach((t) => { if (title.includes(t)) { score += 3; why.push(`title: ${t}`); } else if (text.includes(t)) { score += 2; why.push(`tag: ${t}`); } });
    extra.forEach((t) => { if (title.includes(t) || text.includes(t)) { score += 0.75; why.push(`intent: ${t}`); } });
    return { item: p, score, why: why.slice(0, 4) };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}
