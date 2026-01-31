/**
 * Smart Money 数据库操作模块
 * 包含 fills、trader_stats、signals 三张表的 CRUD
 */
import { getDb } from "./init";
import type { Fill, ScoredTrader, Signal } from "@/types/fills";
import type { SignalConfig } from "@/types/smart-money";

// ============ Fills 操作 ============

const INSERT_FILL_SQL = `
  INSERT OR IGNORE INTO fills
  (address, market_id, outcome_side, shares_delta, cash_delta_usdc,
   price, timestamp, tx_hash, log_index, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/** 批量保存 Fills */
export function saveFills(fills: Fill[]): number {
  const db = getDb();
  const stmt = db.prepare(INSERT_FILL_SQL);
  const tx = db.transaction(() => {
    let count = 0;
    for (const f of fills) {
      const result = stmt.run(
        f.address.toLowerCase(), f.marketId, f.outcomeSide, f.sharesDelta,
        f.cashDeltaUSDC, f.price, f.timestamp, f.txHash, f.logIndex, f.role
      );
      if (result.changes > 0) count++;
    }
    return count;
  });
  return tx();
}

/** 获取所有 Fills */
export function getAllFills(): Fill[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT address, market_id, outcome_side, shares_delta, cash_delta_usdc,
           price, timestamp, tx_hash, log_index, role
    FROM fills ORDER BY timestamp ASC, log_index ASC
  `).all() as Array<{
    address: string; market_id: string; outcome_side: string;
    shares_delta: number; cash_delta_usdc: number; price: number;
    timestamp: number; tx_hash: string; log_index: number; role: string;
  }>;
  return rows.map((r) => ({
    address: r.address, marketId: r.market_id,
    outcomeSide: r.outcome_side as "YES" | "NO",
    sharesDelta: r.shares_delta, cashDeltaUSDC: r.cash_delta_usdc,
    price: r.price, timestamp: r.timestamp, txHash: r.tx_hash,
    logIndex: r.log_index, role: r.role as "maker" | "taker",
  }));
}

/** 获取指定地址的 Fills（Turso 异步 API） */
export async function getFillsByAddress(address: string): Promise<Fill[]> {
  const client = getDb();
  const result = await client.execute({
    sql: `SELECT address, market_id, outcome_side, shares_delta, cash_delta_usdc,
                 price, timestamp, tx_hash, log_index, role
          FROM fills WHERE address = ? ORDER BY timestamp ASC, log_index ASC`,
    args: [address.toLowerCase()],
  });

  return result.rows.map((r) => {
    const row = r as unknown as {
      address: string; market_id: string; outcome_side: string;
      shares_delta: number; cash_delta_usdc: number; price: number;
      timestamp: number; tx_hash: string; log_index: number; role: string;
    };
    return {
      address: row.address,
      marketId: row.market_id,
      outcomeSide: row.outcome_side as "YES" | "NO",
      sharesDelta: row.shares_delta,
      cashDeltaUSDC: row.cash_delta_usdc,
      price: row.price,
      timestamp: row.timestamp,
      txHash: row.tx_hash,
      logIndex: row.log_index,
      role: row.role as "maker" | "taker",
    };
  });
}

/** 获取最新区块号 */
export function getLatestFillBlock(): number {
  const db = getDb();
  const row = db.prepare(`SELECT MAX(timestamp) as max_block FROM fills`).get() as { max_block: number | null };
  return row?.max_block ?? 0;
}

// ============ Trader Stats 操作 ============

const UPSERT_STATS_SQL = `
  INSERT INTO trader_stats
  (address, trades_count, markets_count, volume_usdc, realized_pnl, total_buy_cost,
   roi, closed_markets_count, win_markets_count, win_rate, score, tags, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(address) DO UPDATE SET
    trades_count = excluded.trades_count, markets_count = excluded.markets_count,
    volume_usdc = excluded.volume_usdc, realized_pnl = excluded.realized_pnl,
    total_buy_cost = excluded.total_buy_cost, roi = excluded.roi,
    closed_markets_count = excluded.closed_markets_count,
    win_markets_count = excluded.win_markets_count, win_rate = excluded.win_rate,
    score = excluded.score, tags = excluded.tags, updated_at = datetime('now')
`;

