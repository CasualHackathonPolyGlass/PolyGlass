"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, TrendingUp, Users, Wallet, AlertCircle } from "lucide-react";
import type { SmartMoneyEvent, SmartMoneyMarket, SmartMoneyHolder } from "@/types/smart-market";
import { TraderDrawer } from "../../components/trader-drawer";

/** 格式化 USD */
function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/** 缩短地址 */
function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Market 卡片 */
function MarketCard({
  market,
  holders,
  onSelectTrader,
}: {
  market: SmartMoneyMarket;
  holders: SmartMoneyHolder[];
  onSelectTrader: (address: string) => void;
}) {
  const { smartMoneyStats } = market;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      {/* 标题 */}
      <h3 className="text-base font-semibold text-white mb-3">{market.title}</h3>

      {/* Smart Money 统计 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
          <div className="text-xs text-emerald-400 mb-1">YES Volume</div>
          <div className="text-lg font-bold text-white">{formatUsd(smartMoneyStats.yesVolume)}</div>
          <div className="text-xs text-white/50">{smartMoneyStats.yesCount} wallets</div>
        </div>
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
          <div className="text-xs text-rose-400 mb-1">NO Volume</div>
          <div className="text-lg font-bold text-white">{formatUsd(smartMoneyStats.noVolume)}</div>
          <div className="text-xs text-white/50">{smartMoneyStats.noCount} wallets</div>
        </div>
      </div>

      {/* 持仓分布条 */}
      <div className="flex h-2 rounded-full overflow-hidden mb-4">
        <div
          className="bg-emerald-500"
          style={{ width: `${smartMoneyStats.yesOiShare * 100}%` }}
        />
        <div
          className="bg-rose-500"
          style={{ width: `${smartMoneyStats.noOiShare * 100}%` }}
        />
      </div>

      {/* Top Holders */}
      {holders.length > 0 && (
        <div>
          <div className="text-xs text-white/50 mb-2">Top Holders</div>
          <div className="space-y-2">
            {holders.slice(0, 5).map((holder, idx) => (
              <div
                key={`${holder.address}-${holder.outcome}-${idx}`}
                className="flex items-center justify-between rounded-lg bg-white/5 p-2 cursor-pointer hover:bg-white/10 transition"
                onClick={() => onSelectTrader(holder.address)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      holder.outcome === "YES"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {holder.outcome}
                  </span>
                  <span className="text-sm font-mono text-white">{shortenAddress(holder.address)}</span>
                  {holder.tags && holder.tags.length > 0 && (
                    <span className="text-xs text-teal-400">{holder.tags[0]}</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{formatUsd(holder.amount)}</div>
                  <div className="text-xs text-white/50">{holder.winRate.toFixed(0)}% WR</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SmartMoneyEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<SmartMoneyEvent | null>(null);
  const [marketsWithHolders, setMarketsWithHolders] = useState<
    Array<{ market: SmartMoneyMarket; holders: SmartMoneyHolder[] }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEventData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/events/${eventId}/markets?smart_money=true&holders=true`);
        if (!res.ok) throw new Error("Failed to fetch event");
        const json = await res.json();

        setEvent(json.event);
        setMarketsWithHolders(
          json.markets.map((m: SmartMoneyMarket & { smartMoneyHolders?: SmartMoneyHolder[] }) => ({
            market: m,
            holders: m.smartMoneyHolders || [],
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    if (eventId) fetchEventData();
  }, [eventId]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
        <button
          onClick={() => router.push("/smart-money")}
          className="flex items-center gap-2 text-white/70 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Smart Money
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200">
          <AlertCircle className="h-5 w-5" />
          <span>{error || "Event not found"}</span>
        </div>
      </main>
    );
  }

  // 计算汇总统计
  const totalSmVolume = event.smartMoneyStats.totalVolume;
  const totalYesVolume = event.smartMoneyStats.yesVolume;
  const totalNoVolume = event.smartMoneyStats.noVolume;
  const totalWallets = event.smartMoneyStats.yesCount + event.smartMoneyStats.noCount;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <button
            onClick={() => router.push("/smart-money")}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Smart Money
          </button>
          <h1 className="text-2xl font-semibold text-white">{event.title}</h1>
          {event.category && (
            <span className="inline-block mt-2 text-sm text-white/50 bg-white/5 px-3 py-1 rounded">
              {event.category}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/20 to-indigo-500/20">
            <TrendingUp className="h-6 w-6 text-teal-300" />
          </div>
          <div>
            <p className="text-xs text-white/50">SM Volume</p>
            <p className="text-xl font-bold text-white">{formatUsd(totalSmVolume)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20">
            <Wallet className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <p className="text-xs text-white/50">YES Volume</p>
            <p className="text-xl font-bold text-emerald-300">{formatUsd(totalYesVolume)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400/20 to-red-500/20">
            <Wallet className="h-6 w-6 text-rose-300" />
          </div>
          <div>
            <p className="text-xs text-white/50">NO Volume</p>
            <p className="text-xl font-bold text-rose-300">{formatUsd(totalNoVolume)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20">
            <Users className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <p className="text-xs text-white/50">Smart Wallets</p>
            <p className="text-xl font-bold text-white">{totalWallets}</p>
          </div>
        </div>
      </div>

      {/* Markets */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Markets ({marketsWithHolders.length})</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {marketsWithHolders.map(({ market, holders }) => (
            <MarketCard
              key={market.id}
              market={market}
              holders={holders}
              onSelectTrader={setSelectedTrader}
            />
          ))}
        </div>
      </div>

      {/* Trader Drawer */}
      {selectedTrader && (
        <TraderDrawer address={selectedTrader} onClose={() => setSelectedTrader(null)} />
      )}
    </main>
  );
}
