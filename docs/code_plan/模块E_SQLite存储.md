# 模块E：SQLite 存储 - 开发文档

---

## 1. 职责

将 `ResolvedTrade` 与 `Market` 持久化到 SQLite。

---

## 2. 数据库表

### trades 表

```sql
CREATE TABLE trades (
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

CREATE INDEX idx_trades_market ON trades(market_id);
CREATE INDEX idx_trades_maker ON trades(maker);
CREATE INDEX idx_trades_taker ON trades(taker);
```

### markets 表

```sql
CREATE TABLE markets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  condition_id TEXT NOT NULL,
  token_yes TEXT NOT NULL,
  token_no TEXT NOT NULL
);
```

### address_tags 表

```sql
CREATE TABLE address_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(address, tag)
);
```

---

## 3. 核心接口

```typescript
async function saveTrades(trades: ResolvedTrade[]): Promise<number>;
async function saveMarkets(markets: Market[]): Promise<number>;
async function getTrades(limit: number, offset: number): Promise<Trade[]>;
async function getMarkets(): Promise<Market[]>;
```

---

## 4. 约束

| 约束 | 作用 |
|------|------|
| `UNIQUE(tx_hash, log_index)` | 防止重复写入同一笔交易 |

### 写入策略

```typescript
// INSERT OR IGNORE - 重复时跳过
db.prepare(`
  INSERT OR IGNORE INTO trades (...)
  VALUES (...)
`).run(...);
```

---

## 5. 实现代码

### 使用 better-sqlite3

```typescript
// src/db/index.ts
import Database from "better-sqlite3";

const db = new Database("./data/app.db");

// 初始化表
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
`);

export default db;
```

### 写入 Trades

```typescript
// src/db/trades.ts
import db from "./index";
import type { ResolvedTrade } from "@/types/trade";

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO trades
  (tx_hash, log_index, block_number, maker, taker,
   maker_asset_id, taker_asset_id, maker_amount, taker_amount,
   fee, token_id, market_id, outcome, direction, price)
  VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export function saveTrades(trades: ResolvedTrade[]): number {
  const tx = db.transaction(() => {
    let count = 0;
    for (const t of trades) {
      const result = insertStmt.run(
        t.txHash,
        t.logIndex,
        t.blockNumber,
        t.maker,
        t.taker,
        t.makerAssetId,
        t.takerAssetId,
        t.makerAmount.toString(),
        t.takerAmount.toString(),
        t.fee.toString(),
        t.tokenId,
        t.marketId,
        t.outcome,
        t.direction,
        t.price
      );
      if (result.changes > 0) count++;
    }
    return count;
  });

  return tx();
}
```

### 写入 Markets

```typescript
// src/db/markets.ts
import db from "./index";
import type { Market } from "@/types/market";

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO markets
  (id, title, condition_id, token_yes, token_no)
  VALUES (?, ?, ?, ?, ?)
`);

export function saveMarkets(markets: Market[]): number {
  const tx = db.transaction(() => {
    for (const m of markets) {
      insertStmt.run(
        m.marketId,
        m.title,
        m.conditionId,
        m.tokenYes,
        m.tokenNo
      );
    }
    return markets.length;
  });

  return tx();
}
```

### 查询 Trades

```typescript
export function getTrades(limit = 20, offset = 0) {
  return db.prepare(`
    SELECT t.*, m.title as market_title
    FROM trades t
    LEFT JOIN markets m ON t.market_id = m.id
    ORDER BY t.block_number DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

export function getTradeCount() {
  return db.prepare("SELECT COUNT(*) as count FROM trades").get().count;
}
```

---

## 6. 文件结构

```
src/db/
  index.ts       # DB 初始化
  trades.ts      # trades CRUD
  markets.ts     # markets CRUD
  tags.ts        # address_tags CRUD
```

---

## 7. 验收

- [ ] `./data/app.db` 文件存在
- [ ] `trades` 表有 ≥ 100 行
- [ ] `markets` 表有数据
- [ ] 重复写入不报错（UNIQUE 约束生效）
