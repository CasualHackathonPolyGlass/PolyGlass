/**
 * 数据质量验证脚本
 * 检查是否符合 MVP 验收标准
 */
import { getDb } from "../src/db";
import { createLogger } from "../src/lib/logger";

const logger = createLogger("validate");

function main() {
  logger.info("=== Running Data Validation ===\n");

  const db = getDb();
  let passed = true;

  // 1. 检查 trades 数量
  const tradeCount = (db.prepare("SELECT COUNT(*) as c FROM trades").get() as { c: number }).c;
  logger.info(`Trades count: ${tradeCount}`);
  if (tradeCount < 100) {
    logger.error("FAIL: trades < 100");
    passed = false;
  } else {
    logger.info("PASS: trades >= 100");
  }

  // 2. 检查 txHash 格式
  const invalidTx = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM trades
       WHERE tx_hash NOT LIKE '0x%' OR LENGTH(tx_hash) != 66`
      )
      .get() as { c: number }
  ).c;
  if (invalidTx > 0) {
    logger.error(`FAIL: ${invalidTx} invalid txHash`);
    passed = false;
  } else {
    logger.info("PASS: All txHash valid");
  }

  // 3. 检查 price 范围
  const priceAnomalies = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM trades
       WHERE price <= 0 OR price >= 1 OR price IS NULL`
      )
      .get() as { c: number }
  ).c;
  const priceRate = tradeCount > 0 ? priceAnomalies / tradeCount : 0;
  logger.info(`Price anomalies: ${priceAnomalies} (${(priceRate * 100).toFixed(1)}%)`);
  if (priceRate > 0.1) {
    logger.error("FAIL: > 10% price anomalies");
    passed = false;
  } else {
    logger.info("PASS: Price anomalies < 10%");
  }

  // 4. 检查必填字段
  const emptyFields = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM trades
       WHERE maker = '' OR taker = '' OR direction = ''`
      )
      .get() as { c: number }
  ).c;
  if (emptyFields > 0) {
    logger.error(`FAIL: ${emptyFields} empty required fields`);
    passed = false;
  } else {
    logger.info("PASS: All required fields filled");
  }

  // 5. 检查 market 命中率
  const resolved = (
    db.prepare("SELECT COUNT(*) as c FROM trades WHERE market_id IS NOT NULL").get() as {
      c: number;
    }
  ).c;
  const hitRate = tradeCount > 0 ? resolved / tradeCount : 0;
  logger.info(`Market hit rate: ${(hitRate * 100).toFixed(1)}%`);
  if (hitRate < 0.8) {
    logger.warn("WARN: market hit rate < 80%");
  } else {
    logger.info("PASS: Market hit rate >= 80%");
  }

  // 6. 检查 markets 表
  const marketCount = (db.prepare("SELECT COUNT(*) as c FROM markets").get() as { c: number }).c;
  logger.info(`Markets count: ${marketCount}`);
  if (marketCount === 0) {
    logger.error("FAIL: No markets in database");
    passed = false;
  } else {
    logger.info("PASS: Markets exist");
  }

  // 结果
  logger.info("\n=== Validation Complete ===");
  if (passed) {
    logger.info("All validations PASSED!");
    process.exit(0);
  } else {
    logger.error("Some validations FAILED!");
    process.exit(1);
  }
}

main();
