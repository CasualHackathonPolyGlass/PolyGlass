"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, Trophy, Wallet } from "lucide-react";
import { useSmartMoney } from "../hooks/useSmartMoney";
import { SmartTradersTable } from "./components/smart-traders-table";
import { TraderDrawer } from "./components/trader-drawer";
import { SignalsFeed } from "./components/signals-feed";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

/** 统计卡片 */
function StatCard({ icon: Icon, label, value, subValue }: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/20 to-indigo-500/20">
        <Icon className="h-6 w-6 text-teal-300" />
      </div>
      <div>
        <p className="text-xs text-white/50">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
        {subValue && <p className="text-xs text-white/40">{subValue}</p>}
      </div>
    </div>
  );
}

/** 格式化 USD */
function formatUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export default function SmartMoneyPage() {
  const [view, setView] = useState<"all" | "retail">("retail");
  const { data, loading, error } = useSmartMoney({ limit: 100, view });
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  // 计算统计数据
  const stats = data ? {
    totalTraders: data.length,
    totalPnl: data.reduce((sum, e) => sum + e.totalPnl, 0),
    avgWinRate: data.reduce((sum, e) => sum + e.winRate, 0) / data.length,
    topTraderPnl: data[0]?.totalPnl || 0,
  } : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 text-white/70" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">Smart Money Leaderboard</h1>
            <p className="text-sm text-white/50">Track top Polymarket traders by score, PnL and performance</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("retail")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              view === "retail"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
          >
            Retail Only
          </button>
          <button
            onClick={() => setView("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              view === "all"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
          >
            All Traders
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Traders" value={stats.totalTraders.toLocaleString()} subValue={view === "retail" ? "retail traders only" : "all traders"} />
          <StatCard icon={TrendingUp} label="Combined PnL" value={formatUsd(stats.totalPnl)} />
          <StatCard icon={Trophy} label="Avg Win Rate" value={`${stats.avgWinRate.toFixed(1)}%`} />
          <StatCard icon={Wallet} label="Top Trader PnL" value={formatUsd(stats.topTraderPnl)} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200">
          Failed to load leaderboard: {error}
        </div>
      )}

      {/* Main Content: Table + Signals */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Smart Traders Table */}
        <div>
          {loading ? (
            <div className="rounded-xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 p-4">
                <div className="flex gap-4">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-20" />)}
                </div>
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-white/5 p-4">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : data && (
            <SmartTradersTable data={data} onSelectTrader={setSelectedAddress} />
          )}
        </div>

        {/* Signals Feed Sidebar */}
        <div className="hidden lg:block">
          <SignalsFeed onSelectTrader={setSelectedAddress} />
        </div>
      </div>

      {/* Trader Detail Drawer */}
      <TraderDrawer address={selectedAddress} onClose={() => setSelectedAddress(null)} />
    </main>
  );
}
