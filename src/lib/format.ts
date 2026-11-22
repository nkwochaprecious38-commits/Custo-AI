export const fmtNum = (n: number | null | undefined) => new Intl.NumberFormat('en-US').format(Math.round(Number(n ?? 0)));
export const fmtMoney = (n: number | null | undefined, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: Number(n ?? 0) % 1 === 0 ? 0 : 2 }).format(Number(n ?? 0));
export const fmtPct = (n: number | null | undefined, digits = 1) => `${(Number(n ?? 0) * 100).toFixed(digits)}%`;
export const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
export const fmtDateTime = (d: string | null | undefined) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
export function timeAgo(d: string | null | undefined) {
  if (!d) return 'Never';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
/** datetime-local input value from ISO */
export const toLocalInput = (d: string | null | undefined) => {
  if (!d) return '';
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
