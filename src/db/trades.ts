/**
 * 模块E：Trades 数据操作
 */
import { getClient } from "./init";
import type { ResolvedTrade, TradeRow } from "@/types/trade";

const INSERT_SQL = `
  INSERT OR IGNORE INTO trades
  (tx_hash, log_index, block_number, maker, taker,
   maker_asset_id, taker_asset_id, maker_amount, taker_amount,
   fee, token_id, market_id, outcome, direction, price, origin_from)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export async function saveTrades(trades: ResolvedTrade[]): Promise<number> {
  const client = getClient();
  const statements = trades.map((t) => ({
    sql: INSERT_SQL,
    args: [
      t.txHash, t.logIndex, t.blockNumber, t.maker, t.taker,
      t.makerAssetId, t.takerAssetId, t.makerAmount.toString(),
      t.takerAmount.toString(), t.fee.toString(), t.tokenId,
      t.marketId, t.outcome, t.direction, t.price, t.originFrom ?? t.maker.toLowerCase(),
    ],
  }));
  const results = await client.batch(statements, "write");
  return results.filter((r) => r.rowsAffected > 0).length;
}

export async function getTrades(limit = 20, offset = 0): Promise<TradeRow[]> {
  const client = getClient();
  const result = await client.execute({
    sql: `SELECT t.*, m.title as market_title FROM trades t
          LEFT JOIN markets m ON t.market_id = m.id
          ORDER BY t.block_number DESC LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return result.rows as unknown as TradeRow[];
}

export async function getTradeCount(): Promise<number> {
  const client = getClient();
  const result = await client.execute("SELECT COUNT(*) as count FROM trades");
  return (result.rows[0] as { count: number }).count;
}
