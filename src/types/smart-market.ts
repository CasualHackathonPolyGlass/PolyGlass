/**
 * Smart Money Events & Markets 类型定义
 */

/** Smart Money 统计 */
export interface SmartMoneyStats {
  totalVolume: number;
  yesVolume: number;
  noVolume: number;
  yesCount: number;
  noCount: number;
  yesOiShare: number; // YES 持仓占比 (0-1)
  noOiShare: number;  // NO 持仓占比 (0-1)
}

/** Event 带 Smart Money 统计 */
export interface SmartMoneyEvent {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  endDate: string | null;
  active: number;
  marketCount: number;
  totalVolume: number;
  smartMoneyStats: SmartMoneyStats;
}

/** Smart Money 持仓者 */
export interface SmartMoneyHolder {
  address: string;
  outcome: "YES" | "NO";
  amount: number;
  avgPrice: number;
  winRate: number;
  score: number;
  tags: string[];
}

/** Market 带 Smart Money 统计 */
export interface SmartMoneyMarket {
  id: string;
  title: string;
  tradeCount: number;
  volume: number;
  smartMoneyStats: SmartMoneyStats;
}

/** Event 详情（含 Markets） */
export interface SmartMoneyEventDetail {
  event: SmartMoneyEvent;
  markets: SmartMoneyMarket[];
}
