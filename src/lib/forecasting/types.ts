export type EvidenceType = "A" | "B" | "C" | "D";
export type Polarity = 1 | -1;

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
}

export interface Evidence {
  id: string;
  claim: string;
  polarity: Polarity;
  type: EvidenceType;
  publishedAt?: string;
  urls: string[];
  originId: string;
  firstReport: boolean;
  verifiability: number;        // [0,1]
  corroborationsIndep: number;  // integer
  consistency: number;          // [0,1]
  logLRHint?: number;
  // Optional fields for adjacent/catalyst reasoning
  pathway?: string;             // e.g., 'platform-policy', 'release/tour', 'viral', 'award/media', 'regulatory', etc.
  connectionStrength?: number;  // [0,1] strength of linkage between signal and outcome
}

export interface ClusterMeta {
  clusterId: string;
  size: number;
  rho: number;
  mEff: number;
  meanLLR: number;
}

export interface InfluenceItem {
  evidenceId: string;
  logLR: number;
  deltaPP: number; // absolute change
}

export interface ForecastCard {
  question: string;
  p0: number;
  pNeutral: number;
  pAware?: number;
  alpha: number;
  drivers: string[];
  evidenceInfluence: InfluenceItem[];
  clusters: ClusterMeta[];
  audit: Record<string, unknown>;
  provenance: string[];
  markdownReport: string;
}
