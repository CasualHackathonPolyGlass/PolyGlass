/**
 * API: GET /api/markets
 * 从 Gamma API 获取实时市场数据（含缓存降级）
 */
import { NextResponse } from "next/server";
import { fetchMarketsWithFallback } from "@/markets";

export async function GET() {
  try {
    const marketData = await fetchMarketsWithFallback();
    return NextResponse.json({
      data: marketData.markets,
      events: marketData.events,
      tokenMap: marketData.tokenMap,
    });
  } catch (error) {
    console.error("Failed to fetch markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}
