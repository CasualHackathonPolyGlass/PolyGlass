"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { Market } from "@/types/market";

interface MarketRowProps {
  market: Market;
  maxVolume: number;
  maxOpenInterest: number;
}

/** 格式化金额 */
function formatMoney(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/** 格式化日期 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function MarketRow({ market, maxVolume, maxOpenInterest }: MarketRowProps) {
  const openInterest = market.volume * 0.6;
  const volumePercent = maxVolume > 0 ? (market.volume / maxVolume) * 100 : 0;
  const oiPercent = maxOpenInterest > 0 ? (openInterest / maxOpenInterest) * 100 : 0;

  return (
    <tr className="group transition hover:bg-white/5">
      <td className="px-3 py-3">
        <button className="flex h-5 w-5 items-center justify-center rounded text-white/30 hover:bg-white/10 hover:text-white">
          <Plus className="h-3 w-3" />
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          {market.image && (
            <img
              src={market.image}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <Link
            href={`https://polymarket.com/event/${market.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-[280px] truncate text-blue-400 hover:underline"
          >
            {market.title}
          </Link>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
            Polymarket
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <span className="font-medium text-white">{formatMoney(market.volume)}</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${volumePercent}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <span className="font-medium text-white">{formatMoney(openInterest)}</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${oiPercent}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-white/70">
        {formatDate(market.endDate)}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70">
            Politics
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-white/50">
        <span className="max-w-[150px] truncate text-xs">
          {market.title.slice(0, 20)}...
        </span>
      </td>
    </tr>
  );
}
