import { z } from "zod";

// Polymarket API bases
const GAMMA_BASE = "https://gamma-api.polymarket.com" as const;
const CLOB_BASE = "https://clob.polymarket.com" as const;
const DATA_BASE = "https://data-api.polymarket.com" as const;

type AnyObj = Record<string, any>;

interface MarketSummary {
  question: string;
  close_time?: string | number;
  resolution_source?: string;
  volume?: number;
  liquidity?: number;
  condition_id?: string;
  token_map: { [outcome: string]: string };
}

interface MarketStateNowEntry {
  token_id: string;
  outcome?: string;
  bid?: number | null;
  ask?: number | null;
  mid?: number | null;
  top_bid_size?: number | null;
  top_ask_size?: number | null;
}

interface LLMPayload {
  market_facts: MarketSummary;
  market_state_now: MarketStateNowEntry[];
  history: { token_id: string; points: { t: number; p: number }[] }[];
  order_books?: AnyObj[];
  recent_trades?: AnyObj[];
}

interface LLMPayloadEnhanced extends LLMPayload {
  event_summary?: {
    is_multi_candidate: boolean;
    total_markets: number;
    active_markets: number;
    top_candidates: Array<{
      name: string;
      question: string;
      implied_probability: number;
      volume: number;
      liquidity: number;
      active: boolean;
      market: AnyObj;
    }>;
  };
}

// Utility
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function http<T = any>(
  input: RequestInfo,
  init?: RequestInit,
  retries = 3
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(input, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
      if (res.ok) {
        const text = await res.text();
        clearTimeout(timeoutId);
        return (text ? JSON.parse(text) : (undefined as any)) as T;
      }
      if (res.status >= 500 || res.status === 429) {
        await sleep(300 * (i + 1));
        continue;
      }
      const errorText = await res.text();
      clearTimeout(timeoutId);
      throw new Error(
        `HTTP ${res.status} ${res.statusText}: ${errorText} for ${
          typeof input === "string" ? input : (input as any).toString()
        }`
      );
    } catch (err) {
      clearTimeout(timeoutId);
      if (i === retries - 1) throw err;
      await sleep(300 * (i + 1));
    }
  }
  throw new Error(
    `Failed after ${retries} retries: ${
      typeof input === "string" ? input : (input as any).toString()
    }`
  );
}

// ---- Gamma (discovery) ----
async function getMarketBySlug(slug: string): Promise<AnyObj> {
  const url = `${GAMMA_BASE}/markets?slug=${encodeURIComponent(slug)}`;
  const arr = await http<AnyObj[]>(url);
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`No market found for slug: ${slug}`);
  }
  return arr[0];
}

async function getEventBySlug(slug: string): Promise<AnyObj> {
  const url = `${GAMMA_BASE}/events?slug=${encodeURIComponent(slug)}`;
  const arr = await http<AnyObj[]>(url);
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`No event found for slug: ${slug}`);
  }
  return arr[0];
}

// ---- Extractors ----
function extractConditionId(m: AnyObj): string | undefined {
  return (
    m.condition_id || m.conditionId || m?.clob?.condition_id || m?.event?.condition_id
  );
}
function extractCloseTime(m: AnyObj): string | number | undefined {
  return m.close_time || m.end_time || m.endDate || m.closeDate || m?.close_ts;
}
function extractResolutionSource(m: AnyObj): string | undefined {
  return m.resolution_source || m.resolutionSource || m?.rules || m?.resolution_criteria;
}
function extractVolume(m: AnyObj): number | undefined {
  return m.volume || m.total_volume || m?.stats?.volume;
}
function extractLiquidity(m: AnyObj): number | undefined {
  return m.liquidity || m?.stats?.liquidity;
}
function extractQuestion(m: AnyObj): string {
  return m.question || m.title || m.name || "";
}
function extractOutcomeTokens(m: AnyObj): { [outcome: string]: string } {
  const map: { [k: string]: string } = {};
  // clobTokenIds + outcomes (stringified arrays)
  if (m.clobTokenIds && m.outcomes) {
    let tokenIds: string[] = [];
    let outcomes: string[] = [];
    tokenIds = typeof m.clobTokenIds === "string" ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
    outcomes = typeof m.outcomes === "string" ? JSON.parse(m.outcomes) : m.outcomes;
    for (let i = 0; i < Math.min(outcomes.length, tokenIds.length); i++) {
      if (outcomes[i] && tokenIds[i]) map[outcomes[i]] = tokenIds[i];
    }
  }
  // legacy map
  if (!Object.keys(map).length && m.clob_token_ids && typeof m.clob_token_ids === "object") {
    for (const [k, v] of Object.entries(m.clob_token_ids as AnyObj)) {
      if (typeof v === "string") map[k] = v;
    }
  }
  // outcomes array with token info
  if (!Object.keys(map).length && Array.isArray(m.outcomes)) {
    for (const o of m.outcomes) {
      if (typeof o === "object") {
        const label = o.name || o.outcome || o.ticker || o.symbol || o.id || "outcome";
        const tid = o.token_id || o.tokenId || o.clob_token_id || o.asset_id || o.id;
        if (tid) map[label] = tid;
      }
    }
  }
  // tokens array
  if (!Object.keys(map).length && Array.isArray(m.tokens)) {
    for (const t of m.tokens) {
      const label = t.name || t.ticker || t.symbol || t.outcome || t.side || "token";
      const tid = t.token_id || t.tokenId || t.clob_token_id || t.asset_id || t.id;
      if (tid) map[label] = tid;
    }
  }
  // single-binary
  if (!Object.keys(map).length) {
    const yes = m.yes_token_id || m.yesTokenId;
    const no = m.no_token_id || m.noTokenId;
    if (yes) map["Yes"] = yes;
    if (no) map["No"] = no;
  }
  if (!Object.keys(map).length) {
    throw new Error("Could not resolve outcome token IDs from market payload.");
  }
  return map;
}

