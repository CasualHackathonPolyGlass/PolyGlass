/**
 * 模块：Events 数据操作
 */
import { getDb } from "./init";
import type { Event, MarketEvent } from "@/types/market";

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
 * 批量保存事件（事务）
 */
export function saveEvents(events: Event[]): number {
  const db = getDb();
  const stmt = db.prepare(INSERT_EVENT_SQL);

  const tx = db.transaction(() => {
    for (const e of events) {
      stmt.run(
        e.id,
        e.title,
        e.slug || null,
        e.description || null,
        e.category || null,
        e.endDate || null,
        e.active ? 1 : 0
      );
    }
    return events.length;
  });

  return tx();
}

/**
 * 批量保存市场-事件关联（事务）
 */
export function saveMarketEvents(relations: MarketEvent[]): number {
  const db = getDb();
  const stmt = db.prepare(INSERT_MARKET_EVENT_SQL);

  const tx = db.transaction(() => {
    for (const r of relations) {
      stmt.run(r.marketId, r.eventId);
    }
    return relations.length;
  });

  return tx();
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
export function getEventsWithStats(): EventStats[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.slug,
        e.category,
        e.end_date,
        e.active,
        COUNT(DISTINCT me.market_id) as market_count,
        COALESCE(SUM(t.volume), 0) as total_volume
      FROM events e
      LEFT JOIN market_events me ON e.id = me.event_id
      LEFT JOIN (
        SELECT market_id, SUM(CAST(taker_amount AS REAL) / 1e6) as volume
        FROM trades
        GROUP BY market_id
      ) t ON me.market_id = t.market_id
      GROUP BY e.id
      ORDER BY total_volume DESC
    `
    )
    .all() as EventStats[];
}

/**
 * 获取事件详情
 */
export function getEventById(eventId: string): EventStats | undefined {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.slug,
        e.category,
        e.end_date,
        e.active,
        COUNT(DISTINCT me.market_id) as market_count,
        COALESCE(SUM(t.volume), 0) as total_volume
      FROM events e
      LEFT JOIN market_events me ON e.id = me.event_id
      LEFT JOIN (
        SELECT market_id, SUM(CAST(taker_amount AS REAL) / 1e6) as volume
        FROM trades
        GROUP BY market_id
      ) t ON me.market_id = t.market_id
      WHERE e.id = ?
      GROUP BY e.id
    `
    )
    .get(eventId) as EventStats | undefined;
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
export function getMarketsByEventId(eventId: string): EventMarket[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        m.id,
        m.title,
        COUNT(t.id) as trade_count,
        COALESCE(SUM(CAST(t.taker_amount AS REAL) / 1e6), 0) as volume
      FROM markets m
      INNER JOIN market_events me ON m.id = me.market_id
      LEFT JOIN trades t ON m.id = t.market_id
      WHERE me.event_id = ?
      GROUP BY m.id
      ORDER BY volume DESC
    `
    )
    .all(eventId) as EventMarket[];
}
