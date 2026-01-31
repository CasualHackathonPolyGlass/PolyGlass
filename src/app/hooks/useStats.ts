"use client";

import { useEffect, useState } from "react";

interface StatsData {
  totalTrades: number;
  totalVolume: number;
  activeTraders: number;
  activeMarkets: number;
}

interface StatCard {
  label: string;
  value: string;
  change: number;
  badge?: string;
  hint?: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function useStats() {
  const [data, setData] = useState<StatCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((json) => {
        const s: StatsData = json.data;
        setData([
          {
            label: "Total Volume(24H)",
            value: formatUsd(s.totalVolume),
            change: 0,
            badge: "Live",
            hint: "Aggregated across all Polymarket markets",
          },
          {
            label: "Total Trades(24H)",
            value: formatNumber(s.totalTrades),
            change: 0,
            badge: "On-chain",
            hint: "OrderFilled events on Polygon",
          },
          {
            label: "Active Markets",
            value: formatNumber(s.activeMarkets),
            change: 0,
            badge: "New",
            hint: "Markets with recorded trades",
          },
          {
            label: "Unique Traders(24H)",
            value: formatNumber(s.activeTraders),
            change: 0,
            badge: "Growth",
            hint: "Distinct maker/taker addresses",
          },
        ]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
