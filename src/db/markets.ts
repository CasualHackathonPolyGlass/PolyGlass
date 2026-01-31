/**
 * 模块E：Markets 数据操作（Turso 异步 API）
 * 升级版：支持完整 Market 字段存储和条件查询
 */
import { getDb } from "./init";
import type { Market, TokenMap } from "@/types/market";

/** 数据库存储的市场结构 */
export interface StoredMarket {
  marketId: string;
  title: string;
  slug: string;
  conditionId: string;
  tokenYes: string;
  tokenNo: string;
  priceYes: number;
  priceNo: number;
  volume: number;
  liquidity: number;
  tags: string[];
  endDate?: string;
  image?: string;
  outcomes: [string, string];
  active: boolean;
}

const INSERT_SQL = `
  INSERT OR REPLACE INTO markets
  (id, title, slug, condition_id, token_yes, token_no, price_yes, price_no,
   volume, liquidity, tags, end_date, image, outcomes, active, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`;

/** 批量保存市场（完整字段） */
export async function saveMarkets(markets: Market[]): Promise<number> {
  if (markets.length === 0) return 0;
  const client = getDb();
  const statements = markets.map((m) => ({
    sql: INSERT_SQL,
    args: [
      m.marketId,
      m.title,
      m.slug,
      m.conditionId,
      m.tokenYes,
      m.tokenNo,
      m.priceYes,
      m.priceNo,
      m.volume,
      m.liquidity,
      JSON.stringify(m.tags),
      m.endDate || null,
      m.image || null,
      JSON.stringify(m.outcomes || ["No", "Yes"]),
      m.active ? 1 : 0,
    ],
  }));
  await client.batch(statements, "write");
  return markets.length;
}

/** 市场查询过滤条件 */
export interface MarketFilters {
  status?: "active" | "all";
  tag?: string;
  search?: string;
}

/** 条件查询市场（从 DB 读取） */
export async function queryMarkets(filters: MarketFilters = {}): Promise<Market[]> {
  const db = getDb();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (filters.status === "active") {
    conditions.push("active = 1 AND (end_date IS NULL OR end_date > datetime('now'))");
  }
  if (filters.tag) {
    conditions.push("tags LIKE ?");
    args.push(`%"${filters.tag}"%`);
  }
  if (filters.search) {
    conditions.push("title LIKE ?");
    args.push(`%${filters.search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM markets ${where} ORDER BY volume DESC`;

  const result = args.length > 0
    ? await db.execute({ sql, args })
    : await db.execute(sql);

  return result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      marketId: row.id as string,
      title: row.title as string,
      slug: (row.slug as string) || "",
      conditionId: row.condition_id as string,
      tokenYes: row.token_yes as string,
      tokenNo: row.token_no as string,
      priceYes: (row.price_yes as number) || 0.5,
      priceNo: (row.price_no as number) || 0.5,
      volume: (row.volume as number) || 0,
      liquidity: (row.liquidity as number) || 0,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      endDate: row.end_date as string | undefined,
      image: row.image as string | undefined,
      outcomes: row.outcomes ? JSON.parse(row.outcomes as string) : ["No", "Yes"],
      active: (row.active as number) === 1,
    };
  });
}

/** 从市场列表构建 TokenMap */
export function buildTokenMapFromMarkets(markets: Market[]): TokenMap {
  const tokenMap: TokenMap = {};
  for (const m of markets) {
    tokenMap[m.tokenNo] = { marketId: m.marketId, outcome: "NO" };
    tokenMap[m.tokenYes] = { marketId: m.marketId, outcome: "YES" };
  }
  return tokenMap;
}

/** 获取所有市场（兼容旧接口） */
export async function getMarkets(): Promise<StoredMarket[]> {
  const markets = await queryMarkets();
  return markets.map((m) => ({
    ...m,
    active: true,
    outcomes: (m.outcomes as [string, string]) || ["No", "Yes"],
  }));
}

/** 市场统计信息 */
interface MarketStats {
  id: string;
  title: string;
  trade_count: number;
  volume: number;
}

/** 获取带统计的市场列表 */
export async function getMarketsWithStats(): Promise<MarketStats[]> {
  const client = getDb();
  const result = await client.execute(`
    SELECT
      m.id, m.title,
      COUNT(t.id) as trade_count,
      COALESCE(SUM(CAST(t.taker_amount AS REAL) / 1e6), 0) as volume
    FROM markets m
    LEFT JOIN trades t ON m.id = t.market_id
    GROUP BY m.id
    ORDER BY trade_count DESC
  `);
  return result.rows as unknown as MarketStats[];
}
