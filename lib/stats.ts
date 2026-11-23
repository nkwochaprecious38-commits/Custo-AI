// Two proportion z test (two sided). Returns observed rates and a statistical conclusion only when the data supports one.
export type Variation = { id: string; name: string; visitors: number; clicks: number; add_to_carts: number; orders: number; revenue: number };
const phi = (z: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp((-z * z) / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
export function compare(control: Variation, v: Variation, metric: "orders" | "clicks" | "add_to_carts") {
  const n1 = control.visitors, n2 = v.visitors; if (n1 === 0 || n2 === 0) return null;
  const p1 = control[metric] / n1, p2 = v[metric] / n2; const pp = (control[metric] + v[metric]) / (n1 + n2);
  const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2)); if (se === 0) return { lift: 0, p: 1, z: 0 };
  const z = (p2 - p1) / se; return { lift: p1 === 0 ? null : (p2 - p1) / p1, p: 2 * (1 - phi(Math.abs(z))), z };
}
export const MIN_VISITORS = 1000;