async function buildMarketSummary(m: AnyObj): Promise<MarketSummary> {
  return {
    question: extractQuestion(m),
    close_time: extractCloseTime(m),
    resolution_source: extractResolutionSource(m),
    volume: extractVolume(m),
    liquidity: extractLiquidity(m),
    condition_id: extractConditionId(m),
    token_map: extractOutcomeTokens(m),
  };
}

// ---- CLOB (live) ----
async function getBestBidAsk(
  tokenIds: string[]
): Promise<Record<string, { BUY?: number; SELL?: number }>> {
  const result: Record<string, { BUY?: number; SELL?: number }> = {};
  for (const token_id of tokenIds) {
    try {
      const buyUrl = `${CLOB_BASE}/price?token_id=${encodeURIComponent(token_id)}&side=buy`;
      const sellUrl = `${CLOB_BASE}/price?token_id=${encodeURIComponent(token_id)}&side=sell`;
      const [buyRes, sellRes] = await Promise.all([
        http<{ price: string }>(buyUrl),
        http<{ price: string }>(sellUrl),
      ]);
      result[token_id] = {};
      if (buyRes?.price) result[token_id].BUY = parseFloat(buyRes.price);
      if (sellRes?.price) result[token_id].SELL = parseFloat(sellRes.price);
    } catch (_) {
      // continue
    }
  }
  return result;
}

async function getOrderBook(token_id: string): Promise<AnyObj> {
  const url = `${CLOB_BASE}/book?token_id=${encodeURIComponent(token_id)}`;
  return await http<AnyObj>(url);
}

async function getTopOfBookSizes(book: AnyObj): Promise<{ top_bid_size: number | null; top_ask_size: number | null; }> {
  const bids = Array.isArray(book?.bids) ? book.bids : [];
  const asks = Array.isArray(book?.asks) ? book.asks : [];
  const topBid = bids[0];
  const topAsk = asks[0];
  const top_bid_size = topBid ? Number(topBid.size || topBid[1] || null) : null;
  const top_ask_size = topAsk ? Number(topAsk.size || topAsk[1] || null) : null;
  return { top_bid_size, top_ask_size };
}

