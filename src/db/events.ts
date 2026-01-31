/**
 * 模块：Events 数据操作（Turso 异步 API）
 */
import { getDb } from "./init";
import type { Event, MarketEvent } from "@/types/market";
import type { SmartMoneyEvent, SmartMoneyMarket, SmartMoneyHolder } from "@/types/smart-market";

const INSERT_EVENT_SQL = `
  INSERT OR REPLACE INTO events
  (id, title, slug, description, category, end_date, active)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`;

const INSERT_MARKET_EVENT_SQL = `
  INSERT OR IGNORE INTO market_events (market_id, event_id)
  VALUES (?, ?)
`;

/**
 * 批量保存事件
 */
export async function saveEvents(events: Event[]): Promise<number> {
  if (events.length === 0) return 0;
  const client = getDb();
  const statements = events.map((e) => ({
    sql: INSERT_EVENT_SQL,
    args: [
      e.id, e.title, e.slug || null, e.description || null,
      e.category || null, e.endDate || null, e.active ? 1 : 0,
    ],
  }));
  await client.batch(statements, "write");
  return events.length;
}

/**
 * 批量保存市场-事件关联
 */
export async function saveMarketEvents(relations: MarketEvent[]): Promise<number> {
  if (relations.length === 0) return 0;
  const client = getDb();
  const statements = relations.map((r) => ({
    sql: INSERT_MARKET_EVENT_SQL,
    args: [r.marketId, r.eventId],
  }));
  await client.batch(statements, "write");
  return relations.length;
}

/** 事件统计信息 */
interface EventStats {
  id: string;
  title: string;
  slug: string;
  category: string;
  end_date: string;
  active: number;
  market_count: number;
  total_volume: number;
}

/**
 * 获取事件列表（含统计）
 */
export async function getEventsWithStats(): Promise<EventStats[]> {
  const client = getDb();
  const result = await client.execute(`
    SELECT
      e.id, e.title, e.slug, e.category, e.end_date, e.active,
      COUNT(DISTINCT me.market_id) as market_count,
      COALESCE(SUM(t.volume), 0) as total_volume
    FROM events e
    LEFT JOIN market_events me ON e.id = me.event_id
    LEFT JOIN (
      SELECT market_id, SUM(CAST(taker_amount AS REAL) / 1e6) as volume
      FROM trades GROUP BY market_id
    ) t ON me.market_id = t.market_id
    GROUP BY e.id
    ORDER BY total_volume DESC
  `);
  return result.rows as unknown as EventStats[];
}

/**
 * 获取事件详情
 */
export async function getEventById(eventId: string): Promise<EventStats | undefined> {
  const client = getDb();
  const result = await client.execute({
    sql: `
      SELECT
        e.id, e.title, e.slug, e.category, e.end_date, e.active,
        COUNT(DISTINCT me.market_id) as market_count,
        COALESCE(SUM(t.volume), 0) as total_volume
      FROM events e
      LEFT JOIN market_events me ON e.id = me.event_id
      LEFT JOIN (
        SELECT market_id, SUM(CAST(taker_amount AS REAL) / 1e6) as volume
        FROM trades GROUP BY market_id
      ) t ON me.market_id = t.market_id
      WHERE e.id = ?
      GROUP BY e.id
    `,
    args: [eventId],
  });
  return result.rows.length > 0
    ? (result.rows[0] as unknown as EventStats)
    : undefined;
}

/** 事件下的市场信息 */
interface EventMarket {
  id: string;
  title: string;
  trade_count: number;
  volume: number;
}

/**
 * 获取事件下的所有市场
 */
export async function getMarketsByEventId(eventId: string): Promise<EventMarket[]> {
  const client = getDb();
  const result = await client.execute({
    sql: `
      SELECT
        m.id, m.title,
        COUNT(t.id) as trade_count,
        COALESCE(SUM(CAST(t.taker_amount AS REAL) / 1e6), 0) as volume
      FROM markets m
      INNER JOIN market_events me ON m.id = me.market_id
      LEFT JOIN trades t ON m.id = t.market_id
      WHERE me.event_id = ?
      GROUP BY m.id
      ORDER BY volume DESC
    `,
    args: [eventId],
  });
  return result.rows as unknown as EventMarket[];
}

