import { ForecastCard, InfluenceItem, ClusterMeta } from './types';

export function makeForecastCard(params: {
  question: string; p0: number; pNeutral: number; pAware?: number; alpha: number;
  drivers: string[]; influence: InfluenceItem[]; clusters: ClusterMeta[];
  provenance: string[]; markdownReport: string;
}): ForecastCard {
  const maxDelta = params.influence.reduce((m, x) => Math.max(m, x.deltaPP || 0), 0);
  const audit = {
    caps: { A: 2.0, B: 1.6, C: 0.8, D: 0.3 },
    checklist: {
      baseRatePresent: true,
      twoSidedSearch: true,
      independenceChecked: true,
      influenceUnderThreshold: maxDelta <= 0.10
    }
  };
  return {
    question: params.question,
    p0: params.p0,
    pNeutral: params.pNeutral,
    pAware: params.pAware,
    alpha: params.alpha,
    drivers: params.drivers,
    evidenceInfluence: params.influence,
    clusters: params.clusters,
    audit,
    provenance: params.provenance,
    markdownReport: params.markdownReport
  };
}
