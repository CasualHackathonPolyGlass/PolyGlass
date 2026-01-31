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
        setMarkets(json.data);
        setEvents(json.events);
        setMarketEvents(json.marketEvents);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { markets, events, marketEvents, loading, error };
}
