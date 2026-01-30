/**
 * Fills 标准化层类型定义
 * 用于会计友好的成交记录
 */

/** 标准化成交记录 */
export interface Fill {
  address: string;
  marketId: string;
  outcomeSide: "YES" | "NO";
  sharesDelta: number;      // BUY > 0, SELL < 0
  cashDeltaUSDC: number;    // BUY < 0, SELL > 0
  price: number;
  timestamp: number;        // block_number 作为时间戳
  txHash: string;
  logIndex: number;
  role: "maker" | "taker";
}

/** Position 状态 */
export interface PositionState {
  address: string;
  marketId: string;
  outcomeSide: "YES" | "NO";
  positionShares: number;
  avgCost: number;
  realizedPnL: number;
  totalBuyCost: number;
  totalBuyShares: number;
  totalSellProceeds: number;
  totalSellShares: number;
}

/** Trader 统计 */
export interface TraderStats {
  address: string;
  tradesCount: number;
  marketsCount: number;
  volumeUSDC: number;
  realizedPnL: number;
  totalBuyCost: number;
  roi: number;
  closedMarketsCount: number;
  winMarketsCount: number;
  winRate: number;
}

/** Smart Trader 评分 */
export interface ScoredTrader extends TraderStats {
  score: number;
  tags: string[];
}

/** 跟单信号 */
export interface Signal {
  id: string;
  address: string;
  marketId: string;
  outcomeSide: "YES" | "NO";
  netUSDC: number;
  timestamp: number;
  createdAt: string;
}