/** 批量保存评分结果 */
export function saveScoredTraders(traders: ScoredTrader[]): number {
  const db = getDb();
  const stmt = db.prepare(UPSERT_STATS_SQL);
  const tx = db.transaction(() => {
    let count = 0;
    for (const t of traders) {
      const result = stmt.run(
        t.address.toLowerCase(), t.tradesCount, t.marketsCount, t.volumeUSDC,
        t.realizedPnL, t.totalBuyCost, t.roi, t.closedMarketsCount,
        t.winMarketsCount, t.winRate, t.score, JSON.stringify(t.tags)
      );
      if (result.changes > 0) count++;
    }
    return count;
  });
  return tx();
}

/** Trader stats 数据库行类型 */
interface TraderStatsRow {
  address: string;
  trades_count: number;
  markets_count: number;
  volume_usdc: number;
  realized_pnl: number;
  total_buy_cost: number;
  roi: number;
  closed_markets_count: number;
  win_markets_count: number;
  win_rate: number;
  score: number;
  tags: string | null;
  origin_type: string | null;
  is_relayer: number | null;
  is_proxy_wallet: number | null;
  has_deposit: number | null;
  net_deposit_usdc: number | null;
}

/** 获取 Smart Traders 排行榜（Turso 异步 API） */
export async function getSmartTraders(
  limit: number = 50,
  sortBy: string = "score",
  view: "all" | "retail" = "all"
): Promise<ScoredTrader[]> {
  const client = getDb();
  const validSorts = ["score", "roi", "win_rate", "volume_usdc", "realized_pnl"];
  const sortField = validSorts.includes(sortBy) ? sortBy : "score";

  // retail 过滤条件：EOA + 非 Relayer + 有入金记录
  const retailFilter = view === "retail"
    ? `AND origin_type = 'EOA' AND is_relayer = 0 AND has_deposit = 1`
    : "";

  const result = await client.execute({
    sql: `SELECT * FROM trader_stats
          WHERE score IS NOT NULL ${retailFilter}
          ORDER BY ${sortField} DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((r) => {
    const row = r as unknown as TraderStatsRow;
    return {
      address: row.address,
      tradesCount: row.trades_count,
      marketsCount: row.markets_count,
      volumeUSDC: row.volume_usdc,
      realizedPnL: row.realized_pnl,
      totalBuyCost: row.total_buy_cost,
      roi: row.roi,
      closedMarketsCount: row.closed_markets_count,
      winMarketsCount: row.win_markets_count,
      winRate: row.win_rate,
      score: row.score,
      tags: row.tags ? JSON.parse(row.tags) : [],
      originType: row.origin_type as "EOA" | "CONTRACT" | "PROXY" | undefined,
      isRelayer: row.is_relayer === 1,
      isProxyWallet: row.is_proxy_wallet === null ? null : row.is_proxy_wallet === 1,
      hasDeposit: row.has_deposit === 1,
      netDepositUSDC: row.net_deposit_usdc ?? 0,
    };
  });
}

/** 获取单个 Trader 详情（Turso 异步 API） */
export async function getTraderByAddress(address: string): Promise<ScoredTrader | null> {
  const client = getDb();
  const result = await client.execute({
    sql: `SELECT * FROM trader_stats WHERE address = ?`,
    args: [address.toLowerCase()],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as unknown as TraderStatsRow;
  return {
    address: row.address,
    tradesCount: row.trades_count,
    marketsCount: row.markets_count,
    volumeUSDC: row.volume_usdc,
    realizedPnL: row.realized_pnl,
    totalBuyCost: row.total_buy_cost,
    roi: row.roi,
    closedMarketsCount: row.closed_markets_count,
    winMarketsCount: row.win_markets_count,
    winRate: row.win_rate,
    score: row.score ?? 0,
    tags: row.tags ? JSON.parse(row.tags) : [],
    originType: row.origin_type as "EOA" | "CONTRACT" | "PROXY" | undefined,
    isRelayer: row.is_relayer === 1,
    hasDeposit: row.has_deposit === 1,
    netDepositUSDC: row.net_deposit_usdc ?? 0,
  };
}

/** 获取所有 Smart Trader 地址 */
export function getSmartAddresses(): Set<string> {
  const db = getDb();
  const rows = db.prepare(`SELECT address FROM trader_stats WHERE score IS NOT NULL`).all() as Array<{ address: string }>;
  return new Set(rows.map((r) => r.address.toLowerCase()));
}

// ============ Signals 操作 ============

export const DEFAULT_SIGNAL_CONFIG: SignalConfig = { windowHours: 24, minNetUSDC: 200 };

/** 生成信号 ID */
export function generateSignalId(address: string, marketId: string, outcomeSide: string, timestamp: number): string {
  return `${address.toLowerCase()}:${marketId}:${outcomeSide}:${timestamp}`;
}

const INSERT_SIGNAL_SQL = `INSERT OR REPLACE INTO signals (id, address, market_id, outcome_side, net_usdc, timestamp) VALUES (?, ?, ?, ?, ?, ?)`;

/** 批量保存信号 */
export function saveSignals(signals: Signal[]): number {
  const db = getDb();
  const stmt = db.prepare(INSERT_SIGNAL_SQL);
  const tx = db.transaction(() => {
    let count = 0;
    for (const s of signals) {
      const result = stmt.run(s.id, s.address.toLowerCase(), s.marketId, s.outcomeSide, s.netUSDC, s.timestamp);
      if (result.changes > 0) count++;
    }
    return count;
  });
  return tx();
}

/** 获取近期信号（Turso 异步 API） */
export async function getRecentSignals(windowHours: number = 24): Promise<Signal[]> {
  const client = getDb();
  const blocksPerHour = 1800;

  const latestResult = await client.execute(`SELECT MAX(timestamp) as max_block FROM fills`);
  const latestBlock = (latestResult.rows[0] as unknown as { max_block: number | null })?.max_block ?? 0;
  const cutoffBlock = latestBlock - windowHours * blocksPerHour;

  const result = await client.execute({
    sql: `SELECT id, address, market_id, outcome_side, net_usdc, timestamp, created_at
          FROM signals WHERE timestamp >= ? ORDER BY timestamp DESC`,
    args: [cutoffBlock],
  });

  return result.rows.map((r) => {
    const row = r as unknown as {
      id: string; address: string; market_id: string; outcome_side: string;
      net_usdc: number; timestamp: number; created_at: string;
    };
    return {
      id: row.id,
      address: row.address,
      marketId: row.market_id,
      outcomeSide: row.outcome_side as "YES" | "NO",
      netUSDC: row.net_usdc,
      timestamp: row.timestamp,
      createdAt: row.created_at,
    };
  });
}

/** 获取指定地址的信号（Turso 异步 API） */
export async function getSignalsByAddress(address: string): Promise<Signal[]> {
  const client = getDb();
  const result = await client.execute({
    sql: `SELECT id, address, market_id, outcome_side, net_usdc, timestamp, created_at
          FROM signals WHERE address = ? ORDER BY timestamp DESC`,
    args: [address.toLowerCase()],
  });

  return result.rows.map((r) => {
    const row = r as unknown as {
      id: string; address: string; market_id: string; outcome_side: string;
      net_usdc: number; timestamp: number; created_at: string;
    };
    return {
      id: row.id,
      address: row.address,
      marketId: row.market_id,
      outcomeSide: row.outcome_side as "YES" | "NO",
      netUSDC: row.net_usdc,
      timestamp: row.timestamp,
      createdAt: row.created_at,
    };
  });
}

/** 从 Fills 生成信号 */
export function generateSignalsFromFills(fills: Fill[], config: SignalConfig = DEFAULT_SIGNAL_CONFIG): Signal[] {
  const smartAddresses = getSmartAddresses();
  const blocksPerHour = 1800;
  const maxTimestamp = Math.max(...fills.map((f) => f.timestamp), 0);
  const cutoffBlock = maxTimestamp - config.windowHours * blocksPerHour;

  const recentFills = fills.filter((f) => f.timestamp >= cutoffBlock && smartAddresses.has(f.address.toLowerCase()));
  const aggregated = new Map<string, { address: string; marketId: string; outcomeSide: "YES" | "NO"; netUSDC: number; maxTimestamp: number }>();

  for (const fill of recentFills) {
    const key = `${fill.address}:${fill.marketId}:${fill.outcomeSide}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.netUSDC += fill.cashDeltaUSDC;
      existing.maxTimestamp = Math.max(existing.maxTimestamp, fill.timestamp);
    } else {
      aggregated.set(key, { address: fill.address, marketId: fill.marketId, outcomeSide: fill.outcomeSide, netUSDC: fill.cashDeltaUSDC, maxTimestamp: fill.timestamp });
    }
  }

  const signals: Signal[] = [];
  for (const agg of aggregated.values()) {
    const netBuy = -agg.netUSDC;
    if (netBuy > config.minNetUSDC) {
      signals.push({
        id: generateSignalId(agg.address, agg.marketId, agg.outcomeSide, agg.maxTimestamp),
        address: agg.address, marketId: agg.marketId, outcomeSide: agg.outcomeSide,
        netUSDC: netBuy, timestamp: agg.maxTimestamp, createdAt: new Date().toISOString(),
      });
    }
  }
  return signals.sort((a, b) => b.netUSDC - a.netUSDC);
}
