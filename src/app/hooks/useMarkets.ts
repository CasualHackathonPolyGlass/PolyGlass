"use client";

import { useEffect, useState } from "react";
import type { Market, Event } from "@/types/market";

/** API 响应结构 */
interface MarketsResponse {
  data: Market[];
  events: Event[];
  tokenMap: Record<string, { marketId: string; outcome: "YES" | "NO" }>;
}

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/markets")
      .then((res) => res.json())
      .then((json: MarketsResponse) => {
        setMarkets(json.data);
        setEvents(json.events);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { markets, events, loading, error };
}
