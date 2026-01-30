# 模块F：HTTP API 服务 - 开发文档

---

## 1. 职责

向前端提供 JSON 数据接口。

---

## 2. 接口列表

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/trades` | 获取交易列表 |
| GET | `/api/markets` | 获取市场列表 |
| GET | `/api/traders` | 获取交易者排行 |
| POST | `/api/tags` | 添加标签 |

---

## 3. 接口详情

### GET /api/trades

**参数**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| limit | number | 20 | 返回数量 |
| offset | number | 0 | 偏移量 |

**响应**

```json
{
  "data": [
    {
      "txHash": "0x...",
      "blockNumber": 55000000,
      "maker": "0x...",
      "taker": "0x...",
      "tokenId": "12345",
      "marketId": "0x...",
      "marketTitle": "Will BTC hit 100k?",
      "outcome": "YES",
      "direction": "BUY",
      "price": 0.42
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150
  }
}
```

### GET /api/markets

**响应**

```json
{
  "data": [
    {
      "id": "0x...",
      "title": "Will BTC hit 100k?",
      "tradeCount": 50,
      "volume": 25000
    }
  ]
}
```

### GET /api/traders

**响应**

```json
{
  "data": [
    {
      "address": "0x...",
      "tradeCount": 100,
      "marketCount": 15,
      "tags": ["Whale"]
    }
  ]
}
```

### POST /api/tags

**请求**

```json
{
  "address": "0x...",
  "tag": "Whale"
}
```

**响应**

```json
{
  "success": true
}
```

---

## 4. 实现代码

### /api/trades

```typescript
// app/api/trades/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTrades, getTradeCount } from "@/db/trades";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  const trades = getTrades(limit, offset);
  const total = getTradeCount();

  return NextResponse.json({
    data: trades.map(t => ({
      txHash: t.tx_hash,
      blockNumber: t.block_number,
      maker: t.maker,
      taker: t.taker,
      tokenId: t.token_id,
      marketId: t.market_id,
      marketTitle: t.market_title,
      outcome: t.outcome,
      direction: t.direction,
      price: t.price,
    })),
    pagination: { limit, offset, total },
  });
}
```

### /api/markets

```typescript
// app/api/markets/route.ts
import { NextResponse } from "next/server";
import { getMarketsWithStats } from "@/db/markets";

export async function GET() {
  const markets = getMarketsWithStats();

  return NextResponse.json({
    data: markets,
  });
}
```

### /api/traders

```typescript
// app/api/traders/route.ts
import { NextResponse } from "next/server";
import { getTraderStats } from "@/db/traders";

export async function GET() {
  const traders = getTraderStats();

  return NextResponse.json({
    data: traders,
  });
}
```

### /api/tags

```typescript
// app/api/tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addTag, getTags } from "@/db/tags";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  const tags = getTags(address || undefined);
  return NextResponse.json({ data: tags });
}

export async function POST(request: NextRequest) {
  const { address, tag } = await request.json();

  if (!address || !tag) {
    return NextResponse.json(
      { error: "Missing address or tag" },
      { status: 400 }
    );
  }

  try {
    addTag(address, tag);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Tag already exists" },
      { status: 409 }
    );
  }
}
```

---

## 5. 聚合查询

### 市场统计

```typescript
// db/markets.ts
export function getMarketsWithStats() {
  return db.prepare(`
    SELECT
      m.id,
      m.title,
      COUNT(t.id) as trade_count,
      SUM(CAST(t.taker_amount AS REAL) / 1e6) as volume
    FROM markets m
    LEFT JOIN trades t ON m.id = t.market_id
    GROUP BY m.id
    ORDER BY trade_count DESC
  `).all();
}
```

### 交易者统计

```typescript
// db/traders.ts
export function getTraderStats() {
  return db.prepare(`
    SELECT
      address,
      COUNT(*) as trade_count,
      COUNT(DISTINCT market_id) as market_count
    FROM (
      SELECT maker as address, market_id FROM trades
      UNION ALL
      SELECT taker as address, market_id FROM trades
    )
    GROUP BY address
    ORDER BY trade_count DESC
    LIMIT 100
  `).all();
}
```

---

## 6. 文件结构

```
app/api/
  trades/route.ts
  markets/route.ts
  traders/route.ts
  tags/route.ts
```

---

## 7. 验收

- [ ] `curl /api/trades?limit=100` 返回有效 JSON
- [ ] 响应包含 `txHash`、`price`、`direction`、`marketTitle`
- [ ] `POST /api/tags` 能成功添加标签
