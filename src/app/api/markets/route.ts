/**
 * API: GET /api/markets
 * 优先从 Polymarket Gamma API 获取实时数据，DB 作为降级
 *
 * Query 参数:
 * - status: "active" | "all" (默认 active)
 * - tag: 按标签筛选 (如 "Sports", "Crypto")
 * - search: 模糊搜索标题
 *
 * 缓存策略:
 * - Cache-Control: 60s CDN 缓存 + 300s stale-while-revalidate
 * - 内存缓存: 60s TTL + SWR 后台刷新
 */
import { NextRequest, NextResponse } from "next/server";
import { queryMarkets, buildTokenMapFromMarkets, type MarketFilters } from "@/db/markets";
import { getEventsWithStats, getAllMarketEvents } from "@/db/events";
import { fetchMarketsWithFallback } from "@/markets";
import type { Market } from "@/types/market";

/** 为响应添加缓存头 */
function withCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300"
  );
  return response;
}

/** 在内存中应用筛选条件 */
function applyFilters(markets: Market[], filters: MarketFilters): Market[] {
  let result = markets;
  if (filters.status === "active") {
    result = result.filter(m => m.active);
  }
  if (filters.tag) {
    const tag = filters.tag;
    result = result.filter(m => m.tags?.includes(tag));
  }
  if (filters.search) {
    const term = filters.search.toLowerCase();
    result = result.filter(m => m.title.toLowerCase().includes(term));
  }
  return result;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filters: MarketFilters = {
    status: (url.searchParams.get("status") || "all") as "active" | "all",
    tag: url.searchParams.get("tag") || undefined,
    search: url.searchParams.get("search") || undefined,
  };

  try {
    // 优先从 Gamma API 获取实时数据
    const gammaData = await fetchMarketsWithFallback();
    const filtered = applyFilters(gammaData.markets, filters);

    return withCacheHeaders(NextResponse.json({
      data: filtered,
      events: gammaData.events,
      marketEvents: gammaData.marketEvents,
      tokenMap: gammaData.tokenMap,
      source: "gamma-api",
    }));
  } catch (gammaError) {
    console.error("Gamma API failed, falling back to DB:", gammaError);

    // 降级到 DB
    try {
      const markets = await queryMarkets(filters);
      if (markets.length === 0) {
        return NextResponse.json(
          { error: "No data available" },
          { status: 503 },
        );
      }

      const [events, marketEvents] = await Promise.all([
        getEventsWithStats(),
        getAllMarketEvents(),
      ]);
      const tokenMap = buildTokenMapFromMarkets(markets);

      return withCacheHeaders(NextResponse.json({
        data: markets,
        events,
        marketEvents,
        tokenMap,
        source: "database",
      }));
    } catch (dbError) {
      console.error("DB fallback also failed:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch markets from all sources" },
        { status: 500 },
      );
    }
  }
}
