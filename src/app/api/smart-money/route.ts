/**
 * GET /api/smart-money
 * Smart Money 排行榜 API
 *
 * 查询参数：
 * - sort: score | roi | winRate | volume | realizedPnL (默认 score)
 * - order: asc | desc (默认 desc)
 * - limit: number (默认 50)
 */
import { NextResponse } from "next/server";
import { getSmartTraders } from "@/db/analytics";
import { getTagsForAddresses } from "@/db/tags";

/** 前端排序字段到数据库字段的映射 */
const SORT_FIELD_MAP: Record<string, string> = {
  score: "score",
  roi: "roi",
  winRate: "win_rate",
  volume: "volume_usdc",
  realizedPnL: "realized_pnl",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "score";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    // 映射排序字段
    const dbSortField = SORT_FIELD_MAP[sort] || "score";

    // 查询数据库
    const traders = getSmartTraders(limit, dbSortField);

    // 批量获取用户自定义标签
    const addresses = traders.map((t) => t.address);
    const userTagsMap = getTagsForAddresses(addresses);

    // 合并标签
    const data = traders.map((t) => ({
      ...t,
      tags: [
        ...t.tags,
        ...(userTagsMap[t.address.toLowerCase()] || []),
      ],
    }));

    return NextResponse.json({
      data,
      total: data.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
