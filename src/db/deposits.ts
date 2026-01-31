/**
 * Deposits 入金操作模块
 * 处理 USDC 入金/出金记录
 */
import { getClient } from "./init";
import type { Deposit, DepositSummary } from "@/types/deposit";

const INSERT_DEPOSIT_SQL = `
  INSERT OR IGNORE INTO deposits
  (tx_hash, log_index, block_number, from_address, to_address, amount, amount_usdc, token_address, direction)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/** 批量保存 deposits */
export async function saveDeposits(deposits: Deposit[]): Promise<number> {
  const client = getClient();
  const statements = deposits.map((d) => ({
    sql: INSERT_DEPOSIT_SQL,
    args: [
      d.txHash,
      d.logIndex,
      d.blockNumber,
      d.fromAddress.toLowerCase(),
      d.toAddress.toLowerCase(),
      d.amount,
      d.amountUSDC,
      d.tokenAddress.toLowerCase(),
      d.direction,
    ],
  }));
  const results = await client.batch(statements, "write");
  return results.filter((r) => r.rowsAffected > 0).length;
}

/** 获取最新的 deposit 区块号 */
export async function getLatestDepositBlock(): Promise<number> {
  const client = getClient();
  const result = await client.execute(`SELECT MAX(block_number) as max_block FROM deposits`);
  return (result.rows[0] as unknown as { max_block: number | null })?.max_block ?? 0;
}

/** 获取 trades 表最早区块号 */
export async function getEarliestTradeBlock(): Promise<number> {
  const client = getClient();
  const result = await client.execute(`SELECT MIN(block_number) as min_block FROM trades`);
  return (result.rows[0] as unknown as { min_block: number | null })?.min_block ?? 0;
}

/** 获取单个地址的入金汇总 */
export async function getDepositSummary(address: string): Promise<DepositSummary> {
  const client = getClient();
  const addr = address.toLowerCase();

  const inResult = await client.execute({
    sql: `SELECT COALESCE(SUM(amount_usdc), 0) as total, MIN(block_number) as first_block
          FROM deposits WHERE from_address = ? AND direction = 'IN'`,
    args: [addr],
  });

  const outResult = await client.execute({
    sql: `SELECT COALESCE(SUM(amount_usdc), 0) as total
          FROM deposits WHERE to_address = ? AND direction = 'OUT'`,
    args: [addr],
  });

  const inRow = inResult.rows[0] as unknown as { total: number; first_block: number | null };
  const outRow = outResult.rows[0] as unknown as { total: number };
  const totalDeposit = inRow.total;
  const totalWithdraw = outRow.total;

  return {
    address: addr,
    hasDeposit: totalDeposit > 0,
    totalDepositUSDC: totalDeposit,
    totalWithdrawUSDC: totalWithdraw,
    netDepositUSDC: totalDeposit - totalWithdraw,
    firstDepositBlock: inRow.first_block,
  };
}

/** 批量获取多个地址的入金汇总 */
export async function getDepositSummaries(addresses: string[]): Promise<Map<string, DepositSummary>> {
  const client = getClient();
  const result = new Map<string, DepositSummary>();
  if (addresses.length === 0) return result;

  const lowerAddrs = addresses.map((a) => a.toLowerCase());
  const placeholders = lowerAddrs.map(() => "?").join(",");

  // 查询入金
  const inResult = await client.execute({
    sql: `SELECT from_address as addr, SUM(amount_usdc) as total, MIN(block_number) as first_block
          FROM deposits
          WHERE from_address IN (${placeholders}) AND direction = 'IN'
          GROUP BY from_address`,
    args: lowerAddrs,
  });

  // 查询出金
  const outResult = await client.execute({
    sql: `SELECT to_address as addr, SUM(amount_usdc) as total
          FROM deposits
          WHERE to_address IN (${placeholders}) AND direction = 'OUT'
          GROUP BY to_address`,
    args: lowerAddrs,
  });

  // 合并结果
  const inMap = new Map(
    inResult.rows.map((r) => {
      const row = r as unknown as { addr: string; total: number; first_block: number };
      return [row.addr, { total: row.total, firstBlock: row.first_block }];
    })
  );
  const outMap = new Map(
    outResult.rows.map((r) => {
      const row = r as unknown as { addr: string; total: number };
      return [row.addr, row.total];
    })
  );

  for (const addr of lowerAddrs) {
    const inData = inMap.get(addr) ?? { total: 0, firstBlock: null };
    const outTotal = outMap.get(addr) ?? 0;
    result.set(addr, {
      address: addr,
      hasDeposit: inData.total > 0,
      totalDepositUSDC: inData.total,
      totalWithdrawUSDC: outTotal,
      netDepositUSDC: inData.total - outTotal,
      firstDepositBlock: inData.firstBlock,
    });
  }

  return result;
}

/** 更新 trader_stats 的 has_deposit 和 net_deposit_usdc */
export async function updateTraderDeposits(summaries: Map<string, DepositSummary>): Promise<number> {
  const client = getClient();
  const statements = Array.from(summaries.entries()).map(([addr, summary]) => ({
    sql: `UPDATE trader_stats SET has_deposit = ?, net_deposit_usdc = ? WHERE address = ?`,
    args: [summary.hasDeposit ? 1 : 0, summary.netDepositUSDC, addr],
  }));
  const results = await client.batch(statements, "write");
  return results.filter((r) => r.rowsAffected > 0).length;
}

/** 获取所有 trader_stats 中的地址 */
export async function getAllTraderAddresses(): Promise<string[]> {
  const client = getClient();
  const result = await client.execute(`SELECT address FROM trader_stats`);
  return result.rows.map((r) => (r as unknown as { address: string }).address);
}
