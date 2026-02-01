"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ExternalLink, Copy, Check, Star } from "lucide-react";
import type { SmartMoneyEntry } from "@/app/hooks/useSmartMoney";

interface SmartTradersTableProps {
  data: SmartMoneyEntry[];
  onSelectTrader?: (address: string) => void;
}

type SortField = "score" | "totalPnl" | "roi" | "winRate" | "tradeCount";
type SortDirection = "asc" | "desc";

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

/** 排序图标 */
function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ChevronUp className="h-3 w-3 text-white/30" />;
  return direction === "asc"
    ? <ChevronUp className="h-3 w-3 text-teal-400" />
    : <ChevronDown className="h-3 w-3 text-teal-400" />;
}

/** 复制按钮 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-1 rounded p-1 text-white/40 hover:bg-white/10 hover:text-white">
      {copied ? <Check className="h-3 w-3 text-teal-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

/** 标签颜色映射 */
const TAG_COLORS: Record<string, string> = {
  whale: "bg-blue-500/20 text-blue-300",
  "high-roi": "bg-emerald-500/20 text-emerald-300",
  consistent: "bg-purple-500/20 text-purple-300",
  active: "bg-amber-500/20 text-amber-300",
  diversified: "bg-cyan-500/20 text-cyan-300",
  profitable: "bg-green-500/20 text-green-300",
  depositor: "bg-teal-500/20 text-teal-300",
};

export function SmartTradersTable({ data, onSelectTrader }: SmartTradersTableProps) {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const headers: { key: SortField; label: string }[] = [
    { key: "score", label: "Score" },
    { key: "totalPnl", label: "Total PnL" },
    { key: "roi", label: "ROI" },
    { key: "winRate", label: "Win Rate" },
    { key: "tradeCount", label: "Trades" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-white/50">
              <th className="px-4 py-4 font-medium">Rank</th>
              <th className="px-4 py-4 font-medium">Wallet</th>
              <th className="px-4 py-4 font-medium">Labels</th>
              {headers.map(({ key, label }) => (
                <th key={key} className="cursor-pointer px-4 py-4 font-medium hover:text-white" onClick={() => handleSort(key)}>
                  <div className="flex items-center gap-1">
                    {label}
                    <SortIcon active={sortField === key} direction={sortDirection} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedData.map((entry, idx) => {
              const rank = (currentPage - 1) * rowsPerPage + idx + 1;
              const pnlColor = entry.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400";
              const roiColor = entry.roi >= 0 ? "text-emerald-400" : "text-rose-400";

              return (
                <tr
                  key={entry.address}
                  className="cursor-pointer transition hover:bg-white/5"
                  onClick={() => onSelectTrader?.(entry.address)}
                >
                  <td className="px-4 py-4">
                    <span className={`font-mono font-bold ${rank <= 3 ? "text-amber-400" : "text-white/70"}`}>
                      #{rank}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-400/20 to-indigo-500/20">
                        <span className="text-xs font-bold text-white/70">{entry.address.slice(2, 4).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-mono text-white">{shortenAddress(entry.address)}</span>
                        <CopyButton text={entry.address} />
                        <a
                          href={`https://polygonscan.com/address/${entry.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {/* 显示 labels（来自 API 的 generateLabels） */}
                      {entry.labels?.length > 0 && entry.labels.map((label) => (
                        <span key={label} className={`rounded-full px-2 py-0.5 text-xs ${TAG_COLORS[label] || "bg-indigo-500/20 text-indigo-300"}`}>
                          {label}
                        </span>
                      ))}
                      {/* 显示 tags（系统标签 + 用户标签，排除已显示的 labels） */}
                      {entry.tags.filter((t) => !entry.labels?.includes(t)).slice(0, 2).map((tag) => (
                        <span key={tag} className={`rounded-full px-2 py-0.5 text-xs ${TAG_COLORS[tag] || "bg-indigo-500/20 text-indigo-300"}`}>
                          {tag}
                        </span>
                      ))}
                      {!entry.labels?.length && !entry.tags.length && (
                        <span className="text-white/30">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400" />
                      <span className="font-medium text-white">{(entry.score ?? 0).toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`font-semibold ${pnlColor}`}>{formatUsd(entry.totalPnl)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`font-medium ${roiColor}`}>{entry.roi > 0 ? "+" : ""}{entry.roi.toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{entry.winRate.toFixed(0)}%</span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-teal-400" style={{ width: `${entry.winRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-white/70">{entry.tradeCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {paginatedData.length === 0 && <div className="py-12 text-center text-white/50">No data available</div>}
      </div>

      {/* 分页 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <span className="text-sm text-white/50">
          Showing {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-white/70">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
