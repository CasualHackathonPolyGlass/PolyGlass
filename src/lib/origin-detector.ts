/**
 * Origin 地址检测模块
 * - EOA vs Contract 检测（eth_getCode）
 * - Relayer 识别（基于交易行为）
 */
import { rpcCallWithRetry } from "@/indexer/rpc";
import type { OriginType, RelayerConfig } from "@/types/origin";

/** 默认 Relayer 检测阈值（只用前两个规则，不调用 eth_getTransactionCount） */
export const DEFAULT_RELAYER_CONFIG: RelayerConfig = {
  tradesCount24hThreshold: 500,
  medianTimeGapSecThreshold: 30,
  txCountThreshold: 100000, // 不使用，保留配置兼容性
};

/**
 * 通过 eth_getCode 检测地址类型
 * @returns "EOA" 如果没有代码，"CONTRACT" 如果有代码
 */
export async function detectOriginType(address: string): Promise<OriginType> {
  try {
    const code = await rpcCallWithRetry("eth_getCode", [address, "latest"]);
    const codeStr = code as string;
    // 空代码表示 EOA
    return codeStr === "0x" || codeStr === "0x0" ? "EOA" : "CONTRACT";
  } catch {
    // 如果 RPC 调用失败，默认为 EOA
    return "EOA";
  }
}

/**
 * 批量检测地址类型（带并发控制）
 */
export async function detectOriginTypeBatch(
  addresses: string[],
  parallel: number = 10
): Promise<Map<string, OriginType>> {
  const result = new Map<string, OriginType>();

  for (let i = 0; i < addresses.length; i += parallel) {
    const batch = addresses.slice(i, i + parallel);
    const types = await Promise.all(
      batch.map(async (addr) => {
        const type = await detectOriginType(addr);
        return { addr, type };
      })
    );
    for (const { addr, type } of types) {
      result.set(addr.toLowerCase(), type);
    }
  }

  return result;
}

/**
 * 检测是否是 Relayer（基于交易行为）
 * 规则：
 * 1. 过去 24h 交易数 > 500
 * 2. 交易时间间隔中位数 < 30s
 */
export function isRelayer(
  tradesCount24h: number,
  medianTimeGapSec: number | null,
  config: RelayerConfig = DEFAULT_RELAYER_CONFIG
): boolean {
  // 规则1：24h 交易数超过阈值
  if (tradesCount24h > config.tradesCount24hThreshold) {
    return true;
  }
  // 规则2：交易时间间隔中位数小于阈值（秒）
  if (
    medianTimeGapSec !== null &&
    medianTimeGapSec < config.medianTimeGapSecThreshold
  ) {
    return true;
  }
  return false;
}

/**
 * 计算区块号序列的时间间隔中位数（秒）
 * 假设 Polygon 出块时间约 2 秒
 */
export function calculateMedianTimeGap(blockNumbers: number[]): number | null {
  if (blockNumbers.length < 2) return null;

  // 排序
  const sorted = [...blockNumbers].sort((a, b) => a - b);

  // 计算相邻区块的间隔（转为秒，Polygon ~2s/block）
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const blockGap = sorted[i] - sorted[i - 1];
    gaps.push(blockGap * 2); // 2 seconds per block
  }

  if (gaps.length === 0) return null;

  // 计算中位数
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  if (gaps.length % 2 === 1) {
    return gaps[mid];
  }
  return (gaps[mid - 1] + gaps[mid]) / 2;
}

/**
 * 批量计算多个地址的 relayer 状态
 */
export function detectRelayerBatch(
  addressStats: Array<{
    address: string;
    tradesCount24h: number;
    blockNumbers: number[];
  }>,
  config: RelayerConfig = DEFAULT_RELAYER_CONFIG
): Map<string, { isRelayer: boolean; medianTimeGapSec: number | null }> {
  const result = new Map<
    string,
    { isRelayer: boolean; medianTimeGapSec: number | null }
  >();

  for (const stats of addressStats) {
    const medianTimeGapSec = calculateMedianTimeGap(stats.blockNumbers);
    const relayer = isRelayer(stats.tradesCount24h, medianTimeGapSec, config);
    result.set(stats.address.toLowerCase(), {
      isRelayer: relayer,
      medianTimeGapSec,
    });
  }

  return result;
}
