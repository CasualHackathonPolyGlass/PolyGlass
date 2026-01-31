import Link from "next/link";
import { Activity, AlertTriangle, BarChart3, Sparkles } from "lucide-react";
import type { AnomalyItem } from "@/app/hooks/useAnomalies";

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

function badgeText(item: AnomalyItem): string {
  if (item.type === "price" && typeof item.priceChangePct === "number") {
    const sign = item.priceChangePct > 0 ? "+" : "";
    return `${sign}${item.priceChangePct}%`;
  }
  return `Vol ${formatVolume(item.market.volume)}`;
}

function badgeColor(item: AnomalyItem): string {
  if (item.type === "price") return "bg-rose-500/15 text-rose-100 border border-rose-500/30";
  return "bg-sky-500/15 text-sky-100 border border-sky-500/30";
}

function iconFor(item: AnomalyItem) {
  if (item.type === "price") return <AlertTriangle className="h-4 w-4 text-rose-300" />;
  return <BarChart3 className="h-4 w-4 text-sky-300" />;
}

export function AnomalyCard({ anomalies, loading }: { anomalies: AnomalyItem[]; loading: boolean }) {
  const maxVolume = Math.max(...anomalies.map((a) => a.market.volume), 1);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/25 via-cyan-400/20 to-indigo-500/25 ring-1 ring-white/10">
          <Activity className="h-5 w-5 text-emerald-100" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Market Anomalies</p>
          <h3 className="text-lg font-semibold text-white">Realtime snapshot</h3>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/5 p-3">
              <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                <div className="h-6 w-16 animate-pulse rounded bg-white/10" />
              </div>
              <div className="mt-2 h-2 w-full animate-pulse rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : anomalies.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-sm text-white/50">No notable anomalies</div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((item) => {
            const progress = Math.min(100, Math.max(6, (item.market.volume / maxVolume) * 100));
            return (
              <Link
                key={item.market.marketId}
                href={`https://polymarket.com/event/${item.market.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-3 py-3 transition hover:border-teal-500/30 hover:from-teal-500/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                      {iconFor(item)}
                    </div>
                    <div className="space-y-1">
                      <h4 className="line-clamp-2 text-sm font-semibold leading-tight text-white group-hover:text-teal-100">
                        {item.market.title}
                      </h4>
                      <p className="text-xs text-white/50">
                        {item.event?.title || item.market.tags[0] || "General"}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor(item)}`}>
                    {badgeText(item)}
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${item.type === "price" ? "bg-gradient-to-r from-emerald-400 to-rose-500" : "bg-gradient-to-r from-sky-400 to-indigo-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-white/50">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-white/60" />
                    {item.type === "price" ? "Price swing" : "Volume spike"}
                  </span>
                  <span>Vol {formatVolume(item.market.volume)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
