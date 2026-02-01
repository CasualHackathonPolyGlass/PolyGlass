/**
 * Trader Profile 类型定义
 * 用于从 Polymarket Data API 获取的交易员画像数据
 */

/** 交易员摘要信息 */
export interface TraderProfileSummary {
  address: string;
  // Polymarket API 核心统计
  positionsValue: number | null;
  predictions: number | null;
  pnl: number | null;
  biggestWin: number | null;
  winRate: number | null;
  // 计算统计
  tradeCount: number | null;
  totalVolume: number | null;
  firstTrade: string | null;
  lastTrade: string | null;
  activeDays: number | null;
  whaleLevel: WhaleLevel | null;
  maxTradeValue: number;
  maxMarketVolume: number;
  // 用户资料
  displayUsernamePublic?: boolean | null;
  name?: string | null;
  pseudonym?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  xUsername?: string | null;
  verifiedBadge?: boolean | null;
  proxyWallet?: string | null;
  dataPartial?: boolean;
}

/** 鲸鱼等级 */
export type WhaleLevel = "whale" | "shark" | "dolphin" | "fish";

/** 等级信息 */
export interface WhaleLevelInfo {
  level: WhaleLevel;
  emoji: string;
  label: string;
  color: string;
  description: string;
}

/** 交易员行为统计 */
export interface TraderProfileStats {
  buyCount: number;
  sellCount: number;
  buyVolume: number;
  sellVolume: number;
  yesPreference: number;
  avgTradeSize: number;
  categories: Record<string, number>;
  hourlyDistribution: number[];
}

/** 持仓信息 */
export interface TraderPosition {
  proxyWallet?: string | null;
  asset?: string | null;
  conditionId?: string | null;
  size?: number | null;
  avgPrice?: number | null;
  initialValue?: number | null;
  currentValue?: number | null;
  cashPnl?: number | null;
  percentPnl?: number | null;
  totalBought?: number | null;
  realizedPnl?: number | null;
  percentRealizedPnl?: number | null;
  curPrice?: number | null;
  redeemable?: boolean | null;
  mergeable?: boolean | null;
  title?: string | null;
  slug?: string | null;
  icon?: string | null;
  eventSlug?: string | null;
  outcome?: string | null;
  outcomeIndex?: number | null;
  oppositeOutcome?: string | null;
  oppositeAsset?: string | null;
  endDate?: string | null;
  negativeRisk?: boolean | null;
}

/** 持仓响应 */
export interface TraderPositionsResponse {
  positions: TraderPosition[];
  summary: {
    totalPositions: number;
    totalValue: number;
    totalUnrealizedPnl: number;
  };
}

/** 交易记录 */
export interface TraderTrade {
  proxyWallet?: string | null;
  side?: string | null;
  asset?: string | null;
  conditionId?: string | null;
  size?: number | null;
  price?: number | null;
  timestamp?: number | null;
  title?: string | null;
  slug?: string | null;
  icon?: string | null;
  eventSlug?: string | null;
  outcome?: string | null;
  outcomeIndex?: number | null;
  transactionHash?: string | null;
  usdValue?: number | null;
}

/** 交易记录响应 */
export interface TraderTradesResponse {
  trades: TraderTrade[];
  hasMore: boolean;
  offset: number;
  limit: number;
}

/** PnL 数据点 */
export interface PnLDataPoint {
  timestamp: number;
  pnl: number;
}

/** PnL 历史响应 */
export interface PnLHistoryResponse {
  dataPoints: PnLDataPoint[];
  totalPnl: number | null;
  period: string;
}

/** 完整的交易员画像数据 */
export interface TraderProfileData {
  summary: TraderProfileSummary;
  stats: TraderProfileStats | null;
  positions: TraderPositionsResponse | null;
}

/** API 响应 */
export interface TraderProfileApiResponse {
  data: TraderProfileData | null;
  error?: string;
}
