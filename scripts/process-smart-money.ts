/**
 * Smart Money 数据处理脚本
 * 从 trades 表生成 fills → positions → trader_stats → scored_traders
 */
import { getTrades, getTradeCount } from "@/db/trades";
import { saveFills, getAllFills, saveScoredTraders } from "@/db/analytics";
import { normalizeAllTrades } from "@/lib/fills";
import { replayPositions } from "@/lib/position";
import { buildTraderStats } from "@/lib/trader-stats";
import { scoreTraders } from "@/lib/scoring";
import { createLogger } from "@/lib/logger";

const logger = createLogger("smart-money-processor");

async function main() {
  logger.info("Starting Smart Money data processing...");

  // 1. 获取所有 trades
  const tradeCount = getTradeCount();
  logger.info(`Found ${tradeCount} trades in database`);

  if (tradeCount === 0) {
    logger.warn("No trades found. Please run the indexer first.");
    return;
  }

  // 分批获取 trades
  const batchSize = 1000;
  let allTrades: ReturnType<typeof getTrades> = [];
  for (let offset = 0; offset < tradeCount; offset += batchSize) {
    const batch = getTrades(batchSize, offset);
    allTrades = allTrades.concat(batch);
  }
  logger.info(`Loaded ${allTrades.length} trades`);

  // 2. 转换为 fills
  logger.info("Converting trades to fills...");
  const fills = normalizeAllTrades(allTrades);
  logger.info(`Generated ${fills.length} fills`);

  // 3. 保存 fills 到数据库
  logger.info("Saving fills to database...");
  const savedFills = saveFills(fills);
  logger.info(`Saved ${savedFills} new fills`);

  // 4. 从数据库读取所有 fills（确保一致性）
  const dbFills = getAllFills();
  logger.info(`Total fills in database: ${dbFills.length}`);

  // 5. Position Replay
  logger.info("Replaying positions...");
  const positions = replayPositions(dbFills);
  logger.info(`Generated ${positions.length} positions`);

  // 6. 构建 Trader 统计
  logger.info("Building trader stats...");
  const stats = buildTraderStats(positions, dbFills);
  logger.info(`Generated stats for ${stats.length} traders`);

  // 7. 评分
  logger.info("Scoring traders...");
  const scored = scoreTraders(stats);
  logger.info(`Scored ${scored.length} qualified traders`);

  // 8. 保存到数据库
  logger.info("Saving scored traders to database...");
  const savedTraders = saveScoredTraders(scored);
  logger.info(`Saved ${savedTraders} traders`);

  // 9. 统计摘要
  if (scored.length > 0) {
    const top5 = scored.slice(0, 5);
    logger.info("Top 5 Smart Traders:");
    top5.forEach((t, i) => {
      logger.info(`  ${i + 1}. ${t.address.slice(0, 10)}... | Score: ${(t.score * 100).toFixed(0)} | PnL: $${t.realizedPnL.toFixed(2)} | ROI: ${t.roi.toFixed(1)}%`);
    });
  }

  logger.info("Smart Money processing complete!");
}

main().catch((err) => {
  logger.error(`Processing failed: ${err.message}`);
  process.exit(1);
});
