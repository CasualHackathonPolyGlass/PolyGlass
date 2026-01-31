/**
 * 回填 deposits 表
 * 扫描历史 USDC Transfer 事件到 Polymarket vaults
 *
 * 用法: pnpm tsx scripts/backfill-deposits.ts
 */
import { getLatestBlock } from "../src/indexer/rpc";
import {
  saveDeposits,
  getLatestDepositBlock,
  getEarliestTradeBlock,
  getDepositSummaries,
  updateTraderDeposits,
  getAllTraderAddresses,
} from "../src/db/deposits";
import { scanDepositsBatch, POLYMARKET_VAULTS } from "../src/lib/deposit-scanner";

const BATCH_SIZE = 10; // RPC 免费版限制每次最多 10 个区块

async function backfillDeposits() {
  console.log("开始回填 deposits...\n");
  console.log("监控的 Polymarket Vault 地址:");
  for (const vault of POLYMARKET_VAULTS) {
    console.log(`  - ${vault}`);
  }
  console.log("");

  // 确定扫描范围
  const earliestTradeBlock = await getEarliestTradeBlock();
  const latestDepositBlock = await getLatestDepositBlock();
  const latestBlock = await getLatestBlock();

  const fromBlock = latestDepositBlock > 0 ? latestDepositBlock + 1 : earliestTradeBlock;
  const toBlock = latestBlock;

  if (fromBlock > toBlock) {
    console.log("deposits 已是最新，无需扫描");
    await updateTraderStats();
    return;
  }

  console.log(`扫描范围: ${fromBlock} → ${toBlock} (${toBlock - fromBlock + 1} 区块)`);
  console.log("");

  // 分批扫描
  const deposits = await scanDepositsBatch(
    fromBlock,
    toBlock,
    BATCH_SIZE,
    (scanned, total) => {
      const pct = ((scanned / total) * 100).toFixed(1);
      process.stdout.write(`\r扫描进度: ${pct}% (${scanned}/${total} 区块)`);
    }
  );

  console.log(`\n\n扫描完成，共发现 ${deposits.length} 条 deposit/withdraw 记录`);

  // 保存到数据库
  if (deposits.length > 0) {
    const saved = await saveDeposits(deposits);
    console.log(`保存到数据库: ${saved} 条新记录`);
  }

  // 统计
  const inCount = deposits.filter((d) => d.direction === "IN").length;
  const outCount = deposits.filter((d) => d.direction === "OUT").length;
  const inTotal = deposits
    .filter((d) => d.direction === "IN")
    .reduce((sum, d) => sum + d.amountUSDC, 0);
  const outTotal = deposits
    .filter((d) => d.direction === "OUT")
    .reduce((sum, d) => sum + d.amountUSDC, 0);

  console.log(`\n统计:`);
  console.log(`  入金: ${inCount} 笔, $${inTotal.toLocaleString()}`);
  console.log(`  出金: ${outCount} 笔, $${outTotal.toLocaleString()}`);

  await updateTraderStats();
}

async function updateTraderStats() {
  console.log("\n更新 trader_stats 表的 has_deposit 和 net_deposit_usdc...");

  const traderAddresses = await getAllTraderAddresses();
  console.log(`共 ${traderAddresses.length} 个 trader 需要更新`);

  if (traderAddresses.length === 0) {
    console.log("没有 trader 需要更新");
    return;
  }

  const summaries = await getDepositSummaries(traderAddresses);
  const updated = await updateTraderDeposits(summaries);
  console.log(`更新完成: ${updated} 条记录`);

  let hasDepositCount = 0;
  for (const summary of summaries.values()) {
    if (summary.hasDeposit) hasDepositCount++;
  }
  console.log(`有入金记录的 trader: ${hasDepositCount} 个`);

  console.log("\n========================================");
  console.log("deposits 回填完成！");
  console.log("========================================");
}

backfillDeposits().catch((err) => {
  console.error("回填失败:", err);
  process.exit(1);
});
