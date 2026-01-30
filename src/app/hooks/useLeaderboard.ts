"use client";

import { useEffect, useState } from "react";

interface LeaderboardEntry {
  address: string;
  totalPnl: number;
  realizedPnl: number;
  roi: number;
  winRate: number;
  tradeCount: number;
  marketCount: number;
  tags: string[];
}

interface TraderFeedItem {
  trader: string;
  pnl: string;
  market: string;
  timeframe: string;
}

function formatUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

export function useLeaderboard(limit = 5) {
  const [data, setData] = useState<TraderFeedItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/leaderboard?limit=${limit}`)
      .then((res) => res.json())
      .then((json) => {
        const entries: LeaderboardEntry[] = json.data;
        setData(
          entries.map((e) => ({
            trader: shortenAddress(e.address),
            pnl: formatUsd(e.realizedPnl),
            market: `${e.marketCount} markets`,
            timeframe: `${e.winRate}% win`,
          }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [limit]);

  return { data, loading, error };
}
