/** Two-proportion z-test (two sided). Returns the p-value and the confidence that the rates truly differ. */
function normCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
export function twoProportion(x1: number, n1: number, x2: number, n2: number) {
  if (n1 <= 0 || n2 <= 0) return { p: null as number | null, lift: null as number | null, confidence: null as number | null };
  const p1 = x1 / n1, p2 = x2 / n2, pool = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2));
  const lift = p1 > 0 ? (p2 - p1) / p1 : null;
  if (se === 0) return { p: null, lift, confidence: null };
  const z = (p2 - p1) / se;
  const p = 2 * (1 - normCdf(Math.abs(z)));
  return { p, lift, confidence: 1 - p };
}

export const MIN_VISITORS = 1000;      // per variation before any conclusion is drawn
export const MIN_CONVERSIONS = 30;     // total events of the primary metric
export type Verdict = { state: 'insufficient' | 'inconclusive' | 'significant'; message: string };

export function verdict(primaryEvents: number, controlN: number, variantN: number, p: number | null, direction: number | null): Verdict {
  if (controlN < MIN_VISITORS || variantN < MIN_VISITORS) return { state: 'insufficient', message: `Not enough data yet. Each variation needs at least ${MIN_VISITORS.toLocaleString()} visitors before results can be interpreted.` };
  if (primaryEvents < MIN_CONVERSIONS) return { state: 'insufficient', message: `Not enough events yet. At least ${MIN_CONVERSIONS} total events of the primary metric are needed.` };
  if (p == null || p >= 0.05) return { state: 'inconclusive', message: 'No statistically significant difference at the 95% confidence level. The observed difference could be due to chance.' };
  return { state: 'significant', message: direction && direction > 0 ? 'The variation outperformed the control with statistical significance at the 95% level.' : 'The control outperformed the variation with statistical significance at the 95% level.' };
}
