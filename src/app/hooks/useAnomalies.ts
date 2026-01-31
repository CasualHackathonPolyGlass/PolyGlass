import { useMemo } from "react";
import type { Event, Market, MarketEvent } from "@/types/market";

export type AnomalyType = "price" | "volume";

export interface AnomalyItem {
  market: Market;
  event?: Event;
  type: AnomalyType;
  priceChangePct?: number; // 以百分比展示（正负）
  volumeSpike?: number;    // 相对系数，例如 3.2 表示 3.2x
}

interface Params {
  markets: Market[] | null;
  events: Event[] | null;
  marketEvents: MarketEvent[] | null;
  loading: boolean;
  maxItems?: number;
}

const PRICE_SWING_THRESHOLD = 0.3;   // |priceYes-0.5| >= 0.3 即 >= 80% 或 <=20%
const PRICE_MIN_VOLUME = 50_000;
const TOP_VOLUME_COUNT = 8;
const TOP_VOLUME_FLOOR = 200_000;

export function useAnomalies({ markets, events, marketEvents, loading, maxItems = 6 }: Params) {
  const anomalies = useMemo<AnomalyItem[]>(() => {
    if (loading || !markets || markets.length === 0) return [];

    const eventMap = new Map(events?.map((e) => [e.id, e]));
    const marketToEvent = new Map<string, Event | undefined>();
    if (marketEvents) {
      for (const rel of marketEvents) {
        if (!marketToEvent.has(rel.marketId)) {
          marketToEvent.set(rel.marketId, eventMap.get(rel.eventId));
        }
      }
    }

    const activeMarkets = markets.filter((m) => m.active);

    // 价格异动：赔率极端 + 有一定成交量
    const priceSwingMarkets = activeMarkets.filter((m) =>
      Math.abs(m.priceYes - 0.5) >= PRICE_SWING_THRESHOLD && m.volume >= PRICE_MIN_VOLUME
    );

    // 量能异动：全站成交量前 TOP_VOLUME_COUNT，且达最低门槛
    const topByVolume = [...activeMarkets]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, TOP_VOLUME_COUNT)
      .filter((m) => m.volume >= TOP_VOLUME_FLOOR);

    const picked = new Set<string>();
    const results: AnomalyItem[] = [];

    for (const m of priceSwingMarkets) {
      if (picked.has(m.marketId)) continue;
      const pct = Math.round((m.priceYes - 0.5) * 200); // 0.5->0, 1->100, 0->-100
      results.push({
        market: m,
        event: marketToEvent.get(m.marketId),
        type: "price",
        priceChangePct: pct,
      });
      picked.add(m.marketId);
    }

    for (const m of topByVolume) {
      if (picked.has(m.marketId)) continue;
      const topVolume = topByVolume[0]?.volume || 1;
      const spike = topVolume > 0 ? m.volume / topVolume : 1;
      results.push({
        market: m,
        event: marketToEvent.get(m.marketId),
        type: "volume",
        volumeSpike: spike,
      });
      picked.add(m.marketId);
    }

    return results
      .sort((a, b) => b.market.volume - a.market.volume)
      .slice(0, maxItems);
  }, [events, loading, marketEvents, markets, maxItems]);

  return { anomalies, loading };
}
