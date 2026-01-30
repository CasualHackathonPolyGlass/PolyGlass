"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import type { Market, Event } from "@/types/market";
import { MarketRow } from "./market-row";

interface MarketTableProps {
  markets: Market[];
  events: Event[];
}

type SortField = "title" | "volume" | "priceYes" | "endDate";
type SortDirection = "asc" | "desc";

/** 排序图标 */
function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) {
  if (field !== currentField) {
    return <ChevronUp className="h-3 w-3 text-white/30" />;
  }
  return direction === "asc"
    ? <ChevronUp className="h-3 w-3 text-white" />
    : <ChevronDown className="h-3 w-3 text-white" />;
}

export function MarketTable({ markets, events }: MarketTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  // 过滤和排序
  const filteredMarkets = useMemo(() => {
    let result = [...markets];

    // 搜索过滤
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(term));
    }

    // 状态过滤 (基于 endDate)
    if (statusFilter === "active") {
      const now = new Date();
      result = result.filter((m) => !m.endDate || new Date(m.endDate) > now);
    }

    // 排序
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "volume":
          cmp = a.volume - b.volume;
          break;
        case "priceYes":
          cmp = a.priceYes - b.priceYes;
          break;
        case "endDate":
          cmp = (a.endDate || "").localeCompare(b.endDate || "");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [markets, search, statusFilter, sortField, sortDirection]);

  // 分页计算
  const totalPages = Math.ceil(filteredMarkets.length / rowsPerPage);
  const paginatedMarkets = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredMarkets.slice(start, start + rowsPerPage);
  }, [filteredMarkets, currentPage, rowsPerPage]);

  // 计算当前页数据的最大值（用于柱状图比例）
  const { maxVolume, maxOpenInterest } = useMemo(() => {
    const volumes = paginatedMarkets.map((m) => m.volume);
    const maxVol = Math.max(...volumes, 1);
    return { maxVolume: maxVol, maxOpenInterest: maxVol * 0.6 };
  }, [paginatedMarkets]);

  // 搜索/筛选改变时重置页码
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: "active" | "all") => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 搜索和筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 min-w-[200px]">
          <Search className="h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search terms..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as "active" | "all")}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none"
        >
          <option value="active">Active</option>
          <option value="all">All</option>
        </select>

        <select className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none">
          <option value="all">All Sources</option>
          <option value="polymarket">Polymarket</option>
          <option value="kalshi">Kalshi</option>
        </select>
      </div>

      <p className="text-xs text-white/50">
        Click on a search term to cycle through AND (+), OR (|), NOT (-) operators.
      </p>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-white/60">
              <th className="w-8 px-3 py-3"></th>
              <th
                className="cursor-pointer px-3 py-3 hover:text-white"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-1">
                  Market
                  <SortIcon field="title" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="px-3 py-3">Source</th>
              <th
                className="cursor-pointer px-3 py-3 text-right hover:text-white"
                onClick={() => handleSort("volume")}
              >
                <div className="flex items-center justify-end gap-1">
                  Volume
                  <SortIcon field="volume" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right hover:text-white"
                onClick={() => handleSort("priceYes")}
              >
                <div className="flex items-center justify-end gap-1">
                  Open Interest
                  <SortIcon field="priceYes" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-3 hover:text-white"
                onClick={() => handleSort("endDate")}
              >
                <div className="flex items-center gap-1">
                  Ends
                  <SortIcon field="endDate" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="px-3 py-3">Tags</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedMarkets.map((market) => (
              <MarketRow
                key={market.marketId}
                market={market}
                maxVolume={maxVolume}
                maxOpenInterest={maxOpenInterest}
              />
            ))}
          </tbody>
        </table>

        {paginatedMarkets.length === 0 && (
          <div className="py-12 text-center text-white/50">
            No markets found
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span>Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
            className="rounded border border-white/10 bg-white/5 px-2 py-1 text-white focus:outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <span className="text-sm text-white/70">
          Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
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
