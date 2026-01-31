/**
 * 回填 origin_type（EOA/CONTRACT）
 * 使用 eth_getCode 批量检测
 *
 * 用法: pnpm tsx scripts/backfill-origin-type.ts
 */
import { getAddressesNeedingOriginType, updateTradesOriginType, saveOriginMetadata } from "../src/db/origin";
import { detectOriginTypeBatch } from "../src/lib/origin-detector";
import type { OriginMetadata } from "../src/types/origin";

const BATCH_SIZE = 100;
const PARALLEL = 10;

async function backfillOriginType() {
  console.log("开始回填 origin_type...\n");

  let totalProcessed = 0;
  let hasMore = true;

  while (hasMore) {
    // 获取需要处理的地址
    const addresses = await getAddressesNeedingOriginType(BATCH_SIZE);
    if (addresses.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`处理批次: ${addresses.length} 个地址`);

    // 批量检测 origin type
    const typeMap = await detectOriginTypeBatch(addresses, PARALLEL);

    // 更新数据库
    for (const [addr, originType] of typeMap) {
      // 更新 trades 表
      const updated = await updateTradesOriginType(addr, originType);
      console.log(`  ${addr.slice(0, 10)}... → ${originType} (${updated} trades)`);

      // 保存到 origin_metadata 表
      const metadata: OriginMetadata = {
        address: addr,
        isContract: originType === "CONTRACT",
        isRelayer: false,
        isProxyWallet: null,
        tradesCount24h: 0,
        medianTimeGapSec: null,
        updatedAt: new Date().toISOString(),
      };
      await saveOriginMetadata(metadata);
    }

    totalProcessed += addresses.length;
    console.log(`  批次完成，累计处理 ${totalProcessed} 个地址\n`);

    // 短暂延迟，避免 RPC 限流
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("========================================");
  console.log(`origin_type 回填完成！共处理 ${totalProcessed} 个地址`);
  console.log("========================================");
  console.log("\n下一步: pnpm tsx scripts/backfill-relayer.ts");
}

backfillOriginType().catch((err) => {
  console.error("回填失败:", err);
  process.exit(1);
});
