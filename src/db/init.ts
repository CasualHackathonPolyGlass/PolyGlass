/**
 * 模块E：数据库初始化
 * 使用 better-sqlite3 创建并初始化 SQLite 数据库
 */
import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";

const DB_PATH = join(process.cwd(), "data", "app.db");

function ensureDbDir(): void {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** 数据库单例 */
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  ensureDbDir();
  db = new Database(DB_PATH);

  // 初始化表结构
  db.exec(`
    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      condition_id TEXT NOT NULL,
      token_yes TEXT NOT NULL,
      token_no TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      block_number INTEGER NOT NULL,
      maker TEXT NOT NULL,
      taker TEXT NOT NULL,
      maker_asset_id TEXT NOT NULL,
      taker_asset_id TEXT NOT NULL,
      maker_amount TEXT NOT NULL,
      taker_amount TEXT NOT NULL,
      fee TEXT NOT NULL,
      token_id TEXT,
      market_id TEXT,
      outcome TEXT,
      direction TEXT NOT NULL,
      price REAL,
      UNIQUE(tx_hash, log_index)
    );

    CREATE TABLE IF NOT EXISTS address_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(address, tag)
    );

    CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
    CREATE INDEX IF NOT EXISTS idx_trades_maker ON trades(maker);
    CREATE INDEX IF NOT EXISTS idx_trades_taker ON trades(taker);
    CREATE INDEX IF NOT EXISTS idx_trades_block ON trades(block_number);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT,
      description TEXT,
      category TEXT,
      end_date TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS market_events (
      market_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      PRIMARY KEY (market_id, event_id),
      FOREIGN KEY (market_id) REFERENCES markets(id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
    CREATE INDEX IF NOT EXISTS idx_events_active ON events(active);
    CREATE INDEX IF NOT EXISTS idx_market_events_event ON market_events(event_id);

    -- Smart Money 系统表

    -- fills 表：标准化成交记录
    CREATE TABLE IF NOT EXISTS fills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      market_id TEXT NOT NULL,
      outcome_side TEXT NOT NULL CHECK(outcome_side IN ('YES', 'NO')),
      shares_delta REAL NOT NULL,
      cash_delta_usdc REAL NOT NULL,
      price REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('maker', 'taker')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(tx_hash, log_index, role)
    );

    CREATE INDEX IF NOT EXISTS idx_fills_address ON fills(address);
    CREATE INDEX IF NOT EXISTS idx_fills_market ON fills(market_id);
    CREATE INDEX IF NOT EXISTS idx_fills_timestamp ON fills(timestamp);
    CREATE INDEX IF NOT EXISTS idx_fills_position ON fills(address, market_id, outcome_side);

    -- trader_stats 表：交易者统计
    CREATE TABLE IF NOT EXISTS trader_stats (
      address TEXT PRIMARY KEY,
      trades_count INTEGER NOT NULL DEFAULT 0,
      markets_count INTEGER NOT NULL DEFAULT 0,
      volume_usdc REAL NOT NULL DEFAULT 0,
      realized_pnl REAL NOT NULL DEFAULT 0,
      total_buy_cost REAL NOT NULL DEFAULT 0,
      roi REAL NOT NULL DEFAULT 0,
      closed_markets_count INTEGER NOT NULL DEFAULT 0,
      win_markets_count INTEGER NOT NULL DEFAULT 0,
      win_rate REAL NOT NULL DEFAULT 0,
      score REAL DEFAULT NULL,
      tags TEXT DEFAULT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_trader_stats_score ON trader_stats(score DESC);
    CREATE INDEX IF NOT EXISTS idx_trader_stats_volume ON trader_stats(volume_usdc DESC);
    CREATE INDEX IF NOT EXISTS idx_trader_stats_roi ON trader_stats(roi DESC);

    -- signals 表：跟单信号
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      market_id TEXT NOT NULL,
      outcome_side TEXT NOT NULL CHECK(outcome_side IN ('YES', 'NO')),
      net_usdc REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_signals_address ON signals(address);
    CREATE INDEX IF NOT EXISTS idx_signals_market ON signals(market_id);
  `);

  return db;
}

export default getDb;
