/**
 * 模块E：Markets 数据操作
 */
import { getDb } from "./init";
import type { Market } from "@/types/market";

const INSERT_SQL = `
  INSERT OR REPLACE INTO markets
  (id, title, condition_id, token_yes, token_no)
  VALUES (?, ?, ?, ?, ?)
`;

/**
 * 批量保存市场（事务）
 */
export function saveMarkets(markets: Market[]): number {
  const db = getDb();
  const stmt = db.prepare(INSERT_SQL);

  const tx = db.transaction(() => {
    for (const m of markets) {
      stmt.run(m.marketId, m.title, m.conditionId, m.tokenYes, m.tokenNo);
    }
    return markets.length;
  });

  return tx();
}

/**
 * 获取所有市场
 */
export function getMarkets(): Market[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM markets").all() as Array<{
    id: string;
    title: string;
    condition_id: string;
    token_yes: string;
    token_no: string;
  }>;

  return rows.map((r) => ({
    marketId: r.id,
    title: r.title,
    conditionId: r.condition_id,
    tokenYes: r.token_yes,
    tokenNo: r.token_no,
  }));
}

/** 市场统计信息 */
interface MarketStats {
  id: string;
  title: string;
  trade_count: number;
  volume: number;
}

/**
 * 获取带统计的市场列表
 */
export function getMarketsWithStats(): MarketStats[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        m.id,
        m.title,
        COUNT(t.id) as trade_count,
        COALESCE(SUM(CAST(t.taker_amount AS REAL) / 1e6), 0) as volume
      FROM markets m
      LEFT JOIN trades t ON m.id = t.market_id
      GROUP BY m.id
      ORDER BY trade_count DESC
    `
    )
    .all() as MarketStats[];
}
