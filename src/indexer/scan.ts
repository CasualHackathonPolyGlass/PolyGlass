/**
 * 模块B：日志扫描器
 * 从 Polygon 链上扫描 OrderFilled 事件日志
 * 策略：从最新区块向前扫描，使用并行请求加速
 */
import { createLogger } from "@/lib/logger";
import {
  EXCHANGE_ADDRESSES,
  ORDER_FILLED_TOPIC,
  SCAN_WINDOW,
  MIN_LOGS,
  BLOCKS_3_DAYS,
  PARALLEL_REQUESTS,
} from "./config";
import { getLatestBlock, getLogs } from "./rpc";
import type { RawLog } from "@/types/trade";

const logger = createLogger("scanner");

interface BlockRange {
  fromBlock: number;
  toBlock: number;
}

/**
 * 并行获取多个区块范围的日志
 */
async function fetchParallel(ranges: BlockRange[]): Promise<RawLog[]> {
  const results = await Promise.allSettled(
    ranges.map((r) =>
      getLogs({
        fromBlock: r.fromBlock,
        toBlock: r.toBlock,
        address: EXCHANGE_ADDRESSES,
        topics: [ORDER_FILLED_TOPIC],
      })
    )
  );

  const logs: RawLog[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      logs.push(...result.value);
    }
  }
  return logs;
}

/**
 * 扫描 OrderFilled 日志（最近 3 天），直到满足最小数量要求
 */
export async function scanUntilEnough(minLogs = MIN_LOGS): Promise<RawLog[]> {
  const logs: RawLog[] = [];
  const latestBlock = await getLatestBlock();
  const minBlock = Math.max(0, latestBlock - BLOCKS_3_DAYS);

  let toBlock = latestBlock;
  const window = SCAN_WINDOW;

  logger.info(
    `Starting scan from block ${latestBlock}, min block: ${minBlock}, target: ${minLogs} logs`
  );

  while (logs.length < minLogs && toBlock > minBlock) {
    // 生成并行请求的区块范围
    const ranges: BlockRange[] = [];
    for (let i = 0; i < PARALLEL_REQUESTS && toBlock > minBlock; i++) {
      // 注意：Alchemy 的 10 block 限制是 inclusive，需要 +1
      const fromBlock = Math.max(minBlock, toBlock - window + 1);
      ranges.push({ fromBlock, toBlock });
      toBlock = fromBlock - 1;
    }

    if (ranges.length === 0) break;

    try {
      const batch = await fetchParallel(ranges);
      logs.push(...batch);

      const rangeStr = `${ranges[ranges.length - 1].fromBlock}-${ranges[0].toBlock}`;
      logger.info(`Scanned ${rangeStr}: +${batch.length} logs (total: ${logs.length})`);
    } catch (err) {
      logger.error(`Scan failed: ${err}`);
      throw err;
    }
  }

  logger.info(`Scan complete: ${logs.length} logs collected`);
  return logs;
}

/**
 * 扫描指定区块范围（用于增量更新）
 */
export async function scanBlockRange(
  fromBlock: number,
  toBlock: number
): Promise<RawLog[]> {
  logger.info(`Scanning block range ${fromBlock}-${toBlock}`);
  const logs: RawLog[] = [];
  let current = toBlock;

  while (current >= fromBlock) {
    const ranges: BlockRange[] = [];
    for (let i = 0; i < PARALLEL_REQUESTS && current >= fromBlock; i++) {
      const start = Math.max(fromBlock, current - SCAN_WINDOW + 1);
      ranges.push({ fromBlock: start, toBlock: current });
      current = start - 1;
    }

    if (ranges.length === 0) break;

    const batch = await fetchParallel(ranges);
    logs.push(...batch);
  }

  return logs;
}
