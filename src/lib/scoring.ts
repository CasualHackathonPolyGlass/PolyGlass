/**
 * Smart Wallet 评分模块
 * 过滤 + 评分 + 样本修正 + 标签生成
 */
import type { TraderStats, ScoredTrader } from "@/types/fills";
import type { ScoringThresholds, ScoringWeights } from "@/types/smart-money";

/** 默认阈值 */
export const DEFAULT_THRESHOLDS: ScoringThresholds = {
  minTradesCount: 20,
  minMarketsCount: 5,
  minVolumeUSDC: 500,
  sampleCorrectionBase: 50,
};

/** 默认权重 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  roiWeight: 0.45,
  winRateWeight: 0.35,
  volumeWeight: 0.20,
};

/**
 * 过滤符合条件的 Trader
 */
export function filterQualifiedTraders(
  stats: TraderStats[],
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS
): TraderStats[] {
  return stats.filter((s) =>
    s.tradesCount >= thresholds.minTradesCount &&
    s.marketsCount >= thresholds.minMarketsCount &&
    s.volumeUSDC >= thresholds.minVolumeUSDC
  );
}

/**
 * 归一化数组到 [0, 1]
 */
export function normalizeArray(values: number[]): number[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return values.map(() => 0.5);

  return values.map((v) => (v - min) / range);
}

/**
 * 应用样本修正
 */
export function applySampleCorrection(
  score: number,
  tradesCount: number,
  base: number = DEFAULT_THRESHOLDS.sampleCorrectionBase
): number {
  const correction = Math.min(1, tradesCount / base);
  return score * correction;
}

/**
 * 生成 Trader 标签
 */
export function generateTags(stats: TraderStats): string[] {
  const tags: string[] = [];

  // 鲸鱼：成交量 > 10000
  if (stats.volumeUSDC > 10000) tags.push("whale");

  // 高 ROI
  if (stats.roi > 50) tags.push("high-roi");

  // 稳定盈利：胜率 > 60%
  if (stats.winRate > 60) tags.push("consistent");

  // 高频交易
  if (stats.tradesCount > 100) tags.push("active");

  // 多市场
  if (stats.marketsCount > 20) tags.push("diversified");

  // 盈利
  if (stats.realizedPnL > 0) tags.push("profitable");

  return tags;
}

/**
 * 批量评分并排序
 * @returns 按 score 降序排列的 ScoredTrader[]
 */
export function scoreTraders(
  stats: TraderStats[],
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoredTrader[] {
  // 过滤合格的 Trader
  const qualified = filterQualifiedTraders(stats, thresholds);

  if (qualified.length === 0) return [];

  // 提取指标数组
  const rois = qualified.map((s) => s.roi);
  const winRates = qualified.map((s) => s.winRate);
  const volumes = qualified.map((s) => Math.log(1 + s.volumeUSDC));

  // 归一化
  const normRois = normalizeArray(rois);
  const normWinRates = normalizeArray(winRates);
  const normVolumes = normalizeArray(volumes);

  // 计算分数
  const scored: ScoredTrader[] = qualified.map((s, i) => {
    const rawScore =
      weights.roiWeight * normRois[i] +
      weights.winRateWeight * normWinRates[i] +
      weights.volumeWeight * normVolumes[i];

    const score = applySampleCorrection(
      rawScore,
      s.tradesCount,
      thresholds.sampleCorrectionBase
    );

    const tags = generateTags(s);

    return { ...s, score, tags };
  });

  // 按 score 降序排序
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * 获取 Top N Smart Traders
 */
export function getTopTraders(
  stats: TraderStats[],
  limit: number = 50,
  thresholds?: ScoringThresholds,
  weights?: ScoringWeights
): ScoredTrader[] {
  const scored = scoreTraders(stats, thresholds, weights);
  return scored.slice(0, limit);
}