// ============ Smart Money 聚合查询 ============

/**
 * 获取带 Smart Money 统计的 Events 列表
 * 按Smart Money交易量降序排序
 */
export async function getEventsWithSmartMoneyStats(): Promise<SmartMoneyEvent[]> {
  const client = getDb();

  const result = await client.execute(`
    SELECT
      e.id,
      e.title,
      e.slug,
      e.category,
      e.end_date,
      e.active,
      COUNT(DISTINCT me.market_id) as market_count,
      COALESCE(SUM(t.volume), 0) as total_volume,
      COALESCE(SUM(
        CASE WHEN f.outcome_side = 'YES' AND f.cash_delta_usdc < 0
        THEN ABS(f.cash_delta_usdc) ELSE 0 END
      ), 0) as sm_yes_volume,
      COALESCE(SUM(
        CASE WHEN f.outcome_side = 'NO' AND f.cash_delta_usdc < 0
        THEN ABS(f.cash_delta_usdc) ELSE 0 END
      ), 0) as sm_no_volume,
      COUNT(DISTINCT CASE WHEN f.outcome_side = 'YES' THEN f.address END) as sm_yes_count,
      COUNT(DISTINCT CASE WHEN f.outcome_side = 'NO' THEN f.address END) as sm_no_count
    FROM events e
    LEFT JOIN market_events me ON e.id = me.event_id
    LEFT JOIN markets m ON me.market_id = m.id
    LEFT JOIN (
      SELECT market_id, SUM(CAST(taker_amount AS REAL) / 1e6) as volume
      FROM trades GROUP BY market_id
    ) t ON m.id = t.market_id
    LEFT JOIN fills f ON m.id = f.market_id
      AND f.address IN (SELECT address FROM trader_stats WHERE score IS NOT NULL)
    GROUP BY e.id
    HAVING sm_yes_volume + sm_no_volume > 0
    ORDER BY sm_yes_volume + sm_no_volume DESC
  `);

  return result.rows.map((r) => {
    const row = r as unknown as {
      id: string; title: string; slug: string; category: string;
      end_date: string; active: number; market_count: number; total_volume: number;
      sm_yes_volume: number; sm_no_volume: number; sm_yes_count: number; sm_no_count: number;
    };
    const totalSm = row.sm_yes_volume + row.sm_no_volume;
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      category: row.category,
      endDate: row.end_date,
      active: row.active,
      marketCount: row.market_count,
      totalVolume: row.total_volume,
      smartMoneyStats: {
        totalVolume: totalSm,
        yesVolume: row.sm_yes_volume,
        noVolume: row.sm_no_volume,
        yesCount: row.sm_yes_count,
        noCount: row.sm_no_count,
        yesOiShare: totalSm > 0 ? row.sm_yes_volume / totalSm : 0,
        noOiShare: totalSm > 0 ? row.sm_no_volume / totalSm : 0,
      },
    };
  });
}

/**
 * 获取 Event 详情（含 Markets 的 Smart Money 统计）
 */
export async function getEventDetailWithSmartMoney(eventId: string): Promise<SmartMoneyEvent | undefined> {
  const events = await getEventsWithSmartMoneyStats();
  return events.find(e => e.id === eventId);
}

/**
 * 获取 Event 下的 Markets（含 Smart Money 统计）
 */
