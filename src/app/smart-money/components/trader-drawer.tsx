"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, TrendingUp, TrendingDown, Target, Wallet, BarChart3 } from "lucide-react";
import type { PositionState, Signal } from "@/types/fills";

interface TraderDetail {
  address: string;
  tradesCount: number;
  marketsCount: number;
  volumeUSDC: number;
  realizedPnL: number;
  roi: number;
  winRate: number;
  closedMarketsCount: number;
  winMarketsCount: number;
  score: number;
  tags: string[];
  positions: PositionState[];
  recentSignals: Signal[];
}

interface TraderDrawerProps {
  address: string | null;
  onClose: () => void;
}

/** 格式化 USD */
function formatUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

/** 缩短地址 */
function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** 标签颜色 */
const TAG_COLORS: Record<string, string> = {
  whale: "bg-blue-500/20 text-blue-300",
  "high-roi": "bg-emerald-500/20 text-emerald-300",
  consistent: "bg-purple-500/20 text-purple-300",
  active: "bg-amber-500/20 text-amber-300",
  diversified: "bg-cyan-500/20 text-cyan-300",
  profitable: "bg-green-500/20 text-green-300",
};

/** 统计项 */
function StatItem({ icon: Icon, label, value, color = "text-white" }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400/20 to-indigo-500/20">
        <Icon className="h-5 w-5 text-teal-300" />
      </div>
      <div>
        <p className="text-xs text-white/50">{label}</p>
        <p className={`text-lg font-semibold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

export function TraderDrawer({ address, onClose }: TraderDrawerProps) {
  const [data, setData] = useState<TraderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/smart-money/${address}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) return null;

  const pnlColor = (data?.realizedPnL ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400";
  const roiColor = (data?.roi ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0a0a0f] p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Trader Details</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-sm text-white/70">{shortenAddress(address)}</span>
              <a
                href={`https://polygonscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200">
            Failed to load trader: {error}
          </div>
        )}

        {/* Content */}
        {data && (
          <div className="space-y-6">
            {/* Tags */}
            {data.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag) => (
                  <span key={tag} className={`rounded-full px-3 py-1 text-sm ${TAG_COLORS[tag] || "bg-indigo-500/20 text-indigo-300"}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <StatItem icon={TrendingUp} label="Realized PnL" value={formatUsd(data.realizedPnL)} color={pnlColor} />
              <StatItem icon={BarChart3} label="ROI" value={`${data.roi > 0 ? "+" : ""}${data.roi.toFixed(1)}%`} color={roiColor} />
              <StatItem icon={Target} label="Win Rate" value={`${data.winRate.toFixed(1)}%`} />
              <StatItem icon={Wallet} label="Volume" value={formatUsd(data.volumeUSDC)} />
            </div>

            {/* Score */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-200">Smart Score</span>
                <span className="text-2xl font-bold text-amber-400">{(data.score * 100).toFixed(0)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-500/20">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${data.score * 100}%` }} />
              </div>
            </div>

            {/* Positions */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-white/70">Open Positions ({data.positions.filter((p) => p.positionShares > 0).length})</h3>
              <div className="space-y-2">
                {data.positions
                  .filter((p) => p.positionShares > 0)
                  .slice(0, 5)
                  .map((pos) => (
                    <div key={`${pos.marketId}-${pos.outcomeSide}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-2 py-0.5 text-xs ${pos.outcomeSide === "YES" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                            {pos.outcomeSide}
                          </span>
                          <span className="text-xs text-white/50">{pos.marketId.slice(0, 8)}...</span>
                        </div>
                        <span className="font-mono text-sm text-white">{pos.positionShares.toFixed(2)} shares</span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-white/50">
                        <span>Avg Cost: ${pos.avgCost.toFixed(4)}</span>
                        <span className={pos.realizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          PnL: {formatUsd(pos.realizedPnL)}
                        </span>
                      </div>
                    </div>
                  ))}
                {data.positions.filter((p) => p.positionShares > 0).length === 0 && (
                  <p className="text-center text-sm text-white/30">No open positions</p>
                )}
              </div>
            </div>

            {/* Recent Signals */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-white/70">Recent Signals ({data.recentSignals.length})</h3>
              <div className="space-y-2">
                {data.recentSignals.slice(0, 5).map((signal) => (
                  <div key={signal.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-teal-400" />
                      <span className={`rounded px-2 py-0.5 text-xs ${signal.outcomeSide === "YES" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                        {signal.outcomeSide}
                      </span>
                      <span className="text-xs text-white/50">{signal.marketId.slice(0, 8)}...</span>
                    </div>
                    <span className="font-semibold text-teal-400">{formatUsd(signal.netUSDC)}</span>
                  </div>
                ))}
                {data.recentSignals.length === 0 && (
                  <p className="text-center text-sm text-white/30">No recent signals</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
