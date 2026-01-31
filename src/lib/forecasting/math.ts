export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const logit = (p: number) => Math.log(p / (1 - p));
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function trimmedMean(values: number[], trimFraction: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  const t = Math.max(0, Math.floor(trimFraction * sorted.length));
  const slice = sorted.slice(t, sorted.length - t);
  return (slice.length ? slice : sorted).reduce((a,b)=>a+b,0) / (slice.length ? slice.length : sorted.length);
}
