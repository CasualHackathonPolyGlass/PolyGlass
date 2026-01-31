"use client";

import { ExternalLink } from "lucide-react";
import type { Market } from "@/types/market";
import { VolumeBar } from "./volume-bar";
import { TwoSidePriceBar } from "./two-side-price-bar";

interface OutcomeRowProps {
  market: Market;
  eventSlug: string;
  outcomeMaxVolume: number;
  outcomeMaxOI: number;
}

/** 格式化金额 */
function formatMoney(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function OutcomeRow({ market, eventSlug, outcomeMaxVolume, outcomeMaxOI }: OutcomeRowProps) {
  const openInterest = market.volume * 0.6;
  const priceNo = 1 - market.priceYes;
  const hasVolume = market.volume > 0;
  const hasOI = openInterest > 0;

  // 获取 outcome 名称，默认 No/Yes
  const [outcome0, outcome1] = market.outcomes ?? ["No", "Yes"];

  return (
    <tr className="bg-white/[0.03] text-xs transition hover:bg-white/[0.05]">
      {/* 1. 展开列占位（缩进） */}
      <td className="pl-6 py-2"></td>

      {/* 2. Market 列 */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {market.image && (
            <img src={market.image} alt="" className="h-5 w-5 rounded-full object-cover" />
          )}
          <a
            href={`https://polymarket.com/event/${eventSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex items-center gap-1 text-white/80 hover:text-blue-400 transition"
          >
            <span className="truncate max-w-[180px]">{market.title}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition flex-shrink-0" />
          </a>
        </div>
      </td>

      {/* 3. Price 列 - 双向价格柱状图 */}
      <td className="px-3 py-2">
        <div className="min-w-[220px]">
          <TwoSidePriceBar
            yes={market.priceYes}
            no={priceNo}
            labelYes={outcome1}
            labelNo={outcome0}
          />
        </div>
      </td>

      {/* 4. Source 列 */}
      <td className="px-3 py-2">
        <span className="rounded bg-purple-500/20 px-2 py-0.5 text-purple-300">Polymarket</span>
      </td>

      {/* 5. Volume 列 */}
      <td className="px-3 py-2 text-right">
        {hasVolume ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-white/60">{formatMoney(market.volume)}</span>
            <div className="w-20">
              <VolumeBar value={market.volume} denom={outcomeMaxVolume} />
            </div>
          </div>
        ) : (
          <span className="text-white/40">—</span>
        )}
      </td>

      {/* 6. Open Interest 列 */}
      <td className="px-3 py-2 text-right">
        {hasOI ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-white/60">{formatMoney(openInterest)}</span>
            <div className="w-20">
              <VolumeBar value={openInterest} denom={outcomeMaxOI} />
            </div>
          </div>
        ) : (
          <span className="text-white/40">—</span>
        )}
      </td>

      {/* 7-9. 占位列 */}
      <td className="py-2"></td>
      <td className="py-2"></td>
      <td className="py-2"></td>
    </tr>
  );
}
