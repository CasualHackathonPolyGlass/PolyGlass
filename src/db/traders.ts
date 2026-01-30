/**
 * 模块E：Traders 统计查询
 */
import { getDb } from "./init";
import { getTagsForAddresses } from "./tags";

interface TraderStats {
  address: string;
  trade_count: number;
  market_count: number;
  tags: string[];
}

/**
 * 获取交易者排行（含标签）
 */
export function getTraderStats(limit = 100): TraderStats[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        address,
        COUNT(*) as trade_count,
        COUNT(DISTINCT market_id) as market_count
      FROM (
        SELECT maker as address, market_id FROM trades
        UNION ALL
        SELECT taker as address, market_id FROM trades
      )
      GROUP BY address
      ORDER BY trade_count DESC
      LIMIT ?
    `
    )
    .all(limit) as Array<{ address: string; trade_count: number; market_count: number }>;

  // 批量获取标签
  const addresses = rows.map((r) => r.address);
  const tagsMap = getTagsForAddresses(addresses);

  return rows.map((r) => ({
    ...r,
    tags: tagsMap[r.address.toLowerCase()] || [],
  }));
}
