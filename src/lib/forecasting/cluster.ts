import { Evidence } from "./types";

export function clusterByOrigin(evidence: Evidence[]) {
  const m: Record<string, Evidence[]> = {};
  for (const ev of evidence) (m[ev.originId] ||= []).push(ev);
  return m;
}

export function effectiveCount(m: number, rho: number) {
  const r = Math.min(0.99, Math.max(0, rho));
  return m / (1 + (m - 1) * r);
}