export async function getMarketsWithSmartMoneyByEventId(eventId: string): Promise<SmartMoneyMarket[]> {
  const client = getDb();

  const result = await client.execute({
    sql: `
      SELECT
        m.id,
        m.title,
        COUNT(t.id) as trade_count,
        COALESCE(SUM(CAST(t.taker_amount AS REAL) / 1e6), 0) as volume,
        COALESCE(SUM(
          CASE WHEN f.outcome_side = 'YES' AND f.cash_delta_usdc < 0
          THEN ABS(f.cash_delta_usdc) ELSE 0 END
        ), 0) as sm_yes_volume,
        COALESCE(SUM(
          CASE WHEN f.outcome_side = 'NO' AND f.cash_delta_usdc < 0
          THEN ABS(f.cash_delta_usdc) ELSE 0 END
        ), 0) as sm_no_volume,
        COUNT(DISTINCT CASE WHEN f.outcome_side = 'YES' THEN f.address END) as sm_yes_count,
        COUNT(DISTINCT CASE WHEN f.outcome_side = 'NO' THEN f.address END) as sm_no_count
      FROM markets m
      INNER JOIN market_events me ON m.id = me.market_id
      LEFT JOIN trades t ON m.id = t.market_id
      LEFT JOIN fills f ON m.id = f.market_id
        AND f.address IN (SELECT address FROM trader_stats WHERE score IS NOT NULL)
      WHERE me.event_id = ?
      GROUP BY m.id
      ORDER BY sm_yes_volume + sm_no_volume DESC
    `,
    args: [eventId],
  });

  return result.rows.map((r) => {
    const row = r as unknown as {
      id: string; title: string; trade_count: number; volume: number;
      sm_yes_volume: number; sm_no_volume: number; sm_yes_count: number; sm_no_count: number;
    };
    const totalSm = row.sm_yes_volume + row.sm_no_volume;
    return {
      id: row.id,
      title: row.title,
      tradeCount: row.trade_count,
      volume: row.volume,
      smartMoneyStats: {
        totalVolume: totalSm,
        yesVolume: row.sm_yes_volume,
        noVolume: row.sm_no_volume,
        yesCount: row.sm_yes_count,
        noCount: row.sm_no_count,
        yesOiShare: totalSm > 0 ? row.sm_yes_volume / totalSm : 0,
        noOiShare: totalSm > 0 ? row.sm_no_volume / totalSm : 0,
      },
    };
  });
}

/**
 * 获取某个 Market 的 Smart Money 持仓者列表
 */
export async function getSmartMoneyHoldersByMarket(marketId: string): Promise<SmartMoneyHolder[]> {
  const client = getDb();

  const result = await client.execute({
    sql: `
      SELECT
        f.address,
        f.outcome_side,
        SUM(ABS(f.cash_delta_usdc)) as amount,
        AVG(f.price) as avg_price
      FROM fills f
      WHERE f.market_id = ?
        AND f.address IN (SELECT address FROM trader_stats WHERE score IS NOT NULL)
      GROUP BY f.address, f.outcome_side
      HAVING amount > 0
      ORDER BY amount DESC
    `,
    args: [marketId],
  });

  const holders = result.rows.map((r) => {
    const row = r as unknown as {
      address: string; outcome_side: string; amount: number; avg_price: number;
    };
    return {
      address: row.address,
      outcome: row.outcome_side as "YES" | "NO",
      amount: row.amount,
      avgPrice: row.avg_price,
      winRate: 0,  // 从 trader_stats 获取
      score: 0,   // 从 trader_stats 获取
      tags: [],
    };
  });

  // 批量获取 trader_stats 补充 winRate, score, tags
  if (holders.length > 0) {
    const addresses = holders.map(h => h.address);
    const placeholders = addresses.map(() => "?").join(",");

    const statsResult = await client.execute({
      sql: `
        SELECT address, win_rate, score, tags
        FROM trader_stats
        WHERE address IN (${placeholders})
      `,
      args: addresses.map(a => a.toLowerCase()),
    });

    const statsMap = new Map<string, { winRate: number; score: number; tags: string }>();
    for (const r of statsResult.rows) {
      const row = r as unknown as { address: string; win_rate: number; score: number; tags: string };
      statsMap.set(row.address.toLowerCase(), {
        winRate: row.win_rate,
        score: row.score || 0,
        tags: row.tags || "[]",
      });
    }

    // 补充 holders 的 winRate, score, tags
    for (const holder of holders) {
      const stats = statsMap.get(holder.address.toLowerCase());
      if (stats) {
        holder.winRate = stats.winRate;
        holder.score = stats.score;
        holder.tags = JSON.parse(stats.tags);
      }
    }
  }

  return holders;
}
