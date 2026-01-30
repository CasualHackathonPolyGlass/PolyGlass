/**
 * Stats API - 返回仪表盘统计数据
 */
import { NextResponse } from "next/server";
import { getDb } from "@/db/init";

interface Stats {
  totalTrades: number;
  totalVolume: number;
  activeTraders: number;
  activeMarkets: number;
}

export async function GET() {
  const db = getDb();

  const tradeStats = db
    .prepare(
      `SELECT
        COUNT(*) as total_trades,
        SUM(CAST(maker_amount AS REAL) / 1e6) as total_volume
      FROM trades`
    )
    .get() as { total_trades: number; total_volume: number };

  const traderCount = db
    .prepare(
      `SELECT COUNT(DISTINCT address) as count FROM (
        SELECT maker as address FROM trades
        UNION
        SELECT taker as address FROM trades
      )`
    )
    .get() as { count: number };

  const marketCount = db
    .prepare("SELECT COUNT(DISTINCT market_id) as count FROM trades WHERE market_id IS NOT NULL")
    .get() as { count: number };

  const stats: Stats = {
    totalTrades: tradeStats.total_trades,
    totalVolume: tradeStats.total_volume || 0,
    activeTraders: traderCount.count,
    activeMarkets: marketCount.count,
  };

  return NextResponse.json({ data: stats });
}
