/**
 * 回填 origin_is_relayer
 * 基于交易行为检测 Relayer
 *
 * 规则：
 * 1. 过去 24h 交易数 > 500
 * 2. 交易时间间隔中位数 < 30s
 *
 * 用法: pnpm tsx scripts/backfill-relayer.ts
 */
import {
  getAddressesNeedingRelayerCheck,
  getAddressTradeStats,
  updateTradesRelayerFlag,
  saveOriginMetadata,
  getOriginMetadata,
} from "../src/db/origin";
import { calculateMedianTimeGap, isRelayer, DEFAULT_RELAYER_CONFIG } from "../src/lib/origin-detector";
import type { OriginMetadata } from "../src/types/origin";

const BATCH_SIZE = 100;

async function backfillRelayer() {
  console.log("开始回填 origin_is_relayer...\n");
  console.log("检测规则：");
  console.log(`  - 24h 交易数 > ${DEFAULT_RELAYER_CONFIG.tradesCount24hThreshold}`);
  console.log(`  - 交易间隔中位数 < ${DEFAULT_RELAYER_CONFIG.medianTimeGapSecThreshold}s`);
  console.log("");

  let totalProcessed = 0;
  let relayerCount = 0;
  let hasMore = true;

  while (hasMore) {
    const addresses = await getAddressesNeedingRelayerCheck(BATCH_SIZE);
    if (addresses.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`处理批次: ${addresses.length} 个地址`);

    for (const addr of addresses) {
      const stats = await getAddressTradeStats(addr);
      const medianTimeGapSec = calculateMedianTimeGap(stats.blockNumbers);
      const relayer = isRelayer(stats.tradesCount24h, medianTimeGapSec);

      await updateTradesRelayerFlag(addr, relayer);

      const existing = await getOriginMetadata(addr);
      const metadata: OriginMetadata = {
        address: addr,
        isContract: existing?.isContract ?? false,
        isRelayer: relayer,
        isProxyWallet: existing?.isProxyWallet ?? null,
        tradesCount24h: stats.tradesCount24h,
        medianTimeGapSec: medianTimeGapSec,
        updatedAt: new Date().toISOString(),
      };
      await saveOriginMetadata(metadata);

      if (relayer) {
        relayerCount++;
        console.log(`  ⚠️  ${addr.slice(0, 10)}... → RELAYER (24h: ${stats.tradesCount24h}, gap: ${medianTimeGapSec?.toFixed(1)}s)`);
      } else {
        console.log(`  ✓  ${addr.slice(0, 10)}... → normal (24h: ${stats.tradesCount24h}, gap: ${medianTimeGapSec?.toFixed(1) ?? "N/A"}s)`);
      }
    }

    totalProcessed += addresses.length;
    console.log(`  批次完成，累计处理 ${totalProcessed} 个地址\n`);
  }

  console.log("========================================");
  console.log(`relayer 回填完成！`);
  console.log(`   处理: ${totalProcessed} 个地址`);
  console.log(`   识别为 Relayer: ${relayerCount} 个`);
  console.log("========================================");
  console.log("\n下一步: pnpm tsx scripts/backfill-deposits.ts");
}

backfillRelayer().catch((err) => {
  console.error("回填失败:", err);
  process.exit(1);
});
