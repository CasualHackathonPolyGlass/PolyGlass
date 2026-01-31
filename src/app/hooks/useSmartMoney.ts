"use client";

import { useEffect, useState } from "react";
import type { ScoredTrader } from "@/types/fills";

/** 兼容旧版接口的类型定义 */
export interface SmartMoneyEntry {
  address: string;
  totalPnl: number;
  realizedPnl: number;
  roi: number;
  winRate: number;
  tradeCount: number;
  marketCount: number;
  tags: string[];
  labels: string[];
  score?: number;
  // Retail 相关字段
  hasDeposit?: boolean;
  netDepositUSDC?: number;
  originType?: "EOA" | "CONTRACT" | "PROXY";
  isRelayer?: boolean;
}

type SortField = "score" | "roi" | "winRate" | "volume" | "realizedPnL";
type ViewMode = "all" | "retail";

interface UseSmartMoneyOptions {
  sortBy?: SortField | string;
  order?: "asc" | "desc";
  limit?: number;
  view?: ViewMode;
}

/** API 响应类型（带 labels） */
interface SmartMoneyApiResponse extends ScoredTrader {
  labels: string[];
}

/**
 * 将新 API 响应转换为兼容旧版的格式
 */
function toSmartMoneyEntry(trader: SmartMoneyApiResponse): SmartMoneyEntry {
  return {
    address: trader.address,
    totalPnl: trader.realizedPnL,
    realizedPnl: trader.realizedPnL,
    roi: trader.roi,
    winRate: trader.winRate,
    tradeCount: trader.tradesCount,
    marketCount: trader.marketsCount,
    tags: trader.tags,
    labels: trader.labels || [],
    score: trader.score,
    hasDeposit: trader.hasDeposit,
    netDepositUSDC: trader.netDepositUSDC,
    originType: trader.originType,
    isRelayer: trader.isRelayer,
  };
}

/**
 * 获取 Smart Money 排行榜 Hook
 */
export function useSmartMoney(options: UseSmartMoneyOptions = {}) {
  const [data, setData] = useState<SmartMoneyEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { sortBy = "score", limit = 100, view = "retail" } = options;

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      sort: sortBy,
      limit: String(limit),
      view: view,
    });

    fetch(`/api/smart-money?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        const entries = (json.data as SmartMoneyApiResponse[]).map(toSmartMoneyEntry);
        setData(entries);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sortBy, limit, view]);

  return { data, loading, error };
}
