/**
 * 模块A：Gamma API 客户端
 * 从 Polymarket Gamma API 获取市场数据
 */
import { createLogger } from "@/lib/logger";
import type { GammaMarketResponse } from "@/types/market";

const logger = createLogger("gamma");
const GAMMA_API_BASE = process.env.GAMMA_API_BASE || "https://gamma-api.polymarket.com";
const GAMMA_LIMIT = 500;
const MAX_MARKETS = 10000; // MVP: 限制最多拉取市场数

/**
 * 从 Gamma API 获取一页市场数据
 * 按 ID 降序排列，获取最新市场
 */
async function fetchPage(offset: number, limit: number): Promise<GammaMarketResponse[]> {
  const url = `${GAMMA_API_BASE}/markets?active=true&limit=${limit}&offset=${offset}&order=id&ascending=false`;
  logger.debug(`Fetching: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gamma API failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * 获取活跃市场（自动分页，限制最大数量）
 */
export async function fetchGammaMarkets(maxMarkets = MAX_MARKETS): Promise<GammaMarketResponse[]> {
  const allMarkets: GammaMarketResponse[] = [];
  let offset = 0;

  while (allMarkets.length < maxMarkets) {
    const batch = await fetchPage(offset, GAMMA_LIMIT);
    allMarkets.push(...batch);
    logger.info(`Fetched ${batch.length} markets (total: ${allMarkets.length})`);

    if (batch.length < GAMMA_LIMIT) break;
    offset += GAMMA_LIMIT;
  }

  logger.info(`Market fetch complete: ${allMarkets.length} markets`);
  return allMarkets.slice(0, maxMarkets);
}
