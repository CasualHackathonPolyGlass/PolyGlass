"use client";

import { useEffect, useState } from "react";
import type { Market, Event, MarketEvent } from "@/types/market";

/** API 响应结构 */
interface MarketsResponse {
  data: Market[];
  events: Event[];
  marketEvents: MarketEvent[];
  tokenMap: Record<string, { marketId: string; outcome: "YES" | "NO" }>;
}

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [marketEvents, setMarketEvents] = useState<MarketEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/markets")
      .then((res) => res.json())
      .then((json: MarketsResponse) => {
        // Ensure data exists and is an array
        const marketData = Array.isArray(json.data) ? json.data : [];

        // 返回完整的市场数据，不做随机打乱
        // 随机选择逻辑由调用方（如主页）自行处理
        setMarkets(marketData);
        setEvents(json.events);
        setMarketEvents(json.marketEvents);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

return { markets, events, marketEvents, loading, error };
}
