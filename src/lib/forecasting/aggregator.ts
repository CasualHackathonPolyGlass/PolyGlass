import { Evidence, ClusterMeta, InfluenceItem } from "./types";
import { evidenceLogLR } from "./evidence";
import { clusterByOrigin, effectiveCount } from "./cluster";
import { logit, sigmoid, trimmedMean } from "./math";

export function aggregateNeutral(
  p0: number,
  evidence: Evidence[],
  rhoByCluster?: Record<string, number>,
  trimFraction = 0.2
): { pNeutral: number; influence: InfluenceItem[]; clusters: ClusterMeta[] } {
  const clusters = clusterByOrigin(evidence);
  let l = logit(p0);
  const meta: ClusterMeta[] = [];
  const contrib: Record<string, number> = {};

  for (const [cid, items] of Object.entries(clusters)) {
    const m = items.length;
    const rho = rhoByCluster?.[cid] ?? (m > 1 ? 0.6 : 0.0);
    const mEff = effectiveCount(m, rho);
    const llrs = items.map(evidenceLogLR);
    const meanLLR = trimmedMean(llrs, trimFraction);
    const c = mEff * meanLLR;
    contrib[cid] = c;
    l += c;
    meta.push({ clusterId: cid, size: m, rho, mEff, meanLLR });
  }
  const pNeutral = sigmoid(l);

  const influence: InfluenceItem[] = [];
  for (const [cid, items] of Object.entries(clusters)) {
    for (const ev of items) {
      const others = items.filter(x => x.id !== ev.id);
      let alt = 0;
      if (others.length) {
        const rhoAlt = rhoByCluster?.[cid] ?? (others.length > 1 ? 0.6 : 0.0);
        const mEffAlt = effectiveCount(others.length, rhoAlt);
        const meanAlt = trimmedMean(others.map(evidenceLogLR), 0.2);
        alt = mEffAlt * meanAlt;
      }
      const lWithout = l - contrib[cid] + alt;
      const pWithout = sigmoid(lWithout);
      influence.push({ evidenceId: ev.id, logLR: evidenceLogLR(ev), deltaPP: Math.abs(pNeutral - pWithout) });
    }
  }

  return { pNeutral, influence, clusters: meta };
}

export function blendMarket(pNeutral: number, marketProb: number, alpha = 0.1) {
  return sigmoid(logit(pNeutral) + alpha * logit(marketProb));
}
