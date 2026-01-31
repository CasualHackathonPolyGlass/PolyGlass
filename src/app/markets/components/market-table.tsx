"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import type { Market, Event, MarketEvent } from "@/types/market";
import { EventRow, type EventGroup } from "./event-row";

interface MarketTableProps {
  markets: Market[];
  events: Event[];
  marketEvents: MarketEvent[];
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

export function MarketTable({ markets, events, marketEvents }: MarketTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // 收集所有标签（从 markets 的 tags 提取）
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    markets.forEach(m => {
      m.tags?.forEach(t => tagSet.add(t));
    });
    return ["all", ...Array.from(tagSet).sort()];
  }, [markets]);

  // 按 Event 分组 Markets
  const eventGroups = useMemo(() => {
    const marketMap = new Map(markets.map(m => [m.marketId, m]));
    const eventMap = new Map(events.map(e => [e.id, e]));
    const eventToMarkets = new Map<string, string[]>();

    for (const me of marketEvents) {
      const list = eventToMarkets.get(me.eventId) || [];
      list.push(me.marketId);
      eventToMarkets.set(me.eventId, list);
    }

    const groups: EventGroup[] = [];
    for (const [eventId, marketIds] of eventToMarkets) {
      const event = eventMap.get(eventId);
      if (!event) continue;

      const eventMarkets = marketIds
        .map(id => marketMap.get(id))
        .filter((m): m is Market => m !== undefined);

      if (eventMarkets.length === 0) continue;

      const totalVolume = eventMarkets.reduce((sum, m) => sum + m.volume, 0);
      groups.push({
        event,
        markets: eventMarkets,
        totalVolume,
        totalOpenInterest: totalVolume * 0.6,
        image: eventMarkets[0]?.image,
      });
    }
    return groups;
  }, [markets, events, marketEvents]);

  // 过滤和排序
  const filteredGroups = useMemo(() => {
    let result = [...eventGroups];

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((g) =>
        g.event.title.toLowerCase().includes(term) ||
        g.markets.some(m => m.title.toLowerCase().includes(term))
      );
    }

    if (statusFilter === "active") {
      const now = new Date();
      result = result.filter((g) => !g.event.endDate || new Date(g.event.endDate) > now);
    }

    // 标签筛选（检查 group 中的 markets 是否有匹配的 tag）
    if (tagFilter !== "all") {
      result = result.filter((g) =>
        g.markets.some(m => m.tags?.includes(tagFilter))
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title": cmp = a.event.title.localeCompare(b.event.title); break;
        case "volume": cmp = a.totalVolume - b.totalVolume; break;
        case "priceYes": cmp = a.totalOpenInterest - b.totalOpenInterest; break;
        case "endDate": cmp = (a.event.endDate || "").localeCompare(b.event.endDate || ""); break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [eventGroups, search, statusFilter, tagFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredGroups.length / rowsPerPage);
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredGroups.slice(start, start + rowsPerPage);
  }, [filteredGroups, currentPage, rowsPerPage]);

  const { scaleVolume, scaleOpenInterest } = useMemo(() => {
    if (filteredGroups.length === 0) return { scaleVolume: 1, scaleOpenInterest: 1 };
    const volumes = filteredGroups.map(g => g.totalVolume).filter(v => v > 0);
    if (volumes.length === 0) return { scaleVolume: 1, scaleOpenInterest: 1 };
    const maxVol = Math.max(...volumes);
    return { scaleVolume: maxVol > 0 ? maxVol : 1, scaleOpenInterest: maxVol * 0.6 };
  }, [filteredGroups]);

  const toggleExpand = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
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
            placeholder="Search markets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as "active" | "all"); setCurrentPage(1); }}
          className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-white focus:outline-none [&>option]:bg-zinc-900"
        >
          <option value="active">Active</option>
          <option value="all">All</option>
        </select>
        <select
          value={tagFilter}
          onChange={(e) => { setTagFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-white focus:outline-none [&>option]:bg-zinc-900"
        >
          {allTags.map(tag => (
            <option key={tag} value={tag}>
              {tag === "all" ? "All Tags" : tag}
            </option>
          ))}
        </select>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-white/60">
              <th className="w-8 px-3 py-3"></th>
              <th className="cursor-pointer px-3 py-3 hover:text-white" onClick={() => handleSort("title")}>
                <div className="flex items-center gap-1">
                  Market <SortIcon field="title" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Source</th>
              <th className="cursor-pointer px-3 py-3 text-right hover:text-white" onClick={() => handleSort("volume")}>
                <div className="flex items-center justify-end gap-1">
                  Volume (24h) <SortIcon field="volume" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="cursor-pointer px-3 py-3 text-right hover:text-white" onClick={() => handleSort("priceYes")}>
                <div className="flex items-center justify-end gap-1">
                  Open Interest <SortIcon field="priceYes" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="cursor-pointer px-3 py-3 hover:text-white" onClick={() => handleSort("endDate")}>
                <div className="flex items-center gap-1">
                  Ends <SortIcon field="endDate" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="px-3 py-3">Tags</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedGroups.map((group, index) => (
              <EventRow
                key={group.event.id}
                group={group}
                index={index}
                isExpanded={expandedEvents.has(group.event.id)}
                onToggle={() => toggleExpand(group.event.id)}
                scaleVolume={scaleVolume}
                scaleOpenInterest={scaleOpenInterest}
              />
            ))}
          </tbody>
        </table>
        {paginatedGroups.length === 0 && (
          <div className="py-12 text-center text-white/50">No markets found</div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span>Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white focus:outline-none [&>option]:bg-zinc-900"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <span className="text-sm text-white/70">Page {totalPages === 0 ? 0 : currentPage} of {totalPages}</span>
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
