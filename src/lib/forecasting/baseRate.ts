export function priorFromReferenceClass(trials: number, successes: number, z = 1.96): number {
  if (trials <= 0) return 0.5;
  const phat = successes / trials;
  const denom = 1 + (z ** 2) / trials;
  const center = phat + (z ** 2) / (2 * trials);
  const rad = z * Math.sqrt(phat * (1 - phat) / trials + (z ** 2) / (4 * trials ** 2));
  const lo = (center - rad) / denom;
  const hi = (center + rad) / denom;
  const mid = 0.5 * (lo + hi);
  return Math.min(1-1e-6, Math.max(1e-6, mid));
}
