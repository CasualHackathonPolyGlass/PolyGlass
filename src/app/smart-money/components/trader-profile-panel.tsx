"use client";

import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Target, Wallet, BarChart3,
  Trophy, Calendar, ExternalLink, Copy, X,
} from "lucide-react";
import type { TraderProfileData, WhaleLevel } from "@/types/trader-profile";

// ─── 鲸鱼等级配置 ───

const WHALE_LEVELS: Record<WhaleLevel, { emoji: string; label: string; color: string }> = {
  whale: { emoji: "\u{1F40B}", label: "Whale", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  shark: { emoji: "\u{1F988}", label: "Shark", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  dolphin: { emoji: "\u{1F42C}", label: "Dolphin", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  fish: { emoji: "\u{1F41F}", label: "Fish", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
};

// ─── 工具函数 ───

function formatUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── 子组件 ───

function StatCard({ icon: Icon, label, value, color = "text-white", sub }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400/20 to-indigo-500/20">
        <Icon className="h-5 w-5 text-teal-300" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/50">{label}</p>
        <p className={`text-lg font-semibold ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-white/30">{sub}</p>}
      </div>
    </div>
  );
}

function CategoryBar({ name, volume, maxVolume }: { name: string; volume: number; maxVolume: number }) {
  const pct = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 truncate text-white/60">{name}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-teal-500/60" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-white/50">{formatUsd(volume)}</span>
    </div>
  );
}

// ─── 主组件 ───

interface TraderProfilePanelProps {
  data: TraderProfileData;
  onClose: () => void;
}

export function TraderProfilePanel({ data, onClose }: TraderProfilePanelProps) {
  const { summary: s, stats, positions } = data;
  const level = s.whaleLevel ? WHALE_LEVELS[s.whaleLevel] : null;
  const pnlColor = (s.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400";
  const displayName = s.displayUsernamePublic && s.name ? s.name : shortenAddress(s.address);

  const topCategories = useMemo(() => {
    if (!stats?.categories) return [];
    return Object.entries(stats.categories).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [stats]);

  const maxCategoryVolume = topCategories[0]?.[1] ?? 0;

  const buyPct = stats
    ? (stats.buyVolume + stats.sellVolume > 0
      ? (stats.buyVolume / (stats.buyVolume + stats.sellVolume)) * 100
      : 0)
    : 0;

  const openPositions = positions?.positions.filter((p) => (p.size ?? 0) > 0).slice(0, 5) ?? [];

  return (
    <div className="space-y-5 rounded-xl border border-white/10 bg-white/[0.03] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-white/60">
            {s.profileImage
              ? <img src={s.profileImage} alt="" className="h-full w-full rounded-full object-cover" />
              : displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{displayName}</h3>
              {level && (
                <span className={`rounded-full border px-2 py-0.5 text-xs ${level.color}`}>
                  {level.emoji} {level.label}
                </span>
              )}
              {s.verifiedBadge && <span className="text-xs text-emerald-400">Verified</span>}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className="font-mono">{shortenAddress(s.address)}</span>
              <button
                onClick={() => navigator.clipboard.writeText(s.address)}
                className="text-white/30 hover:text-white/60"
              >
                <Copy className="h-3 w-3" />
              </button>
              <a
                href={`https://polygonscan.com/address/${s.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white/60"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Wallet} label="Positions Value" value={s.positionsValue != null ? formatUsd(s.positionsValue) : "-"} />
        <StatCard icon={TrendingUp} label="Profit/Loss" value={s.pnl != null ? `${s.pnl >= 0 ? "+" : ""}${formatUsd(s.pnl)}` : "-"} color={pnlColor} sub="All-Time" />
        <StatCard icon={Target} label="Win Rate" value={s.winRate != null ? `${s.winRate}%` : "-"} color={s.winRate != null ? (s.winRate >= 50 ? "text-emerald-400" : "text-amber-400") : "text-white"} />
        <StatCard icon={Trophy} label="Biggest Win" value={s.biggestWin != null && s.biggestWin > 0 ? formatUsd(s.biggestWin) : "-"} color="text-emerald-400" />
        <StatCard icon={BarChart3} label="Markets Traded" value={s.predictions != null ? s.predictions.toLocaleString() : "-"} />
        <StatCard icon={Calendar} label="Active Days" value={s.activeDays != null ? String(s.activeDays) : "-"} />
      </div>

      {/* Trading Patterns */}
      {stats && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-white/70">Trading Patterns</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Buy vs Sell */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-white/50">Buy vs Sell</p>
              <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                <span>Buy {formatUsd(stats.buyVolume)}</span>
                <span>Sell {formatUsd(stats.sellVolume)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full bg-emerald-500/60" style={{ width: `${buyPct}%` }} />
              </div>
            </div>
            {/* YES Preference */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-white/50">YES Preference</p>
              <p className="mt-2 text-xl font-semibold text-white">{(stats.yesPreference * 100).toFixed(1)}%</p>
            </div>
          </div>

          {/* Top Categories */}
          {topCategories.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs text-white/50">Top Categories</p>
              <div className="space-y-1.5">
                {topCategories.map(([name, vol]) => (
                  <CategoryBar key={name} name={name} volume={vol} maxVolume={maxCategoryVolume} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Positions */}
      {openPositions.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-white/70">
            Open Positions ({positions?.summary.totalPositions ?? 0})
          </h4>
          <div className="space-y-2">
            {openPositions.map((pos) => (
              <div key={`${pos.conditionId}-${pos.outcome}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      pos.outcomeIndex === 0 || pos.outcome?.toUpperCase() === "YES"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}>
                      {pos.outcome ?? "-"}
                    </span>
                    <span className="max-w-[200px] truncate text-white/80">{pos.title ?? pos.slug ?? "-"}</span>
                  </div>
                  <span className={`font-mono text-xs ${
                    (pos.cashPnl ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {pos.cashPnl != null ? `${pos.cashPnl >= 0 ? "+" : ""}${formatUsd(pos.cashPnl)}` : "-"}
                  </span>
                </div>
                <div className="mt-1 flex gap-4 text-[10px] text-white/30">
                  <span>Qty: {(pos.size ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span>Avg: ${(pos.avgPrice ?? 0).toFixed(2)}</span>
                  <span>Now: ${(pos.curPrice ?? 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
