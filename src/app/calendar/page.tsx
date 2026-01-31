"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, Sparkles, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "../components/header";
import { useMarkets } from "../hooks/useMarkets";
import type { Market } from "@/types/market";

type DaySummary = {
  key: string;
  date: Date;
  markets: Market[];
  totalVolume: number;
};

function pad(num: number) {
  return String(num).padStart(2, "0");
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay(); // 0 (Sun) - 6 (Sat)

  const grid: Array<Date | null> = [];
  for (let i = 0; i < leading; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
  return grid;
}

function dateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function formatDateHuman(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

const volumeFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function CalendarPage() {
  const { markets, loading, error } = useMarkets();
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const today = useMemo(() => new Date(), []);
  const [tooltip, setTooltip] = useState<{
    key: string;
    top: number;
    left: number;
    side: "left" | "right";
    summary: DaySummary;
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);

  // 避免悬浮窗被视口上下裁切
  useEffect(() => {
    if (!tooltip) {
      setTooltipTop(null);
      return;
    }
    const frame = requestAnimationFrame(() => {
      const el = tooltipRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 12;
      const half = rect.height / 2;
      const desired = tooltip.top;
      const clamped = Math.min(Math.max(desired, margin + half), window.innerHeight - margin - half);
      setTooltipTop(clamped);
    });
    return () => cancelAnimationFrame(frame);
  }, [tooltip]);

  const targetYear = monthCursor.getFullYear();
  const targetMonth = monthCursor.getMonth(); // 0-index

  const calendarDays = useMemo(() => buildMonthGrid(targetYear, targetMonth), [targetYear, targetMonth]);

  const daySummaries = useMemo(() => {
    if (!markets) return new Map<string, DaySummary>();
    const map = new Map<string, DaySummary>();

    for (const market of markets) {
      if (!market.endDate) continue;
      const endDate = new Date(market.endDate);
      if (Number.isNaN(endDate.getTime())) continue;
      if (endDate.getFullYear() !== targetYear || endDate.getMonth() !== targetMonth) continue;

      const key = dateKeyFromParts(targetYear, targetMonth, endDate.getDate());
      const entry = map.get(key) ?? {
        key,
        date: new Date(targetYear, targetMonth, endDate.getDate()),
        markets: [],
        totalVolume: 0,
      };
      entry.markets.push(market);
      entry.totalVolume += market.volume;
      map.set(key, entry);
    }

    return map;
  }, [markets, targetMonth, targetYear]);

  const maxVolume = useMemo(() => {
    let max = 0;
    daySummaries.forEach((day) => {
      if (day.totalVolume > max) max = day.totalVolume;
    });
    return max;
  }, [daySummaries]);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(targetYear, targetMonth, 1)
  );

  const intensityColor = (ratio: number) =>
    `linear-gradient(135deg, rgba(109,243,231,${0.18 + ratio * 0.55}), rgba(178,107,255,${0.12 + ratio * 0.55}))`;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
      <Header />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Settlement Calendar</p>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-white">Polymarket Calendar</h1>
            </div>
            <p className="max-w-2xl text-sm text-white/60">
              See which Polymarket questions resolve each day this month. Color intensity reflects total market value;
              hover a date to inspect the underlying events.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/40 bg-teal-400/10 px-3 py-1">
                <Sparkles className="h-4 w-4 text-teal-200" />
                Web3-native glassmorphism
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/40 bg-indigo-400/10 px-3 py-1">
                <CalendarIcon className="h-4 w-4 text-indigo-200" />
                Real-time from /api/markets
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex w-[360px] min-w-[320px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 shadow-inner shadow-black/30">
              <Info className="h-4 w-4 text-white/50" />
              <div>
                <p className="font-semibold text-white">Density legend</p>
                <p className="text-xs text-white/50">Darker blocks = higher total market volume settling that day</p>
              </div>
            </div>
            <div className="flex w-[360px] min-w-[320px] items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white/70 shadow-inner shadow-black/30">
              <button
                aria-label="Previous month"
                className="rounded-full p-2 transition hover:bg-white/10"
                onClick={() => setMonthCursor(new Date(targetYear, targetMonth - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-xs uppercase tracking-[0.2em]">{monthLabel}</div>
              <button
                aria-label="Next month"
                className="rounded-full p-2 transition hover:bg-white/10"
                onClick={() => setMonthCursor(new Date(targetYear, targetMonth + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            Failed to load calendar data: {error}
          </div>
        ) : (
          <div className="mt-6">
            <div className="mb-3 grid grid-cols-7 text-xs uppercase tracking-[0.2em] text-white/40">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <span key={d} className="px-2 py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={`blank-${idx}`} className="rounded-2xl border border-white/5 bg-white/5" />;

                const key = dateKeyFromParts(targetYear, targetMonth, date.getDate());
                const summary = daySummaries.get(key);
                const ratio = summary && maxVolume > 0 ? Math.min(summary.totalVolume / maxVolume, 1) : 0;
                const col = idx % 7;
                const tooltipSide = col >= 4 ? "left" : "right";
                const isActive = tooltip?.key === key;
                const isToday =
                  today.getFullYear() === date.getFullYear() &&
                  today.getMonth() === date.getMonth() &&
                  today.getDate() === date.getDate();

                return (
                  <div
                    key={key}
                    className={`relative rounded-2xl border bg-white/5 p-3 shadow-lg shadow-black/30 transition hover:-translate-y-0.5 ${
                      isActive ? "border-teal-200/60" : "border-white/10 hover:border-white/20"
                    }`}
                    style={{
                      background: summary ? intensityColor(ratio) : "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                    }}
                    onMouseEnter={(e) => {
                      if (!summary) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (hoverTimer.current) clearTimeout(hoverTimer.current);
                      setTooltip({
                        key,
                        side: tooltipSide,
                        top: rect.top + rect.height / 2,
                        left: tooltipSide === "left" ? rect.left - 6 : rect.right + 6,
                        summary,
                      });
                    }}
                    onMouseLeave={() => {
                      if (hoverTimer.current) clearTimeout(hoverTimer.current);
                      hoverTimer.current = setTimeout(() => setTooltip(null), 200);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-white/60">Day</p>
                        <p className="text-lg font-semibold text-white">{date.getDate()}</p>
                      </div>
                      {summary ? (
                        <div className="rounded-full border border-white/20 bg-black/20 px-2 py-1 text-[11px] text-white/80">
                          {summary.markets.length} {summary.markets.length === 1 ? "event" : "events"}
                        </div>
                      ) : (
                        <span className="text-xs text-white/30">—</span>
                      )}
                    </div>

                    <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: summary ? `${Math.max(8, ratio * 100)}%` : "0%",
                          background: "linear-gradient(90deg, #6df3e7, #b26bff)",
                          opacity: summary ? 0.9 : 0,
                          transition: "width 0.2s ease",
                        }}
                      />
                    </div>

                    {summary && (
                      <div className="mt-2 text-xs text-white/70">
                        Total volume: <span className="text-white">{volumeFormatter.format(summary.totalVolume)}</span>
                      </div>
                    )}
                    {isToday && (
                      <>
                        <div className="pointer-events-none absolute -inset-[2px] rounded-2xl ring-2 ring-indigo-300/55 shadow-[0_0_18px_rgba(99,102,241,0.3)]" />
                        <div className="pointer-events-none absolute -inset-[6px] rounded-3xl today-pulse" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {tooltip && (
        <div
          ref={tooltipRef}
          className="calendar-tooltip fixed z-40 w-80 rounded-2xl border border-white/12 bg-[#0b0f18] p-4 shadow-2xl shadow-black/60"
          style={{
            top: tooltipTop ?? tooltip.top,
            left: tooltip.left,
            transform: `translate(${tooltip.side === "left" ? "-100%" : "0"}, -50%)`,
          }}
          onMouseEnter={() => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
          }}
          onMouseLeave={() => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
            hoverTimer.current = setTimeout(() => setTooltip(null), 200);
          }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">结算事件</p>
          <p className="text-sm font-semibold text-white">{formatDateHuman(tooltip.summary.date)}</p>
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
            {[...tooltip.summary.markets]
              .sort((a, b) => b.volume - a.volume)
              .map((m) => (
              <a
                key={m.marketId}
                href={`https://polymarket.com/event/${m.slug ?? m.marketId}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:border-teal-200/50 hover:bg-teal-400/10"
              >
                <p className="font-semibold text-white line-clamp-2">{m.title}</p>
                <p className="text-[11px] text-white/60">
                  Volume {volumeFormatter.format(m.volume)} • Yes {Math.round(m.priceYes * 100)}%
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
      <style jsx global>{`
        .calendar-tooltip::-webkit-scrollbar {
          width: 8px;
        }
        .calendar-tooltip::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
        }
        .calendar-tooltip::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #6df3e7, #7f6bff);
          border-radius: 999px;
        }
        .calendar-tooltip {
          scrollbar-color: #6df3e7 rgba(255, 255, 255, 0.06);
          scrollbar-width: thin;
        }
        @keyframes pulseRing {
          0% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.35);
          }
          60% {
            box-shadow: 0 0 0 14px rgba(99, 102, 241, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
          }
        }
        .today-pulse {
          animation: pulseRing 1.8s ease-out infinite;
          border: 1px solid rgba(99, 102, 241, 0.25);
        }
      `}</style>
    </main>
  );
}
