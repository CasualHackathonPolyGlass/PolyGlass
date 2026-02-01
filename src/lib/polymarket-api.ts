/**
 * Polymarket Data API 客户端
 * 代理请求到 Polymarket Data API / Gamma API，获取交易员画像数据
 */

import type {
  TraderProfileSummary,
  TraderProfileStats,
  TraderPositionsResponse,
  WhaleLevel,
} from "@/types/trader-profile";

const DATA_API_BASE = "https://data-api.polymarket.com";
const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const TIMEOUT_MS = 20_000;

/** 带超时的 fetch */
async function fetchWithTimeout(url: string, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/** 请求 Data API 并返回 JSON */
async function dataApiGet<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v));
  }
  const res = await fetchWithTimeout(`${DATA_API_BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`Data API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

/** 请求 Gamma API */
async function gammaApiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params);
  const res = await fetchWithTimeout(`${GAMMA_API_BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`Gamma API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── 鲸鱼等级计算 ───

function calcWhaleLevel(maxTrade: number, maxMarket: number): WhaleLevel {
  if (maxTrade >= 10_000 && maxMarket >= 50_000) return "whale";
  if (maxTrade >= 5_000 && maxMarket >= 10_000) return "shark";
  if ((maxTrade >= 500 && maxTrade < 5_000) || (maxMarket >= 2_000 && maxMarket < 10_000)) return "dolphin";
  return "fish";
}

// ─── 各维度数据拉取 ───

interface RawTrade {
  price?: number | string;
  size?: number | string;
  conditionId?: string;
  timestamp?: number | string;
  side?: string;
  outcome?: string;
  outcomeIndex?: number;
  eventSlug?: string;
  [key: string]: unknown;
}

async function fetchPositionsValue(address: string): Promise<number | null> {
  try {
    const data = await dataApiGet<{ value?: number }>("/value", { user: address });
    return data.value ?? null;
  } catch {
    return null;
  }
}

async function fetchPredictionsCount(address: string): Promise<number | null> {
  try {
    const data = await dataApiGet<{ traded?: number }>("/traded", { user: address });
    return data.traded ?? null;
  } catch {
    return null;
  }
}

async function fetchPnlFromLeaderboard(address: string): Promise<number | null> {
  try {
    const data = await dataApiGet<Array<{ pnl?: number }>>("/v1/leaderboard", {
      user: address, timePeriod: "ALL", orderBy: "PNL", limit: 1,
    });
    return data?.[0]?.pnl ?? null;
  } catch {
    return null;
  }
}

async function fetchBiggestWin(address: string): Promise<number | null> {
  try {
    const positions = await dataApiGet<Array<{ realizedPnl?: number | string }>>(
      "/closed-positions",
      { user: address, limit: 500, sortBy: "REALIZEDPNL", sortDirection: "DESC" },
    );
    let maxWin = 0;
    for (const p of positions) {
      const realized = Number(p.realizedPnl ?? 0);
      if (realized > maxWin) maxWin = realized;
    }
    return maxWin > 0 ? maxWin : null;
  } catch {
    return null;
  }
}

async function fetchWinRate(address: string): Promise<number | null> {
  try {
    const positions = await dataApiGet<Array<{ cashPnl?: number | string; realizedPnl?: number | string }>>(
      "/positions", { user: address, limit: 500 },
    );
    if (!positions.length) return null;
    let winning = 0, losing = 0;
    for (const p of positions) {
      const cash = Number(p.cashPnl ?? 0);
      const realized = Number(p.realizedPnl ?? 0);
      const pnl = cash !== 0 ? cash : realized;
      if (pnl > 0) winning++;
      else if (pnl < 0) losing++;
    }
    const total = winning + losing;
    return total === 0 ? null : Math.round((winning / total) * 1000) / 10;
  } catch {
    return null;
  }
}

async function fetchTrades(address: string, limit = 10_000): Promise<RawTrade[]> {
  try {
    return await dataApiGet<RawTrade[]>("/trades", {
      user: address, takerOnly: false, limit, offset: 0,
    });
  } catch {
    return [];
  }
}

interface GammaProfile {
  displayUsernamePublic?: boolean;
  name?: string;
  pseudonym?: string;
  bio?: string;
  profileImage?: string;
  xUsername?: string;
  verifiedBadge?: boolean;
  proxyWallet?: string;
}

async function fetchProfile(address: string): Promise<GammaProfile> {
  try {
    return await gammaApiGet<GammaProfile>("/public-profile", { address });
  } catch {
    return {};
  }
}

// ─── 公开接口 ───

/** 并行获取交易员摘要 */
export async function getTraderProfileSummary(address: string): Promise<TraderProfileSummary> {
  const [profile, positionsValue, predictions, pnl, biggestWin, winRate, trades] = await Promise.all([
    fetchProfile(address),
    fetchPositionsValue(address),
    fetchPredictionsCount(address),
    fetchPnlFromLeaderboard(address),
    fetchBiggestWin(address),
    fetchWinRate(address),
    fetchTrades(address),
  ]);

  let totalVolume = 0;
  let maxTradeValue = 0;
  const marketTotals: Record<string, number> = {};
  const timestamps: number[] = [];
  const activeDaysSet = new Set<string>();

  for (const t of trades) {
    const price = Number(t.price ?? 0);
    const size = Number(t.size ?? 0);
    const usd = price * size;
    totalVolume += usd;
    if (usd > maxTradeValue) maxTradeValue = usd;

    if (t.conditionId) {
      marketTotals[t.conditionId] = (marketTotals[t.conditionId] ?? 0) + usd;
    }
    if (t.timestamp != null) {
      const ts = Number(t.timestamp);
      timestamps.push(ts);
      activeDaysSet.add(new Date(ts * 1000).toISOString().slice(0, 10));
    }
  }

  const maxMarketVolume = Object.values(marketTotals).reduce((a, b) => Math.max(a, b), 0);
  const toIso = (ts: number) => new Date(ts * 1000).toISOString();

  return {
    address,
    positionsValue,
    predictions,
    pnl,
    biggestWin,
    winRate,
    tradeCount: trades.length || null,
    totalVolume: totalVolume || null,
    firstTrade: timestamps.length ? toIso(Math.min(...timestamps)) : null,
    lastTrade: timestamps.length ? toIso(Math.max(...timestamps)) : null,
    activeDays: activeDaysSet.size || null,
    whaleLevel: trades.length ? calcWhaleLevel(maxTradeValue, maxMarketVolume) : null,
    maxTradeValue,
    maxMarketVolume,
    displayUsernamePublic: profile.displayUsernamePublic,
    name: profile.name,
    pseudonym: profile.pseudonym,
    bio: profile.bio,
    profileImage: profile.profileImage,
    xUsername: profile.xUsername,
    verifiedBadge: profile.verifiedBadge,
    proxyWallet: profile.proxyWallet,
    dataPartial: false,
  };
}

/** 获取交易员行为统计 */
export async function getTraderProfileStats(address: string): Promise<TraderProfileStats> {
  const trades = await fetchTrades(address);

  let buyCount = 0, sellCount = 0;
  let buyVolume = 0, sellVolume = 0;
  let yesVolume = 0, totalVolume = 0;
  const hourly = new Array<number>(24).fill(0);
  const eventVolume: Record<string, number> = {};

  for (const t of trades) {
    const price = Number(t.price ?? 0);
    const size = Number(t.size ?? 0);
    const usd = price * size;
    totalVolume += usd;

    const side = (t.side ?? "").toUpperCase();
    if (side === "BUY") { buyCount++; buyVolume += usd; }
    else if (side === "SELL") { sellCount++; sellVolume += usd; }

    if (t.outcome === "YES" || t.outcomeIndex === 0) yesVolume += usd;

    if (t.timestamp != null) {
      let ts = Number(t.timestamp);
      if (ts > 4_102_444_800) ts = Math.floor(ts / 1000);
      hourly[new Date(ts * 1000).getUTCHours()]++;
    }

    if (t.eventSlug) {
      eventVolume[t.eventSlug] = (eventVolume[t.eventSlug] ?? 0) + usd;
    }
  }

  // 获取事件分类
  const categories: Record<string, number> = {};
  const slugs = Object.keys(eventVolume).slice(0, 20);
  const slugCategories = await fetchEventCategories(slugs);
  for (const [slug, vol] of Object.entries(eventVolume)) {
    const cat = slugCategories[slug] ?? "Other";
    categories[cat] = (categories[cat] ?? 0) + vol;
  }

  return {
    buyCount,
    sellCount,
    buyVolume,
    sellVolume,
    yesPreference: totalVolume > 0 ? yesVolume / totalVolume : 0,
    avgTradeSize: trades.length ? totalVolume / trades.length : 0,
    categories,
    hourlyDistribution: hourly,
  };
}

/** 获取持仓数据 */
export async function getTraderPositions(address: string): Promise<TraderPositionsResponse> {
  try {
    const raw = await dataApiGet<Array<Record<string, unknown>>>(
      "/positions", { user: address, limit: 200, sortBy: "TOKENS", sortDirection: "DESC" },
    );
    let totalValue = 0, totalPnl = 0;
    for (const p of raw) {
      totalValue += Number(p.currentValue ?? 0);
      totalPnl += Number(p.cashPnl ?? 0);
    }
    return {
      positions: raw.map((p) => ({
        proxyWallet: p.proxyWallet as string | undefined,
        asset: p.asset as string | undefined,
        conditionId: p.conditionId as string | undefined,
        size: p.size != null ? Number(p.size) : null,
        avgPrice: p.avgPrice != null ? Number(p.avgPrice) : null,
        initialValue: p.initialValue != null ? Number(p.initialValue) : null,
        currentValue: p.currentValue != null ? Number(p.currentValue) : null,
        cashPnl: p.cashPnl != null ? Number(p.cashPnl) : null,
        percentPnl: p.percentPnl != null ? Number(p.percentPnl) : null,
        totalBought: p.totalBought != null ? Number(p.totalBought) : null,
        realizedPnl: p.realizedPnl != null ? Number(p.realizedPnl) : null,
        curPrice: p.curPrice != null ? Number(p.curPrice) : null,
        title: p.title as string | undefined,
        slug: p.slug as string | undefined,
        outcome: p.outcome as string | undefined,
        outcomeIndex: p.outcomeIndex != null ? Number(p.outcomeIndex) : null,
        endDate: p.endDate as string | undefined,
      })),
      summary: { totalPositions: raw.length, totalValue, totalUnrealizedPnl: totalPnl },
    };
  } catch {
    return { positions: [], summary: { totalPositions: 0, totalValue: 0, totalUnrealizedPnl: 0 } };
  }
}

// ─── 内部辅助 ───

async function fetchEventCategories(slugs: string[]): Promise<Record<string, string>> {
  if (!slugs.length) return {};
  const result: Record<string, string> = {};
  const batchSize = 5;
  for (let i = 0; i < slugs.length; i += batchSize) {
    const batch = slugs.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const data = await gammaApiGet<Array<{ category?: string; tags?: Array<{ label?: string }> }>>(
          "/events", { slug },
        );
        const event = data?.[0];
        if (event?.category) return { slug, category: event.category };
        const tag = event?.tags?.find((t) => t.label && t.label.toLowerCase() !== "all");
        return { slug, category: tag?.label ?? "Other" };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") result[r.value.slug] = r.value.category;
    }
  }
  return result;
}
