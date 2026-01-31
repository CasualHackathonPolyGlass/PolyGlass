"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, BarChart3, Users, AlertCircle } from "lucide-react";
import type { SmartMoneyEvent } from "@/types/smart-market";

interface SignalsEventsProps {
  limit?: number;
}

/** 格式化 USD */
function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/** 单个 Event 卡片 */
function EventCard({ event, onClick }: { event: SmartMoneyEvent; onClick: () => void }) {
  const { smartMoneyStats } = event;

  // 安全检查：如果 smartMoneyStats 不存在，显示占位内容
  if (!smartMoneyStats) {
    return (
      <div
        className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 hover:border-teal-500/30"
        onClick={onClick}
      >
        <div className="mb-3">
          <h3 className="text-base font-semibold text-white leading-tight line-clamp-2">
            {event.title}
          </h3>
          {event.category && (
            <span className="mt-1 inline-block text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded">
              {event.category}
            </span>
          )}
        </div>
        <div className="flex items-center justify-center py-8 text-white/40 text-sm">
          No smart money data available
        </div>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 hover:border-teal-500/30"
      onClick={onClick}
    >
      {/* 标题 */}
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white leading-tight line-clamp-2">
          {event.title}
        </h3>
        {event.category && (
          <span className="mt-1 inline-block text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded">
            {event.category}
          </span>
        )}
      </div>

      {/* Smart Money 总量 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-teal-400" />
          <span className="text-xs text-white/50">SM Volume</span>
        </div>
        <span className="text-lg font-bold text-teal-400">{formatUsd(smartMoneyStats.totalVolume)}</span>
      </div>

      {/* YES/NO 对比 */}
      <div className="space-y-2">
        {/* YES */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-emerald-400">YES</span>
            <div className="flex items-center gap-2">
              <span className="text-white/70">{formatUsd(smartMoneyStats.yesVolume)}</span>
              <span className="text-white/40">({smartMoneyStats.yesCount} wallets)</span>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${smartMoneyStats.yesOiShare * 100}%` }}
            />
          </div>
        </div>

        {/* NO */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-rose-400">NO</span>
            <div className="flex items-center gap-2">
              <span className="text-white/70">{formatUsd(smartMoneyStats.noVolume)}</span>
              <span className="text-white/40">({smartMoneyStats.noCount} wallets)</span>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all"
              style={{ width: `${smartMoneyStats.noOiShare * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SignalsEvents({ limit = 100 }: SignalsEventsProps) {
  const [events, setEvents] = useState<SmartMoneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const rowsPerPage = 8; // 与 stats 表格保持一致
  const totalPages = Math.ceil(events.length / rowsPerPage);
  const paginatedEvents = events.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const res = await fetch(`/api/events?smart_money=true&limit=${limit}`);
        if (!res.ok) throw new Error("Failed to fetch events");
        const json = await res.json();
        setEvents(json.data);
        setCurrentPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [limit]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Smart Money Events</h2>
        </div>
        <span className="text-xs text-white/50">{events.length} events</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: rowsPerPage }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-white/10" />
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

      {/* Event List */}
      {!loading && paginatedEvents.length > 0 && (
        <>
          <div className="space-y-3">
            {paginatedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => router.push(`/smart-money/events/${event.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-white/50">
                Showing {((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, events.length)} of {events.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-white/70">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 py-12 text-center">
          <BarChart3 className="mx-auto mb-2 h-8 w-8 text-white/20" />
          <p className="text-sm text-white/40">No smart money events found</p>
        </div>
      )}
    </div>
  );
}
