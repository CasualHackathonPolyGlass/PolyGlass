# Polymarket Smart Money Dashboard 技术设计文档

**版本**：v0.1 (MVP)
**作者**：Khalil
**时间**：2026-01

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [模块设计](#3-模块设计)
4. [数据库设计](#4-数据库设计)
5. [API 详细设计](#5-api-详细设计)
6. [错误处理策略](#6-错误处理策略)
7. [目录结构](#7-目录结构)
8. [部署方案](#8-部署方案)
9. [限制与演进](#9-限制与演进)

---

## 1. 项目概述

### 1.1 背景与目标

本项目是一个基于 Polygon 链真实交易数据的预测市场分析工具。

系统通过直接解析 Polymarket 的 `OrderFilled` 链上事件，还原每一笔预测市场成交行为，并结合 Gamma Markets API 将 Outcome Token 映射为具体市场，实现：

- **链上交易透明化**：所有数据来自 Polygon 链，可验证
- **市场级成交可视化**：按市场聚合展示交易数据
- **交易者行为画像**：分析地址交易模式
- **聪明钱排行榜**：识别高活跃度交易者

最终以 Web Dashboard 形式呈现。

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| 链即真相 | 链上数据为唯一可信来源 |
| 解码可验证 | 所有派生数据可追溯至原始 event |
| 指标可解释 | 价格、方向等计算逻辑透明 |
| 架构极简 | MVP 阶段避免过度设计 |

### 1.3 MVP 成功标准

- [ ] 从 Polygon RPC 获取真实 OrderFilled 事件（≥100 条）
- [ ] 正确解码交易字段
- [ ] TokenId 映射到具体 Market
- [ ] 数据持久化存储（SQLite）
- [ ] 提供 HTTP API
- [ ] 提供可视化前端页面

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Services                         │
├─────────────────────────────────┬───────────────────────────────┤
│         Polygon RPC             │       Gamma Markets API        │
│    (eth_getLogs 历史日志)        │     (市场元数据)                │
└────────────────┬────────────────┴───────────────┬───────────────┘
                 │                                │
                 ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Indexer    │  │Market Service│  │    Trade Decoder     │   │
│  │ (日志扫描)    │  │ (元数据获取)  │  │(方向/价格计算)        │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
│         └─────────────────┼──────────────────────┘               │
│                           ▼                                      │
│                  ┌─────────────────┐                             │
│                  │   Repository    │                             │
│                  │  (数据存储层)    │                             │
│                  └────────┬────────┘                             │
│                           │                                      │
│                           ▼                                      │
│                  ┌─────────────────┐                             │
│                  │     SQLite      │                             │
│                  │   (持久化)       │                             │
│                  └────────┬────────┘                             │
│                           │                                      │
│                           ▼                                      │
│                  ┌─────────────────┐                             │
│                  │  API Routes     │                             │
│                  │ (Next.js API)   │                             │
│                  └────────┬────────┘                             │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │ Trades     │ │ Markets    │ │ Traders    │ │ Address    │    │
│  │ Table      │ │ Charts     │ │ Leaderboard│ │ Detail     │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

| 组件 | 职责 | 技术选型 |
|------|------|----------|
| Indexer | 扫描 Polygon logs，解码 OrderFilled | ethers.js / viem |
| Market Service | 拉取 Gamma API，构建 tokenId 映射 | fetch |
| Trade Decoder | 计算 direction、price | TypeScript |
| Repository | 数据库 CRUD 操作 | Prisma |
| API Routes | HTTP 接口 | Next.js Route Handlers |
| Dashboard | 可视化界面 | React + Recharts |

### 2.3 数据流

#### 初始化流程

```
1. Fetch Markets (Gamma API)
   └─► 存入 markets 表
   └─► 构建 tokenId → marketId 映射

2. Fetch OrderFilled (Polygon RPC)
   └─► 解码 event 字段
   └─► 计算 direction + price
   └─► 关联 marketId
   └─► 存入 trades 表
```

#### 运行时流程

```
Browser Request
    │
    ▼
API Route Handler
    │
    ▼
Prisma Query (SQLite)
    │
    ▼
JSON Response
    │
    ▼
React Component Render
```

---

## 3. 模块设计

### 3.1 链上索引器模块 (Indexer)

#### 职责

- 连接 Polygon RPC
- 扫描历史区块日志
- 过滤 OrderFilled 事件
- 调用 Trade Decoder 处理每条日志

#### 接口定义

```typescript
// types/indexer.ts
interface IndexerConfig {
  rpcUrl: string;
  contractAddress: string;
  startBlock?: number;
  blockRange: number;      // 单次查询区块范围，默认 20000
  minTrades: number;       // 最少获取交易数，默认 100
}

interface IndexerResult {
  trades: DecodedTrade[];
  fromBlock: number;
  toBlock: number;
  totalLogs: number;
}

// lib/indexer.ts
async function fetchOrderFilledLogs(config: IndexerConfig): Promise<IndexerResult>
```

#### 流程图

```
开始
  │
  ▼
获取最新区块号 (eth_blockNumber)
  │
  ▼
设置扫描范围 [toBlock - blockRange, toBlock]
  │
  ▼
调用 eth_getLogs (filter: OrderFilled topic)
  │
  ▼
累计日志数量 >= minTrades?
  │
  ├─ 否 ──► 向前移动区块范围，重复
  │
  └─ 是 ──► 返回结果
```

#### 合约信息

```typescript
// Polymarket CTF Exchange 合约
const EXCHANGE_ADDRESS = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";

// OrderFilled 事件签名
const ORDER_FILLED_TOPIC = ethers.id(
  "OrderFilled(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)"
);

// ABI 片段
const ORDER_FILLED_ABI = [
  "event OrderFilled(bytes32 orderHash, address maker, address taker, uint256 makerAssetId, uint256 takerAssetId, uint256 makerAmountFilled, uint256 takerAmountFilled, uint256 fee)"
];
```

### 3.2 市场元数据模块 (Market Service)

#### 职责

- 调用 Gamma Markets API
- 解析市场元数据
- 构建 tokenId → market 映射
- 提供缓存能力

#### 接口定义

```typescript
// types/market.ts
interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  clobTokenIds: string[];  // [YES_TOKEN, NO_TOKEN]
  outcomes: string[];      // ["Yes", "No"]
  active: boolean;
}

interface MarketMapping {
  tokenId: string;
  marketId: string;
  outcome: "YES" | "NO";
}

// lib/market-service.ts
async function fetchMarkets(): Promise<GammaMarket[]>
function buildTokenMapping(markets: GammaMarket[]): Map<string, MarketMapping>
```

#### Gamma API

```typescript
// API 端点
const GAMMA_API = "https://gamma-api.polymarket.com";

// 获取市场列表
GET /markets?limit=1000&active=true

// 响应示例
{
  "id": "0x1234...",
  "question": "Will X happen?",
  "conditionId": "0xabcd...",
  "clobTokenIds": ["12345", "67890"],
  "outcomes": ["Yes", "No"],
  "active": true
}
```

#### 缓存策略

```typescript
// 本地缓存
const marketCache = new Map<string, GammaMarket>();
const tokenMapping = new Map<string, MarketMapping>();

// 缓存有效期：1 小时
const CACHE_TTL = 60 * 60 * 1000;

// 降级策略：API 失败时使用本地缓存
async function getMarkets(): Promise<GammaMarket[]> {
  try {
    const fresh = await fetchMarkets();
    updateCache(fresh);
    return fresh;
  } catch (error) {
    console.warn("Gamma API failed, using cache");
    return Array.from(marketCache.values());
  }
}
```

### 3.3 交易解码模块 (Trade Decoder)

#### 职责

- 解码 OrderFilled 事件字段
- 识别 outcome tokenId
- 判定交易方向 (BUY/SELL)
- 计算成交价格

#### 接口定义

```typescript
// types/trade.ts
interface RawOrderFilled {
  orderHash: string;
  maker: string;
  taker: string;
  makerAssetId: bigint;
  takerAssetId: bigint;
  makerAmountFilled: bigint;
  takerAmountFilled: bigint;
  fee: bigint;
}

interface DecodedTrade {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  timestamp: number;
  orderHash: string;
  maker: string;
  taker: string;
  makerAssetId: string;
  takerAssetId: string;
  makerAmountFilled: string;
  takerAmountFilled: string;
  fee: string;
  tokenId: string;
  direction: "BUY" | "SELL";
  price: number;
  marketId: string | null;
}

// lib/trade-decoder.ts
function decodeOrderFilled(log: ethers.Log): RawOrderFilled
function processTrade(raw: RawOrderFilled, mapping: Map<string, MarketMapping>): DecodedTrade
```

#### 方向判定逻辑

```typescript
/**
 * 方向判定规则：
 * - Taker 收到 outcome token → Taker 是买方 (BUY)
 * - Taker 给出 outcome token → Taker 是卖方 (SELL)
 *
 * 判断依据：哪个 assetId 是 outcome token
 */
function determineDirection(
  makerAssetId: string,
  takerAssetId: string,
  tokenMapping: Map<string, MarketMapping>
): { direction: "BUY" | "SELL"; tokenId: string } {

  // makerAssetId 是 outcome token → taker 收到 token → BUY
  if (tokenMapping.has(makerAssetId)) {
    return { direction: "BUY", tokenId: makerAssetId };
  }

  // takerAssetId 是 outcome token → taker 给出 token → SELL
  if (tokenMapping.has(takerAssetId)) {
    return { direction: "SELL", tokenId: takerAssetId };
  }

  throw new Error("Neither asset is a known outcome token");
}
```

#### 价格计算公式

```typescript
/**
 * 价格计算：
 * - 价格 = collateral / outcome_shares
 * - 结果范围：0 ~ 1（代表概率）
 *
 * BUY:  taker 用 collateral 换 outcome → price = takerAmount / makerAmount
 * SELL: taker 用 outcome 换 collateral → price = makerAmount / takerAmount
 */
function calculatePrice(
  makerAmountFilled: bigint,
  takerAmountFilled: bigint,
  direction: "BUY" | "SELL"
): number {
  // 转换为 decimal（假设 6 位精度 USDC）
  const DECIMALS = 1_000_000n;

  if (direction === "BUY") {
    // taker 支付 collateral，收到 outcome
    return Number(takerAmountFilled) / Number(makerAmountFilled);
  } else {
    // taker 支付 outcome，收到 collateral
    return Number(makerAmountFilled) / Number(takerAmountFilled);
  }
}
```

### 3.4 数据存储模块 (Repository)

#### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Market {
  id          String   @id
  title       String
  conditionId String
  tokenYes    String
  tokenNo     String
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  trades      Trade[]

  @@index([conditionId])
}

model Trade {
  id                 Int      @id @default(autoincrement())
  txHash             String
  logIndex           Int
  blockNumber        Int
  timestamp          DateTime
  orderHash          String
  maker              String
  taker              String
  makerAssetId       String
  takerAssetId       String
  makerAmountFilled  String
  takerAmountFilled  String
  fee                String
  tokenId            String
  direction          String   // "BUY" | "SELL"
  price              Float
  marketId           String?

  market             Market?  @relation(fields: [marketId], references: [id])

  @@unique([txHash, logIndex])
  @@index([maker])
  @@index([taker])
  @@index([tokenId])
  @@index([marketId])
  @@index([timestamp])
  @@index([blockNumber])
}

model AddressTag {
  id        Int      @id @default(autoincrement())
  address   String
  tag       String
  source    String   @default("manual") // "manual" | "auto"
  createdAt DateTime @default(now())

  @@unique([address, tag])
  @@index([address])
  @@index([tag])
}
```

#### Repository 接口

```typescript
// lib/repository.ts

// Markets
async function upsertMarket(market: GammaMarket): Promise<void>
async function getMarkets(): Promise<Market[]>
async function getMarketById(id: string): Promise<Market | null>

// Trades
async function insertTrades(trades: DecodedTrade[]): Promise<number>
async function getTrades(options: TradeQueryOptions): Promise<Trade[]>
async function getTradesByMarket(marketId: string): Promise<Trade[]>
async function getTradesByAddress(address: string): Promise<Trade[]>

// Address Tags
async function addTag(address: string, tag: string): Promise<void>
async function removeTag(address: string, tag: string): Promise<void>
async function getTagsByAddress(address: string): Promise<AddressTag[]>

// Aggregations
async function getMarketStats(): Promise<MarketStats[]>
async function getTraderStats(): Promise<TraderStats[]>
```

### 3.5 API 模块 (Route Handlers)

#### 端点总览

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/trades | 获取交易列表 |
| GET | /api/markets | 获取市场列表（含统计） |
| GET | /api/markets/[id] | 获取单个市场详情 |
| GET | /api/traders | 获取交易者排行 |
| GET | /api/traders/[address] | 获取地址详情 |
| POST | /api/tags | 添加标签 |
| DELETE | /api/tags | 删除标签 |

详细设计见 [第 5 节](#5-api-详细设计)。

### 3.6 前端模块 (Dashboard)

#### 组件结构

```
app/
├── page.tsx                 # 首页（Dashboard）
├── layout.tsx               # 全局布局
└── components/
    ├── trades/
    │   ├── TradesTable.tsx      # 交易表格
    │   └── TradeRow.tsx         # 单行交易
    ├── markets/
    │   ├── MarketList.tsx       # 市场列表
    │   ├── MarketCard.tsx       # 市场卡片
    │   └── PriceChart.tsx       # 价格走势图
    ├── traders/
    │   ├── TraderLeaderboard.tsx # 排行榜
    │   └── AddressDrawer.tsx     # 地址详情抽屉
    └── common/
        ├── Pagination.tsx       # 分页
        ├── Loading.tsx          # 加载状态
        └── ErrorBoundary.tsx    # 错误边界
```

#### 状态管理

```typescript
// 使用 React Query 管理服务端状态
import { useQuery } from "@tanstack/react-query";

// hooks/useTrades.ts
function useTrades(options?: TradeQueryOptions) {
  return useQuery({
    queryKey: ["trades", options],
    queryFn: () => fetchTrades(options),
    staleTime: 30_000,  // 30 秒后标记为过期
  });
}

// hooks/useMarkets.ts
function useMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
    staleTime: 60_000,  // 1 分钟
  });
}

// hooks/useTraders.ts
function useTraders() {
  return useQuery({
    queryKey: ["traders"],
    queryFn: fetchTraders,
    staleTime: 60_000,
  });
}
```

---

## 4. 数据库设计

### 4.1 ER 图

```
┌─────────────────┐       ┌─────────────────────────┐
│     Market      │       │         Trade           │
├─────────────────┤       ├─────────────────────────┤
│ id (PK)         │◄──────│ marketId (FK, nullable) │
│ title           │       │ id (PK)                 │
│ conditionId     │       │ txHash                  │
│ tokenYes        │       │ logIndex                │
│ tokenNo         │       │ blockNumber             │
│ active          │       │ timestamp               │
│ createdAt       │       │ orderHash               │
│ updatedAt       │       │ maker                   │
└─────────────────┘       │ taker                   │
                          │ makerAssetId            │
                          │ takerAssetId            │
┌─────────────────┐       │ makerAmountFilled       │
│   AddressTag    │       │ takerAmountFilled       │
├─────────────────┤       │ fee                     │
│ id (PK)         │       │ tokenId                 │
│ address         │       │ direction               │
│ tag             │       │ price                   │
│ source          │       └─────────────────────────┘
│ createdAt       │
└─────────────────┘

约束：
- Trade: UNIQUE(txHash, logIndex)
- AddressTag: UNIQUE(address, tag)
```

### 4.2 索引设计

```sql
-- Trade 表索引
CREATE INDEX idx_trade_maker ON Trade(maker);
CREATE INDEX idx_trade_taker ON Trade(taker);
CREATE INDEX idx_trade_tokenId ON Trade(tokenId);
CREATE INDEX idx_trade_marketId ON Trade(marketId);
CREATE INDEX idx_trade_timestamp ON Trade(timestamp DESC);
CREATE INDEX idx_trade_blockNumber ON Trade(blockNumber DESC);

-- 复合索引（常用查询）
CREATE INDEX idx_trade_market_time ON Trade(marketId, timestamp DESC);
CREATE INDEX idx_trade_address_time ON Trade(maker, timestamp DESC);

-- Market 表索引
CREATE INDEX idx_market_conditionId ON Market(conditionId);

-- AddressTag 表索引
CREATE INDEX idx_tag_address ON AddressTag(address);
CREATE INDEX idx_tag_tag ON AddressTag(tag);
```

### 4.3 数据量估算

| 表 | MVP 预期行数 | 单行大小 | 总大小 |
|----|-------------|---------|-------|
| Market | ~1,000 | ~500B | ~500KB |
| Trade | ~10,000 | ~1KB | ~10MB |
| AddressTag | ~100 | ~100B | ~10KB |

SQLite 完全可以支撑 MVP 阶段的数据规模。

---

## 5. API 详细设计

### 5.1 GET /api/trades

获取交易列表。

**请求参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量（最大 100） |
| marketId | string | 否 | - | 按市场筛选 |
| address | string | 否 | - | 按地址筛选（maker 或 taker） |
| direction | string | 否 | - | BUY 或 SELL |

**响应格式**

```json
{
  "data": [
    {
      "id": 1,
      "txHash": "0x...",
      "logIndex": 0,
      "blockNumber": 12345678,
      "timestamp": "2026-01-15T10:30:00Z",
      "orderHash": "0x...",
      "maker": "0x...",
      "taker": "0x...",
      "tokenId": "12345",
      "direction": "BUY",
      "price": 0.65,
      "makerAmountFilled": "1000000000",
      "takerAmountFilled": "650000000",
      "fee": "1000000",
      "market": {
        "id": "0x...",
        "title": "Will X happen?"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

### 5.2 GET /api/markets

获取市场列表（含统计信息）。

**请求参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |
| sortBy | string | 否 | tradeCount | 排序字段 |
| order | string | 否 | desc | asc 或 desc |

**sortBy 可选值**

- tradeCount: 成交笔数
- volume: 成交量
- recent: 最近活跃

**响应格式**

```json
{
  "data": [
    {
      "id": "0x...",
      "title": "Will X happen?",
      "conditionId": "0x...",
      "tokenYes": "12345",
      "tokenNo": "67890",
      "active": true,
      "stats": {
        "tradeCount": 150,
        "volume": 50000.00,
        "avgPrice": 0.62,
        "lastPrice": 0.65,
        "lastTradeAt": "2026-01-15T10:30:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "hasMore": true
  }
}
```

### 5.3 GET /api/markets/[id]

获取单个市场详情。

**响应格式**

```json
{
  "market": {
    "id": "0x...",
    "title": "Will X happen?",
    "conditionId": "0x...",
    "tokenYes": "12345",
    "tokenNo": "67890",
    "active": true
  },
  "stats": {
    "tradeCount": 150,
    "volume": 50000.00,
    "avgPrice": 0.62,
    "lastPrice": 0.65
  },
  "priceHistory": [
    { "timestamp": "2026-01-15T00:00:00Z", "price": 0.60 },
    { "timestamp": "2026-01-15T06:00:00Z", "price": 0.62 },
    { "timestamp": "2026-01-15T12:00:00Z", "price": 0.65 }
  ],
  "recentTrades": [
    // 最近 10 条交易
  ]
}
```

### 5.4 GET /api/traders

获取交易者排行榜。

**请求参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |
| tag | string | 否 | - | 按标签筛选 |
| sortBy | string | 否 | tradeCount | 排序字段 |

**响应格式**

```json
{
  "data": [
    {
      "address": "0x...",
      "tradeCount": 50,
      "marketCount": 10,
      "totalVolume": 25000.00,
      "lastActiveAt": "2026-01-15T10:30:00Z",
      "tags": ["Whale", "Trend"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

### 5.5 GET /api/traders/[address]

获取地址详情。

**响应格式**

```json
{
  "address": "0x...",
  "stats": {
    "tradeCount": 50,
    "marketCount": 10,
    "totalVolume": 25000.00,
    "firstTradeAt": "2026-01-01T00:00:00Z",
    "lastActiveAt": "2026-01-15T10:30:00Z"
  },
  "tags": [
    { "tag": "Whale", "source": "auto" },
    { "tag": "VIP", "source": "manual" }
  ],
  "markets": [
    {
      "id": "0x...",
      "title": "Will X happen?",
      "tradeCount": 10,
      "volume": 5000.00
    }
  ],
  "recentTrades": [
    // 最近 20 条交易
  ]
}
```

### 5.6 POST /api/tags

添加地址标签。

**请求体**

```json
{
  "address": "0x...",
  "tag": "VIP"
}
```

**响应格式**

```json
{
  "success": true,
  "tag": {
    "id": 1,
    "address": "0x...",
    "tag": "VIP",
    "source": "manual",
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

### 5.7 DELETE /api/tags

删除地址标签。

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| address | string | 是 | 地址 |
| tag | string | 是 | 标签名 |

**响应格式**

```json
{
  "success": true
}
```

### 5.8 错误码

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_PARAMS | 参数校验失败 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | DUPLICATE | 重复操作 |
| 500 | INTERNAL_ERROR | 内部错误 |

**错误响应格式**

```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Invalid page number"
  }
}
```

---

## 6. 错误处理策略

### 6.1 RPC 重试机制

```typescript
// lib/rpc-client.ts

const RPC_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,      // 1s
  maxDelay: 10000,      // 10s
  backoffMultiplier: 2,
};

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  config = RPC_CONFIG
): Promise<T> {
  let lastError: Error;
  let delay = config.baseDelay;

  for (let i = 0; i < config.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`RPC attempt ${i + 1} failed:`, error);

      if (i < config.maxRetries - 1) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }
  }

  throw lastError!;
}
```

### 6.2 Gamma API 降级

```typescript
// lib/market-service.ts

// 本地缓存文件路径
const CACHE_FILE = "./data/markets-cache.json";

async function getMarketsWithFallback(): Promise<GammaMarket[]> {
  try {
    // 尝试从 API 获取
    const markets = await fetchMarketsFromAPI();

    // 更新本地缓存
    await saveCache(markets);

    return markets;
  } catch (error) {
    console.warn("Gamma API unavailable, using local cache");

    // 降级：读取本地缓存
    const cached = await loadCache();
    if (cached.length > 0) {
      return cached;
    }

    throw new Error("No market data available");
  }
}
```

### 6.3 数据校验

```typescript
// lib/validators.ts

import { z } from "zod";

// 交易查询参数校验
const TradeQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  marketId: z.string().optional(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  direction: z.enum(["BUY", "SELL"]).optional(),
});

// 标签请求体校验
const TagRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tag: z.string().min(1).max(50),
});

// 使用示例
function validateTradeQuery(params: unknown) {
  return TradeQuerySchema.safeParse(params);
}
```

### 6.4 日志记录

```typescript
// lib/logger.ts

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    targets: [
      // 控制台输出
      {
        target: "pino-pretty",
        level: "info",
        options: { colorize: true },
      },
      // 文件输出
      {
        target: "pino/file",
        level: "debug",
        options: { destination: "./logs/app.log" },
      },
    ],
  },
});

// 使用示例
logger.info({ txHash, blockNumber }, "Processing OrderFilled event");
logger.error({ error, context }, "Failed to decode event");
```

---

## 7. 目录结构

```
polymarket-dashboard/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── trades/
│   │   │   └── route.ts
│   │   ├── markets/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── traders/
│   │   │   ├── route.ts
│   │   │   └── [address]/
│   │   │       └── route.ts
│   │   └── tags/
│   │       └── route.ts
│   ├── components/               # React 组件
│   │   ├── trades/
│   │   ├── markets/
│   │   ├── traders/
│   │   └── common/
│   ├── hooks/                    # 自定义 Hooks
│   ├── page.tsx                  # 首页
│   └── layout.tsx                # 布局
├── lib/                          # 核心逻辑
│   ├── indexer.ts                # 链上索引器
│   ├── market-service.ts         # 市场服务
│   ├── trade-decoder.ts          # 交易解码
│   ├── repository.ts             # 数据存储
│   ├── rpc-client.ts             # RPC 客户端
│   ├── validators.ts             # 参数校验
│   └── logger.ts                 # 日志工具
├── types/                        # TypeScript 类型
│   ├── trade.ts
│   ├── market.ts
│   └── api.ts
├── prisma/                       # Prisma ORM
│   ├── schema.prisma
│   └── migrations/
├── scripts/                      # 脚本
│   ├── fetch-data.sh             # 数据拉取
│   ├── dev.sh                    # 开发启动
│   └── build.sh                  # 构建
├── logs/                         # 日志目录
├── data/                         # 缓存数据
├── docs/                         # 文档
├── .env.example                  # 环境变量示例
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

### 文件职责说明

| 文件/目录 | 职责 | 行数限制 |
|-----------|------|----------|
| app/api/*/route.ts | API 路由处理 | ≤300 |
| app/components/* | React 组件 | ≤300 |
| lib/*.ts | 核心业务逻辑 | ≤300 |
| types/*.ts | 类型定义 | ≤300 |
| scripts/*.sh | 启停脚本 | - |

---

## 8. 部署方案

### 8.1 开发环境

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local：
# - POLYGON_RPC_URL=https://polygon-rpc.com
# - DATABASE_URL=file:./dev.db

# 3. 初始化数据库
pnpm prisma migrate dev

# 4. 拉取初始数据
./scripts/fetch-data.sh

# 5. 启动开发服务器
./scripts/dev.sh
```

### 8.2 环境变量

```bash
# .env.example

# Polygon RPC
POLYGON_RPC_URL=https://polygon-rpc.com

# 数据库
DATABASE_URL=file:./dev.db

# 日志级别
LOG_LEVEL=info

# Gamma API (可选，有默认值)
GAMMA_API_URL=https://gamma-api.polymarket.com
```

### 8.3 生产环境

MVP 阶段采用单节点部署：

```
┌─────────────────────────────────────┐
│           Single Node               │
├─────────────────────────────────────┤
│  Next.js (API + SSR)                │
│  SQLite (本地文件)                   │
│  Cron Job (定时数据同步)             │
└─────────────────────────────────────┘
```

**部署选项**：

1. **Vercel**（推荐）
   - 零配置部署
   - 自动 HTTPS
   - 注意：SQLite 需替换为 Turso 或 PlanetScale

2. **Railway / Render**
   - 支持持久化存储
   - 可使用 SQLite

3. **VPS 自建**
   - 完全控制
   - 适合数据敏感场景

---

## 9. 限制与演进

### 9.1 MVP 限制

| 限制 | 说明 | 后续方案 |
|------|------|----------|
| PnL 近似 | 未精确追踪持仓变化 | 引入会计系统 |
| 非实时 | 批量抓取，非 WebSocket | 添加实时推送 |
| 无登录 | 公开访问 | 添加用户系统 |
| 无钱包连接 | 无链上交互 | 集成 WalletConnect |
| SQLite | 单机存储 | 迁移 PostgreSQL |

### 9.2 后续演进

**Phase 2 - 增强功能**
- 精准 PnL 计算
- 实时数据推送 (WebSocket)
- 高级筛选与搜索

**Phase 3 - 用户系统**
- 钱包登录
- 自定义 Watchlist
- 邮件/Telegram 通知

**Phase 4 - 智能分析**
- AI 市场解读
- 跟单系统
- 市场情绪指数

---

## 附录

### A. OrderFilled 事件 ABI

```json
{
  "anonymous": false,
  "inputs": [
    { "indexed": true, "name": "orderHash", "type": "bytes32" },
    { "indexed": true, "name": "maker", "type": "address" },
    { "indexed": true, "name": "taker", "type": "address" },
    { "indexed": false, "name": "makerAssetId", "type": "uint256" },
    { "indexed": false, "name": "takerAssetId", "type": "uint256" },
    { "indexed": false, "name": "makerAmountFilled", "type": "uint256" },
    { "indexed": false, "name": "takerAmountFilled", "type": "uint256" },
    { "indexed": false, "name": "fee", "type": "uint256" }
  ],
  "name": "OrderFilled",
  "type": "event"
}
```

### B. 参考资源

- [Polymarket Docs](https://docs.polymarket.com/)
- [Gamma API](https://gamma-api.polymarket.com/)
- [Polygon RPC](https://polygon.technology/)
- [ethers.js](https://docs.ethers.org/)
- [Prisma](https://www.prisma.io/)
- [Next.js](https://nextjs.org/)
