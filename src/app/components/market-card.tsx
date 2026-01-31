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

export function MarketCard({ market, variant = "default" }: MarketCardProps & { variant?: "default" | "compact" }) {
  const yesPercent = Math.round(market.priceYes * 100);

  if (variant === "compact") {
    return (
      <Link
        href={`https://polymarket.com/event/${market.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10"
      >
        <div className="flex items-start gap-3">
          {market.image ? (
            <img
              src={market.image}
              alt=""
              className="h-8 w-8 flex-shrink-0 rounded-full bg-white/10 object-cover shadow-sm ring-1 ring-white/10"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-teal-400/20 to-indigo-500/20 ring-1 ring-white/10" />
          )}
          <div className="flex flex-col gap-0.5 min-h-[32px] justify-center">
            <h4 className="line-clamp-2 text-sm font-medium leading-tight text-white group-hover:text-teal-100">
              {market.title}
            </h4>
          </div>
        </div>

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

  return (
    <Link
      href={`https://polymarket.com/event/${market.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10"
    >
      {/* 标题 */}
      <div className="flex items-start gap-3">
        {market.image ? (
          <img
            src={market.image}
            alt=""
            className="h-10 w-10 flex-shrink-0 rounded-full bg-white/10 object-cover shadow-sm ring-1 ring-white/10"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-teal-400/20 to-indigo-500/20 ring-1 ring-white/10" />
        )}
        <div className="flex flex-col gap-0.5 min-h-[40px] justify-center">
          <h4 className="line-clamp-2 text-sm font-semibold leading-tight text-white group-hover:text-teal-100">
            {market.title}
          </h4>
        </div>
      </div>

      {/* Volume & Ends */}
      <div className="mt-4 flex items-center justify-between text-xs font-medium text-white/60">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Vol(24H)</span>
          <span className="text-white">{formatVolume(market.volume)}</span>
        </div>
        <div className="flex flex-col gap-0.5 items-end">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Odds</span>
          <span className="text-emerald-400">{yesPercent}%</span>
        </div>
      </div>

      {/* 底部信息区：双向胜率 + 分类标签 */}
      <div className="mt-4 flex flex-col gap-3">
        {/* Progress Bar Container */}
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${yesPercent}%` }}
          />
          <div
            className="h-full bg-rose-500"
            style={{ width: `${100 - yesPercent}%` }}
          />
        </div>

        {/* Info Row: Odds */}
        <div className="flex justify-between text-xs font-medium">
          <span className="text-emerald-400">Yes {yesPercent}%</span>
          <span className="text-rose-400">No {100 - yesPercent}%</span>
        </div>

        {/* Category Tag (Bottom) */}
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-white/60 ring-1 ring-white/10">
            {/* Try to infer category from title keywords or use a generic one */}
            {market.title.toLowerCase().includes("crypto") || market.title.toLowerCase().includes("bitcoin") ? "Crypto" :
              market.title.toLowerCase().includes("trump") || market.title.toLowerCase().includes("biden") ? "Politics" :
                market.title.toLowerCase().includes("nfl") || market.title.toLowerCase().includes("nba") ? "Sports" :
                  "General"}
          </div>
        </div>
      </div>
    </Link>
  );
}

interface MarketCardListProps {
  markets: Market[];
  maxItems?: number;
  className?: string;
  variant?: "default" | "compact";
}

/** 市场卡片列表 */
export function MarketCardList({ markets, maxItems = 8, className, variant = "default" }: MarketCardListProps) {
  const displayMarkets = markets.slice(0, maxItems);

  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${className || ""}`}>
      {displayMarkets.map((market) => (
        <MarketCard key={market.marketId} market={market} variant={variant} />
      ))}
    </div>
  );
}
