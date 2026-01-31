
"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { Market } from "@/types/market";
import { ArrowUpRight, Maximize2 } from "lucide-react";

interface MarketHeatmapProps {
  markets: Market[] | null;
  loading: boolean;
}

const COLORS = {
  positive: ["#10B981", "#059669", "#047857"], // Emerald 500, 600, 700
  negative: ["#EF4444", "#DC2626", "#B91C1C"], // Red 500, 600, 700
  neutral: "#6B7280", // Gray 500
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-sm shadow-xl backdrop-blur-md">
        <p className="font-semibold text-white">{data.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-white/60">Vol:</span>
          <span className="font-mono text-white">${(data.realVolume / 1000000).toFixed(2)}M</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60">24h:</span>
          <span className={`font-mono ${data.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {data.change > 0 ? "+" : ""}
            {typeof data.change === 'number' ? data.change.toFixed(2) : '0.00'}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomizedContent = (props: any) => {
  const { root, depth, x, y, width, height, index, payload, colors, rank, name, value, change, realVolume, image } = props; // Destructure image

  // Ensure change is a valid number
  const safeChange = typeof change === 'number' ? change : 0;

  const isPositive = safeChange >= 0;
  const colorBase = isPositive ? COLORS.positive : COLORS.negative;
  // Simple shade variation based on magnitude of change
  const intensity = Math.min(Math.abs(safeChange) / 10, 1); // Cap at 10% change
  const colorIndex = intensity < 0.3 ? 0 : intensity < 0.7 ? 1 : 2;
  const fillColor = colorBase[colorIndex];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillColor,
          stroke: "#111", // Darker border for better separation
          strokeWidth: 2, // Thicker border
          strokeOpacity: 0.5,
        }}
        className="transition-all hover:brightness-110"
      />
      {width > 40 && height > 25 && (
        <foreignObject x={x} y={y} width={width} height={height}>
          <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden p-0.5 text-center">
            {/* Logo Image */}
            {image && width > 50 && height > 50 && (
              <img
                src={image}
                alt=""
                className="mb-1 h-6 w-6 rounded-full object-cover shadow-sm"
                style={{ opacity: 0.9 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}

            <span
              className={`line-clamp-2 font-bold text-white drop-shadow-md ${width > 100 ? 'text-base' : width > 60 ? 'text-sm' : 'text-[10px]'
                }`}
              style={{ lineHeight: '1.1' }}
            >
              {name.split(" ")[0]} {/* Show first word/symbol */}
            </span>
            <span className={`mt-0.5 font-medium text-white/90 drop-shadow-sm ${width > 100 ? 'text-sm' : 'text-[9px]'
              }`}>
              {safeChange > 0 ? "+" : ""}
              {safeChange.toFixed(1)}%
            </span>
            {height > 60 && width > 60 && (
              <span className="mt-0.5 text-[9px] text-white/70">
                ${(realVolume / 1000000).toFixed(1)}M
              </span>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

export function MarketHeatmap({ markets, loading }: MarketHeatmapProps) {
  // Transform markets into heatmap data
  const data = useMemo(() => {
    if (!markets) return [];

    // Filter top 20 markets by volume
    const topMarkets = [...markets]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 20);

    // Mock category grouping (since we don't have categories in simple Market type yet, we put them all in one 'All' bucket or guess)
    // For heatmap, we usually group by category. Let's create a flat list for now or mock categories.
    // To match CoinGlass, it's usually just tiles.

    return topMarkets.map((m, i) => ({
      name: m.title,
      // Apply exponential weight to volume to make size differences more pronounced visually
      // Adding rank bias to ensure top markets are significantly larger
      value: Math.pow(m.volume, 1.2) * (1 + (20 - i) * 0.1),
      realVolume: m.volume,
      image: m.image, // Pass image to data
      // Mock change 24h between -15% and +15%
      change: (Math.random() * 30) - 15,
    }));
  }, [markets]);

  if (loading || !markets) {
    return (
      <div className="h-[400px] w-full animate-pulse rounded-2xl bg-white/5" />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Market Overview</p>
          <h3 className="text-xl font-semibold text-white">Heatmap (24h)</h3>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition">
            Volume
          </button>
          <button className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/10 transition">
            Gainers
          </button>
        </div>
      </div>

      <div className="h-[400px] w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#fff"
            content={<CustomizedContent />}
            animationDuration={800}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
