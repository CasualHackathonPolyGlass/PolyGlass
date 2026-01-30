/**
 * 模块A：市场数据对外接口
 * 提供带缓存降级的市场数据获取
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { createLogger } from "@/lib/logger";
import { getCached, seedCache } from "@/lib/cache";
import { fetchGammaMarkets } from "./gamma";
import { buildMarketData } from "./tokenMap";
import type { MarketData } from "@/types/market";

const logger = createLogger("markets");
const CACHE_PATH = join(process.cwd(), "data", "markets-cache.json");
const CACHE_KEY = "markets-data";
const CACHE_TTL = 60 * 1000; // 60 秒内存缓存

/**
 * 从 Gamma API 获取并构建市场数据（内部方法）
 */
async function fetchAndBuildMarkets(): Promise<MarketData> {
  const raw = await fetchGammaMarkets();
  const result = buildMarketData(raw);

  // 写入本地文件缓存（用于降级）
  try {
    const dir = dirname(CACHE_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CACHE_PATH, JSON.stringify(result, null, 2));
    logger.info(`File cache updated: ${CACHE_PATH}`);
  } catch (err) {
    logger.warn(`Failed to write file cache: ${err}`);
  }

  return result;
}

/**
 * 从本地文件缓存加载数据
 */
function loadFromFileCache(): MarketData | null {
  if (!existsSync(CACHE_PATH)) {
    return null;
  }
  try {
    const cached: MarketData = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
    logger.info(`Loaded ${cached.markets.length} markets from file cache`);
    return cached;
  } catch {
    return null;
  }
}

/**
 * 用文件缓存预热内存缓存（进程启动时首次请求立即返回）
 */
function warmUpFromFileCache(): void {
  const fileCached = loadFromFileCache();
  if (fileCached) {
    seedCache(CACHE_KEY, fileCached);
    logger.info("Memory cache warmed up from file cache");
  }
}

// 进程启动时尝试预热
warmUpFromFileCache();

/**
 * 获取市场数据（带内存缓存 + 文件降级）
 * - 进程启动时文件缓存预热内存，首次请求秒返回
 * - 内存缓存过期后返回旧数据并后台刷新
 * - API 失败时回退到文件缓存
 */
export async function fetchMarketsWithFallback(): Promise<MarketData> {
  try {
    return await getCached(
      CACHE_KEY,
      async () => {
        try {
          return await fetchAndBuildMarkets();
        } catch (err) {
          logger.warn(`Gamma API failed, trying file cache: ${err}`);
          const fileCached = loadFromFileCache();
          if (fileCached) {
            return fileCached;
          }
          throw err;
        }
      },
      { ttl: CACHE_TTL, staleWhileRevalidate: true }
    );
  } catch (err) {
    const fileCached = loadFromFileCache();
    if (fileCached) {
      return fileCached;
    }
    throw new Error(`Gamma API failed and no cache available: ${err}`);
  }
}

export { fetchGammaMarkets } from "./gamma";
export { buildMarketData } from "./tokenMap";
