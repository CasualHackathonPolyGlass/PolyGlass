/**
 * 模块E：Trades 数据操作
 */
import { getDb } from "./init";
import type { ResolvedTrade, TradeRow } from "@/types/trade";

const INSERT_SQL = `
  INSERT OR IGNORE INTO trades
  (tx_hash, log_index, block_number, maker, taker,
   maker_asset_id, taker_asset_id, maker_amount, taker_amount,
   fee, token_id, market_id, outcome, direction, price)
  VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * 批量保存交易（事务）
 */
export function saveTrades(trades: ResolvedTrade[]): number {
  const db = getDb();
  const stmt = db.prepare(INSERT_SQL);

  const tx = db.transaction(() => {
    let count = 0;
    for (const t of trades) {
      const result = stmt.run(
        t.txHash,
        t.logIndex,
        t.blockNumber,
        t.maker,
        t.taker,
        t.makerAssetId,
        t.takerAssetId,
        t.makerAmount.toString(),
        t.takerAmount.toString(),
        t.fee.toString(),
        t.tokenId,
        t.marketId,
        t.outcome,
        t.direction,
        t.price
      );
      if (result.changes > 0) count++;
    }
    return count;
  });

  return tx();
}

/**
 * 分页查询交易（含市场标题）
 */
export function getTrades(limit = 20, offset = 0): TradeRow[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT t.*, m.title as market_title
      FROM trades t
      LEFT JOIN markets m ON t.market_id = m.id
      ORDER BY t.block_number DESC
      LIMIT ? OFFSET ?
    `
    )
    .all(limit, offset) as TradeRow[];
}

/**
 * 获取交易总数
 */
export function getTradeCount(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM trades").get() as { count: number };
  return row.count;
}
