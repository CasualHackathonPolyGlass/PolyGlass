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
  score?: number;
}

type SortField = "score" | "roi" | "winRate" | "volume" | "realizedPnL";

interface UseSmartMoneyOptions {
  sortBy?: SortField | string;
  order?: "asc" | "desc";
  limit?: number;
}

/**
 * 将新 API 响应转换为兼容旧版的格式
 */
function toSmartMoneyEntry(trader: ScoredTrader): SmartMoneyEntry {
  return {
    address: trader.address,
    totalPnl: trader.realizedPnL,
    realizedPnl: trader.realizedPnL,
    roi: trader.roi,
    winRate: trader.winRate,
    tradeCount: trader.tradesCount,
    marketCount: trader.marketsCount,
    tags: trader.tags,
    score: trader.score,
  };
}

/**
 * 获取 Smart Money 排行榜 Hook
 */
export function useSmartMoney(options: UseSmartMoneyOptions = {}) {
  const [data, setData] = useState<SmartMoneyEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { sortBy = "score", limit = 100 } = options;

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      sort: sortBy,
      limit: String(limit),
    });

    fetch(`/api/smart-money?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        const entries = (json.data as ScoredTrader[]).map(toSmartMoneyEntry);
        setData(entries);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sortBy, limit]);

  return { data, loading, error };
}
