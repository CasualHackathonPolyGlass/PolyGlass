import { Evidence } from "./types";
import { clamp } from "./math";

// Revert to original caps (docs were incorrect)
export const TYPE_CAPS: Record<Evidence["type"], number> = { A: 1.0, B: 0.6, C: 0.3, D: 0.2 };
// Increase emphasis on verifiability (quality) and add recency component (t)
export const WEIGHTS = { v: 0.45, r: 0.25, u: 0.15, t: 0.15 } as const;
// For prediction markets, fresh first reports can be valuable; do not penalize
export const FIRST_REPORT_PENALTY = 1.0;

function recencyScore(iso?: string, now = Date.now()) {
  if (!iso) return 0.5; // unknown recency -> neutral
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return 0.5;
  const days = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
  // Map recency to [0,1] with shorter half-life (~120 days) to emphasize freshness
  const halfLife = 120;
  const score = 1 / (1 + days / halfLife);
  return clamp(score, 0, 1);
}

export function rFromCorroborations(k: number, k0 = 1.0) {
  return 1 - Math.exp(-k0 * Math.max(0, k));
}

export function evidenceLogLR(e: Evidence): number {
  if (typeof e.logLRHint === "number") return e.logLRHint;
  const c = TYPE_CAPS[e.type];
  const ver = clamp(e.verifiability, 0, 1);
  const cons = clamp(e.consistency, 0, 1);
  const r = rFromCorroborations(e.corroborationsIndep);
  const t = recencyScore(e.publishedAt);
  let val = e.polarity * c * (WEIGHTS.v*ver + WEIGHTS.r*r + WEIGHTS.u*cons + WEIGHTS.t*t);
  if (e.firstReport) val *= FIRST_REPORT_PENALTY;
  return clamp(val, -c, c);
}
