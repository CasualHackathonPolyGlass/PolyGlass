/**
 * 市场相关类型定义
 */

/** Gamma API 返回的事件结构 */
export interface GammaEvent {
    id: string;
    title: string;
    slug: string;
    description?: string;
    category?: string;
    endDate?: string;
    active?: boolean;
  }
  
  /** Gamma API 返回的市场原始结构 */
  export interface GammaMarketResponse {
    id: string;
    question: string;
    conditionId: string;
    slug: string;
    clobTokenIds: string | string[]; // Gamma API 返回 JSON 字符串
    outcomes: string | string[];
    outcomePrices: string | string[]; // 价格数组 ["0.5", "0.5"]
    active: boolean;
    volume?: string;
    volumeNum?: number;
    liquidity?: string;
    liquidityNum?: number;
    category?: string;
    endDate?: string;
    image?: string;
    events?: GammaEvent[]; // 市场所属的事件列表
  }
  
  /** 处理后的事件结构 */
  export interface Event {
    id: string;
    title: string;
    slug: string;
    description?: string;
    category?: string;
    endDate?: string;
    active: boolean;
  }
  
  /** 处理后的市场结构 */
  export interface Market {
    marketId: string;
    title: string;
    slug: string;
    conditionId: string;
    tokenYes: string;
    tokenNo: string;
    priceYes: number;
    priceNo: number;
    volume: number;
    liquidity: number;
    tags: string[];
    endDate?: string;
    image?: string;
    outcomes?: [string, string];  // [outcome0, outcome1]，如 ["No", "Yes"] 或 ["Bulls", "Heat"]
    active: boolean;  // 市场是否活跃（未结算）
  }

  /** Outcome (Market 的视图层表示，用于展示在 Event 下) */
  export interface Outcome {
    id: string;
    title: string;
    priceYes: number;
    priceNo: number;
    volume: number;
    openInterest: number;
    slug: string;
    image?: string;
    source: "Polymarket" | "Kalshi" | "Limitless";
    active: boolean;
  }

  /** Event with grouped markets (视图层数据) */
  export interface EventWithMarkets extends Event {
    markets: Market[];
    totalVolume: number;
    totalOpenInterest: number;
  }

  /** 市场与事件的关联 */
  export interface MarketEvent {
    marketId: string;
    eventId: string;
  }
  
  /** Token ID 到市场信息的映射 */
  export interface TokenMapping {
    marketId: string;
    outcome: "YES" | "NO";
  }
  
  /** TokenMap: tokenId -> TokenMapping */
  export type TokenMap = Record<string, TokenMapping>;
  
  /** 市场数据包（含市场列表、事件列表和 TokenMap） */
  export interface MarketData {
    markets: Market[];
    events: Event[];
    marketEvents: MarketEvent[];
    tokenMap: TokenMap;
  }
  