/**
 * 数据拉取管道脚本
 * 串联 模块A → B → C → D → E
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// 加载环境变量
function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  }
}
loadEnv();

import { fetchMarketsWithFallback } from "../src/markets";
import { scanUntilEnough } from "../src/indexer";
import { decodeLogs } from "../src/decoder";
import { resolveTrades } from "../src/resolver";
import { saveMarkets, saveTrades, saveEvents, saveMarketEvents } from "../src/db";
import { createLogger } from "../src/lib/logger";

const logger = createLogger("fetch");

async function main() {
  logger.info("=== Polymarket Data Fetch Pipeline ===");

  // Step 1: 拉取市场数据
  logger.info("[1/5] Fetching markets from Gamma API...");
  const { markets, events, marketEvents, tokenMap } = await fetchMarketsWithFallback();
  const savedMarkets = saveMarkets(markets);
  logger.info(`Saved ${savedMarkets} markets`);

  // Step 1b: 保存事件数据
  if (events.length > 0) {
    const savedEvents = saveEvents(events);
    const savedRelations = saveMarketEvents(marketEvents);
    logger.info(`Saved ${savedEvents} events, ${savedRelations} market-event relations`);
  }

  // Step 2: 扫描链上日志
  logger.info("[2/5] Scanning OrderFilled logs from Polygon...");
  const logs = await scanUntilEnough();
  logger.info(`Found ${logs.length} raw logs`);

  // Step 3: 解码事件
  logger.info("[3/5] Decoding logs...");
  const { trades: decoded, errors } = decodeLogs(logs);
  logger.info(`Decoded ${decoded.length} trades (${errors.length} errors)`);

  // Step 4: 归类市场
  logger.info("[4/5] Resolving markets...");
  const { resolved, unresolved } = resolveTrades(decoded, tokenMap);
  logger.info(`Resolved ${resolved.length}, unresolved ${unresolved.length}`);

  // Step 5: 存入数据库
  logger.info("[5/5] Saving to database...");
  const savedTrades = saveTrades(resolved);
  logger.info(`Saved ${savedTrades} new trades`);

  logger.info("=== Pipeline Complete ===");
  logger.info(`Markets: ${savedMarkets}, Trades: ${savedTrades}`);
}

main().catch((err) => {
  logger.error(`Pipeline failed: ${err}`);
  process.exit(1);
});
