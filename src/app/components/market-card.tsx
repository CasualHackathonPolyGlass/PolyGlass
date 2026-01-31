"use client";

import Link from "next/link";
import type { Market } from "@/types/market";

interface MarketCardProps {
  market: Market;
}

/** 格式化交易量 */
function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

/** 格式化结束时间 */
function formatEndDate(endDate?: string): string {
  if (!endDate) return "-";
  const date = new Date(endDate);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (days > 0) return `${days}d`;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h`;

  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m`;
}

export function MarketCard({ market }: MarketCardProps) {
  const yesPercent = Math.round(market.priceYes * 100);

  return (
    <Link
      href={`https://polymarket.com/event/${market.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10"
    >
      {/* 标题 */}
      <h4 className="line-clamp-2 text-sm font-medium text-white group-hover:text-teal-100">
        {market.title}
      </h4>

      {/* Volume & Ends */}
      <div className="mt-3 flex items-center gap-4 text-xs text-white/50">
        <div className="flex items-center gap-1">
          <span>Vol</span>
          <span className="font-medium text-white/70">{formatVolume(market.volume)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Ends</span>
          <span className="font-medium text-white/70">{formatEndDate(market.endDate)}</span>
        </div>
      </div>

      {/* Yes 概率进度条 */}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-indigo-500"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
        <span className="w-10 text-right text-sm font-semibold text-white">
          {yesPercent}%
        </span>
      </div>
    </Link>
  );
}

interface MarketCardListProps {
  markets: Market[];
  maxItems?: number;
}

/** 市场卡片列表 */
export function MarketCardList({ markets, maxItems = 8 }: MarketCardListProps) {
  const displayMarkets = markets.slice(0, maxItems);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {displayMarkets.map((market) => (
        <MarketCard key={market.marketId} market={market} />
      ))}
    </div>
  );
}
