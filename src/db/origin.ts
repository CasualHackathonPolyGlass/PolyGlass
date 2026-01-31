/**
 * Origin 元数据操作模块
 * 处理地址类型检测（EOA/CONTRACT）和 Relayer 识别
 */
import { getClient } from "./init";
import type { OriginMetadata, OriginMetadataRow } from "@/types/origin";

const UPSERT_ORIGIN_SQL = `
  INSERT INTO origin_metadata
  (address, is_contract, is_relayer, is_proxy_wallet, trades_count_24h, median_time_gap_sec, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(address) DO UPDATE SET
    is_contract = excluded.is_contract,
    is_relayer = excluded.is_relayer,
    is_proxy_wallet = excluded.is_proxy_wallet,
    trades_count_24h = excluded.trades_count_24h,
    median_time_gap_sec = excluded.median_time_gap_sec,
    updated_at = datetime('now')
`;

/** 保存/更新单个 origin 元数据 */
export async function saveOriginMetadata(data: OriginMetadata): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: UPSERT_ORIGIN_SQL,
    args: [
      data.address.toLowerCase(),
      data.isContract ? 1 : 0,
      data.isRelayer ? 1 : 0,
      data.isProxyWallet === null ? null : data.isProxyWallet ? 1 : 0,
      data.tradesCount24h,
      data.medianTimeGapSec,
    ],
  });
}

/** 批量保存 origin 元数据 */
export async function saveOriginMetadataBatch(batch: OriginMetadata[]): Promise<number> {
  const client = getClient();
  const statements = batch.map((data) => ({
    sql: UPSERT_ORIGIN_SQL,
    args: [
      data.address.toLowerCase(),
      data.isContract ? 1 : 0,
      data.isRelayer ? 1 : 0,
      data.isProxyWallet === null ? null : data.isProxyWallet ? 1 : 0,
      data.tradesCount24h,
      data.medianTimeGapSec,
    ],
  }));
  const results = await client.batch(statements, "write");
  return results.filter((r) => r.rowsAffected > 0).length;
}

/** 获取单个地址的 origin 元数据 */
export async function getOriginMetadata(address: string): Promise<OriginMetadata | null> {
  const client = getClient();
  const result = await client.execute({
    sql: `SELECT * FROM origin_metadata WHERE address = ?`,
    args: [address.toLowerCase()],
  });
  if (result.rows.length === 0) return null;
  return mapRowToMetadata(result.rows[0] as unknown as OriginMetadataRow);
}

/** 获取需要检测 origin_type 的地址 */
export async function getAddressesNeedingOriginType(limit: number = 1000): Promise<string[]> {
  const client = getClient();
  const result = await client.execute({
    sql: `SELECT DISTINCT origin_from FROM trades
          WHERE origin_from IS NOT NULL AND origin_type IS NULL LIMIT ?`,
    args: [limit],
  });
  return result.rows.map((r) => (r as unknown as { origin_from: string }).origin_from);
}

/** 获取需要检测 relayer 的地址 */
export async function getAddressesNeedingRelayerCheck(limit: number = 1000): Promise<string[]> {
  const client = getClient();
  const result = await client.execute({
    sql: `SELECT DISTINCT origin_from FROM trades
          WHERE origin_from IS NOT NULL AND origin_type IS NOT NULL AND origin_is_relayer IS NULL LIMIT ?`,
    args: [limit],
  });
  return result.rows.map((r) => (r as unknown as { origin_from: string }).origin_from);
}

/** 更新 trades 表的 origin_type */
export async function updateTradesOriginType(address: string, originType: string): Promise<number> {
  const client = getClient();
  const result = await client.execute({
    sql: `UPDATE trades SET origin_type = ? WHERE origin_from = ?`,
    args: [originType, address.toLowerCase()],
  });
  return result.rowsAffected;
}

/** 更新 trades 表的 origin_is_relayer */
export async function updateTradesRelayerFlag(address: string, isRelayer: boolean): Promise<number> {
  const client = getClient();
  const result = await client.execute({
    sql: `UPDATE trades SET origin_is_relayer = ? WHERE origin_from = ?`,
    args: [isRelayer ? 1 : 0, address.toLowerCase()],
  });
  return result.rowsAffected;
}

/** 获取地址在过去 24h 的交易统计 */
export async function getAddressTradeStats(address: string): Promise<{
  tradesCount24h: number;
  blockNumbers: number[];
}> {
  const client = getClient();

  const latestResult = await client.execute(`SELECT MAX(block_number) as max_block FROM trades`);
  const latestBlock = (latestResult.rows[0] as unknown as { max_block: number | null })?.max_block ?? 0;
  const blocksPerHour = 1800;
  const cutoffBlock = latestBlock - 24 * blocksPerHour;

  const countResult = await client.execute({
    sql: `SELECT COUNT(*) as count FROM trades WHERE origin_from = ? AND block_number >= ?`,
    args: [address.toLowerCase(), cutoffBlock],
  });

  const blockResult = await client.execute({
    sql: `SELECT block_number FROM trades WHERE origin_from = ? ORDER BY block_number ASC`,
    args: [address.toLowerCase()],
  });

  return {
    tradesCount24h: (countResult.rows[0] as unknown as { count: number }).count,
    blockNumbers: blockResult.rows.map((r) => (r as unknown as { block_number: number }).block_number),
  };
}

/** 行数据转换为 OriginMetadata */
function mapRowToMetadata(row: OriginMetadataRow): OriginMetadata {
  return {
    address: row.address,
    isContract: row.is_contract === 1,
    isRelayer: row.is_relayer === 1,
    isProxyWallet: row.is_proxy_wallet === null ? null : row.is_proxy_wallet === 1,
    tradesCount24h: row.trades_count_24h,
    medianTimeGapSec: row.median_time_gap_sec,
    updatedAt: row.updated_at,
  };
}