// ---- History ----
async function getPriceHistory(token_id: string, interval: string = "1d") {
  try {
    const url = `${CLOB_BASE}/prices-history?market=${encodeURIComponent(token_id)}&interval=${encodeURIComponent(interval)}`;
    const res = await http<{ t: number; p: number }[]>(url);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

// ---- Trades ----
async function getRecentTrades(token_id: string): Promise<AnyObj[]> {
  const candidates = [
    `${DATA_BASE}/trades?token_id=${encodeURIComponent(token_id)}`,
    `${DATA_BASE}/trades?asset_id=${encodeURIComponent(token_id)}`,
    `${DATA_BASE}/trades?market=${encodeURIComponent(token_id)}`,
  ];
  for (const url of candidates) {
    try {
      const res = await http<any>(url);
      if (Array.isArray(res?.trades) && res.trades.length) return res.trades.slice(0, 50);
      if (Array.isArray(res) && res.length) return res.slice(0, 50);
      if (res?.data && Array.isArray(res.data) && res.data.length) return res.data.slice(0, 50);
    } catch {
      // try next
    }
  }
  return [];
}

// ---- Build payload from slug ----
export async function buildLLMPayloadFromSlug(
  slug: string,
  options: { historyInterval?: string; withBooks?: boolean; withTrades?: boolean; maxCandidates?: number } = {}
): Promise<LLMPayloadEnhanced> {
  const { historyInterval = "1d", withBooks = true, withTrades = false, maxCandidates = 10 } = options;
  let gammaMarket: AnyObj;
  let eventSummary: LLMPayloadEnhanced["event_summary"] | undefined = undefined;

  try {
    gammaMarket = await getMarketBySlug(slug);
  } catch (marketError) {
    try {
      const gammaEvent = await getEventBySlug(slug);
      if (gammaEvent.markets && Array.isArray(gammaEvent.markets) && gammaEvent.markets.length > 0) {
        const allMarkets = gammaEvent.markets;
        const activeMarkets = allMarkets.filter((m: AnyObj) => m.active);
        const isMultiCandidate = activeMarkets.length > 2;
        if (isMultiCandidate) {
          const topCandidates = activeMarkets
            .map((market: AnyObj) => {
              const volume = extractVolume(market) || 0;
              const liquidity = extractLiquidity(market) || 0;
              const question = extractQuestion(market);
              const candidateName = question.replace(/^Will\s+/, '').replace(/\s+win\s+.*$/, '').trim();
              return { name: candidateName, question, implied_probability: 0, volume, liquidity, active: market.active, market };
            })
            .sort((a, b) => (b.volume + b.liquidity) - (a.volume + a.liquidity))
            .slice(0, maxCandidates);
          // Compute implied probabilities for candidates (best effort)
          for (const candidate of topCandidates) {
            try {
              const candidateTokenMap = extractOutcomeTokens(candidate.market);
              const candidateTokenIds = Object.values(candidateTokenMap);
              if (candidateTokenIds.length > 0) {
                const candidatePrices = await getBestBidAsk([candidateTokenIds[0]]);
                const price = candidatePrices[candidateTokenIds[0]];
                if (price?.BUY && price?.SELL) candidate.implied_probability = (price.BUY + price.SELL) / 2;
                else if (price?.BUY) candidate.implied_probability = price.BUY;
                else if (price?.SELL) candidate.implied_probability = price.SELL;
              }
            } catch {
              candidate.implied_probability = 0;
            }
          }
          topCandidates.sort((a, b) => (b.implied_probability ?? 0) - (a.implied_probability ?? 0));
          eventSummary = { is_multi_candidate: true, total_markets: allMarkets.length, active_markets: activeMarkets.length, top_candidates: topCandidates };
          // Prefer the highest current chance; fallback to activity heuristic if missing
          gammaMarket = (topCandidates[0]?.implied_probability ?? 0) > 0 ? (topCandidates[0]!.market) : (topCandidates[0]?.market || activeMarkets[0]);
        } else {
          gammaMarket = activeMarkets.reduce((prev: AnyObj, current: AnyObj) => {
            const prevScore = (prev.active ? 1000 : 0) + (extractLiquidity(prev) || 0) + (extractVolume(prev) || 0);
            const currentScore = (current.active ? 1000 : 0) + (extractLiquidity(current) || 0) + (extractVolume(current) || 0);
            return currentScore > prevScore ? current : prev;
          });
        }
      } else {
        throw new Error(`Event "${slug}" found but contains no markets`);
      }
    } catch (eventError) {
      throw new Error(`No market or event found for slug "${slug}". Market error: ${String(marketError)}. Event error: ${String(eventError)}`);
    }
  }

  const facts = await buildMarketSummary(gammaMarket);
  const outcomeEntries = Object.entries(facts.token_map);
  const tokenIds = outcomeEntries.map(([, token_id]) => token_id);

  let prices: Record<string, any> = {};
  try { prices = await getBestBidAsk(tokenIds); } catch {}

  const market_state_now: MarketStateNowEntry[] = [];
  const order_books: AnyObj[] = [];
  for (const [outcome, token_id] of outcomeEntries) {
    const p = prices[token_id] || {};
    const bid = p.BUY ?? null;
    const ask = p.SELL ?? null;
    const mid = bid != null && ask != null ? (Number(bid) + Number(ask)) / 2 : null;
    let top_bid_size: number | null = null;
    let top_ask_size: number | null = null;
    if (withBooks) {
      try {
        const book = await getOrderBook(token_id);
        order_books.push({ token_id, outcome, book });
        const tops = await getTopOfBookSizes(book);
        top_bid_size = tops.top_bid_size;
        top_ask_size = tops.top_ask_size;
      } catch (e) {
        order_books.push({ token_id, outcome, error: String(e) });
      }
    }
    market_state_now.push({ token_id, outcome, bid, ask, mid, top_bid_size, top_ask_size });
  }

  const history: LLMPayload["history"] = [];
  for (const token_id of tokenIds) {
    const points = await getPriceHistory(token_id, historyInterval);
    history.push({ token_id, points });
  }

  let recent_trades: AnyObj[] | undefined = undefined;
  if (withTrades) {
    recent_trades = [];
    for (const token_id of tokenIds) {
      const trades = await getRecentTrades(token_id);
      for (const t of trades) recent_trades.push({ token_id, ...t });
    }
  }

  // eventSummary already computed above for multi-candidate events (with implied probabilities)

  return {
    market_facts: facts,
    market_state_now,
    history,
    order_books: withBooks ? order_books : undefined,
    recent_trades,
    event_summary: eventSummary,
  };
}

// ---- Tool ----
// Consumers can call buildLLMPayloadFromSlug directly for Polymarket data.
