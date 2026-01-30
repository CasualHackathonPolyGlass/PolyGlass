/**
 * Leaderboard API - 返回带 PnL 数据的交易者排行
 */
import { NextResponse } from "next/server";
import { getDb } from "@/db/init";
import { getTagsForAddresses } from "@/db/tags";

interface LeaderboardEntry {
  address: string;
  totalPnl: number;
  realizedPnl: number;
  roi: number;
  winRate: number;
  tradeCount: number;
  marketCount: number;
  tags: string[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy") || "totalPnl";
  const order = searchParams.get("order") || "desc";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const db = getDb();

  // 计算每个 trader 的 PnL 统计
  const rows = db
    .prepare(
      `
      WITH trader_stats AS (
        SELECT
          address,
          COUNT(*) as trade_count,
          COUNT(DISTINCT market_id) as market_count,
          SUM(CASE
            WHEN direction = 'SELL' THEN CAST(maker_amount AS REAL) / 1e6 * price
            WHEN direction = 'BUY' THEN -CAST(taker_amount AS REAL) / 1e6 * price
            ELSE 0
          END) as realized_pnl,
          SUM(CAST(maker_amount AS REAL) / 1e6) as total_invested,
          AVG(CASE
            WHEN direction = 'BUY' AND price < 0.5 THEN 1.0
            WHEN direction = 'SELL' AND price > 0.5 THEN 1.0
            ELSE 0.0
          END) as win_rate
        FROM (
          SELECT maker as address, market_id, direction, price, maker_amount, taker_amount
          FROM trades
          WHERE market_id IS NOT NULL
        )
        GROUP BY address
        HAVING trade_count >= 3
      )
      SELECT
        address,
        trade_count,
        market_count,
        COALESCE(realized_pnl, 0) as realized_pnl,
        COALESCE(total_invested, 0) as total_invested,
        COALESCE(win_rate, 0) as win_rate
      FROM trader_stats
      ORDER BY realized_pnl DESC
      LIMIT ?
    `
    )
    .all(limit) as Array<{
    address: string;
    trade_count: number;
    market_count: number;
    realized_pnl: number;
    total_invested: number;
    win_rate: number;
  }>;

  // 批量获取标签
  const addresses = rows.map((r) => r.address);
  const tagsMap = getTagsForAddresses(addresses);

  // 转换为响应格式
  const leaderboard: LeaderboardEntry[] = rows.map((r) => {
    const roi = r.total_invested > 0 ? (r.realized_pnl / r.total_invested) * 100 : 0;
    return {
      address: r.address,
      totalPnl: r.realized_pnl, // 简化：total = realized
      realizedPnl: r.realized_pnl,
      roi: Math.round(roi * 100) / 100,
      winRate: Math.round(r.win_rate * 100),
      tradeCount: r.trade_count,
      marketCount: r.market_count,
      tags: tagsMap[r.address.toLowerCase()] || [],
    };
  });

  // 客户端排序（支持多列）
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const aVal = a[sortBy as keyof LeaderboardEntry] ?? 0;
    const bVal = b[sortBy as keyof LeaderboardEntry] ?? 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return order === "desc" ? bVal - aVal : aVal - bVal;
    }
    return 0;
  });

  return NextResponse.json({ data: sortedLeaderboard });
}
