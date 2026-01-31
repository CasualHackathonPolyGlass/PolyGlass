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

        // For Real-time Polymarket: We want variety to distinguish from Heatmap/Trending (which use Top Volume).
        // Strategy: 
        // 1. Filter for markets with > $100k volume
        // 2. Filter out markets with Odds exactly 50% or 100% (likely stale or settled)
        // 3. Shuffle randomly
        const qualifiedMarkets = marketData.filter(m => {
          const vol = Number(m.volume) || 0;
          // Check if odds are exactly 0.5 (50%) or 1 (100%) or 0 (0%)
           // Using a small epsilon for float comparison if needed, but priceYes usually comes as precision.
           // Let's filter out exactly 0.5 and 1.
           const price = m.priceYes;
           // Filter out 50% (stale), near 100% (settled YES), and near 0% (settled NO)
           const isStaleOdds = price === 0.5 || price >= 0.99 || price <= 0.01;
           
           return vol > 100000 && !isStaleOdds;
        });
        
        // If we don't have enough qualified markets, fallback to all markets to ensure UI doesn't break
        const sourcePool = qualifiedMarkets.length >= 8 ? qualifiedMarkets : marketData;
        
        const shuffledMarkets = [...sourcePool].sort(() => 0.5 - Math.random());

        setMarkets(shuffledMarkets);
        setEvents(json.events);
        setMarketEvents(json.marketEvents);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

return { markets, events, marketEvents, loading, error };
}
