/**
 * API: GET /api/markets
 * 从 DB 读取市场数据（支持筛选）
 *
 * Query 参数:
 * - status: "active" | "all" (默认 active)
 * - tag: 按标签筛选 (如 "Sports", "Crypto")
 * - search: 模糊搜索标题
 */
import { NextRequest, NextResponse } from "next/server";
import { queryMarkets, buildTokenMapFromMarkets, type MarketFilters } from "@/db/markets";
import { getEventsWithStats, getAllMarketEvents } from "@/db/events";
import { fetchMarketsWithFallback } from "@/markets";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filters: MarketFilters = {
    status: (url.searchParams.get("status") || "all") as "active" | "all",
    tag: url.searchParams.get("tag") || undefined,
    search: url.searchParams.get("search") || undefined,
  };

  try {
    // 尝试从 DB 读取
    const markets = await queryMarkets(filters);

    // 如果 DB 为空，回退到 Gamma API（首次同步前的兼容）
    if (markets.length === 0) {
      const fallback = await fetchMarketsWithFallback();
      return NextResponse.json({
        data: fallback.markets,
        events: fallback.events,
        marketEvents: fallback.marketEvents,
        tokenMap: fallback.tokenMap,
        source: "gamma-fallback",
      });
    }

    // 从 DB 获取 events 和 marketEvents
    const [events, marketEvents] = await Promise.all([
      getEventsWithStats(),
      getAllMarketEvents(),
    ]);

    // 从 markets 构建 tokenMap
    const tokenMap = buildTokenMapFromMarkets(markets);

    return NextResponse.json({
      data: markets,
      events,
      marketEvents,
      tokenMap,
      source: "database",
    });
  } catch (error) {
    console.error("Failed to fetch markets from DB, falling back to Gamma:", error);

    // 降级到 Gamma API
    try {
      const fallback = await fetchMarketsWithFallback();
      return NextResponse.json({
        data: fallback.markets,
        events: fallback.events,
        marketEvents: fallback.marketEvents,
        tokenMap: fallback.tokenMap,
        source: "gamma-fallback",
      });
    } catch (fallbackError) {
      console.error("Gamma fallback also failed:", fallbackError);
      return NextResponse.json(
        { error: "Failed to fetch markets" },
        { status: 500 },
      );
    }
  }
}
