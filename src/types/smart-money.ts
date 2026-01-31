/**
 * Smart Money 系统类型定义
 * 评分配置、API 响应类型
 */
import type { Fill, PositionState, TraderStats, ScoredTrader, Signal } from "./fills";

/** 评分阈值配置 */
export interface ScoringThresholds {
  minTradesCount: number;
  minMarketsCount: number;
  minVolumeUSDC: number;
  sampleCorrectionBase: number;
}

/** 评分权重配置 */
export interface ScoringWeights {
  roiWeight: number;
  winRateWeight: number;
  volumeWeight: number;
}

/** 归一化统计（用于评分计算） */
export interface NormalizedStats {
  normalizedROI: number;
  normalizedWinRate: number;
  normalizedVolume: number;
}

/** 信号生成配置 */
export interface SignalConfig {
  windowHours: number;
  minNetUSDC: number;
}

/** Trader 详情（API 返回） */
export interface TraderDetail extends ScoredTrader {
  positions: PositionState[];
  recentSignals: Signal[];
}

/** Smart Money 列表响应 */
export interface SmartMoneyListResponse {
  data: ScoredTrader[];
  total: number;
  view: SmartMoneyView;
  window: string;
}

/** Trader 详情响应 */
export interface TraderDetailResponse {
  data: TraderDetail | null;
}

/** 信号列表响应 */
export interface SignalsResponse {
  data: Signal[];
  total: number;
  window: string;
}

/** 时间窗口类型 */
export type TimeWindow = "1h" | "6h" | "24h" | "1d" | "7d" | "30d" | "all";

/** Smart Money 视图类型 */
export type SmartMoneyView = "all" | "retail";

/** Retail 过滤配置 */
export interface RetailFilterConfig {
  requireEOA: boolean;
  excludeRelayers: boolean;
  requireDeposit: boolean;
  minNetDepositUSDC: number;
  includeProxyWallet: boolean;
}

/** 排序字段 */
export type SortField = "score" | "roi" | "winRate" | "volume" | "realizedPnL";

/** 排序方向 */
export type SortOrder = "asc" | "desc";

/** API 请求参数 */
export interface SmartMoneyQueryParams {
  view?: SmartMoneyView;
  window?: TimeWindow;
  sort?: SortField;
  order?: SortOrder;
  limit?: number;
}

export interface SignalsQueryParams {
  window?: TimeWindow;
  limit?: number;
}

// 重新导出 fills 类型
export type { Fill, PositionState, TraderStats, ScoredTrader, Signal };
