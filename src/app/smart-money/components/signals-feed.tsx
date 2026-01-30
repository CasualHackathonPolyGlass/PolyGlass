"use client";

import { TrendingUp, Clock, Zap, AlertCircle } from "lucide-react";
import { useSignals } from "@/app/hooks/useSignals";
import type { Signal } from "@/types/fills";

interface SignalsFeedProps {
  onSelectTrader?: (address: string) => void;
}

/** 格式化 USD */
function formatUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** 缩短地址 */
function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** 信号强度标签 */
function signalStrength(netUSDC: number): { label: string; color: string } {
  if (netUSDC >= 5000) return { label: "Strong", color: "bg-emerald-500/20 text-emerald-300" };
  if (netUSDC >= 1000) return { label: "Medium", color: "bg-amber-500/20 text-amber-300" };
  return { label: "Weak", color: "bg-white/10 text-white/60" };
}

/** 单条信号卡片 */
function SignalCard({ signal, onClick }: { signal: Signal; onClick?: () => void }) {
  const strength = signalStrength(signal.netUSDC);

  return (
    <div
      className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400/20 to-indigo-500/20">
            <TrendingUp className="h-4 w-4 text-teal-300" />
          </div>
          <div>
            <span className="font-mono text-sm text-white">{shortenAddress(signal.address)}</span>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
              <span>{signal.marketId.slice(0, 12)}...</span>
            </div>
          </div>
        </div>
        <span className="text-lg font-bold text-teal-400">{formatUsd(signal.netUSDC)}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs ${signal.outcomeSide === "YES" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
          {signal.outcomeSide}
        </span>
        <span className={`rounded px-2 py-0.5 text-xs ${strength.color}`}>
          {strength.label}
        </span>
      </div>
    </div>
  );
}

export function SignalsFeed({ onSelectTrader }: SignalsFeedProps) {
  const { data, loading, error } = useSignals({ window: "24h", limit: 20 });

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Smart Signals</h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/50">
          <Clock className="h-3 w-3" />
          <span>Last 24h</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Signal List */}
      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onClick={() => onSelectTrader?.(signal.address)}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {data && data.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 py-12 text-center">
          <Zap className="mx-auto mb-2 h-8 w-8 text-white/20" />
          <p className="text-sm text-white/40">No signals in the last 24h</p>
        </div>
      )}
    </div>
  );
}
