# 模块A：Gamma 市场元数据服务 - 开发文档

---

## 1. 职责

从 Gamma API 拉取 Polymarket 市场数据，构建：

- `marketId` → 市场信息
- `tokenId` → market + YES/NO

---

## 2. 输入

### 环境变量

```bash
GAMMA_API_BASE=https://gamma-api.polymarket.com
```

### HTTP 请求

```
GET /markets?active=true
```

---

## 3. 输出 Schema

```typescript
interface Market {
  marketId: string;
  title: string;
  conditionId: string;
  tokenYes: string;
  tokenNo: string;
}

interface TokenMap {
  [tokenId: string]: {
    marketId: string;
    outcome: "YES" | "NO";
  };
}
```

---

## 4. 核心接口

```typescript
async function fetchMarkets(): Promise<{
  markets: Market[];
  tokenMap: TokenMap;
}>;
```

---

## 5. 实现要点

### Gamma 响应结构

Gamma API 返回 `markets[]`，每个 market 包含 `clobTokenIds[2]`：

| 索引 | 含义 |
|------|------|
| `clobTokenIds[0]` | **NO** token |
| `clobTokenIds[1]` | **YES** token |

> **注意**：index 0 是 NO，index 1 是 YES，不要搞反。

### 核心逻辑

```typescript
for (const m of gammaMarkets) {
  markets.push({
    marketId: m.id,
    title: m.question,
    conditionId: m.conditionId,
    tokenYes: m.clobTokenIds[1],
    tokenNo: m.clobTokenIds[0],
  });

  // NO token
  tokenMap[m.clobTokenIds[0]] = {
    marketId: m.id,
    outcome: "NO",
  };

  // YES token
  tokenMap[m.clobTokenIds[1]] = {
    marketId: m.id,
    outcome: "YES",
  };
}
```

### Gamma API 分页

```typescript
// Gamma 支持 limit + offset 分页
// MVP 可一次拉取足够数量
const GAMMA_LIMIT = 500;

async function fetchAllMarkets(): Promise<GammaMarket[]> {
  const allMarkets: GammaMarket[] = [];
  let offset = 0;

  while (true) {
    const batch = await fetchPage(offset, GAMMA_LIMIT);
    allMarkets.push(...batch);

    if (batch.length < GAMMA_LIMIT) break;
    offset += GAMMA_LIMIT;
  }

  return allMarkets;
}
```

---

## 6. 文件结构

```
src/markets/
  gamma.ts       # Gamma API 调用
  tokenMap.ts    # TokenMap 构建逻辑
```

### gamma.ts

```typescript
// src/markets/gamma.ts

const GAMMA_API_BASE = process.env.GAMMA_API_BASE
  || "https://gamma-api.polymarket.com";

interface GammaMarketResponse {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  clobTokenIds: string[];
  outcomes: string[];
  active: boolean;
}

export async function fetchGammaMarkets(): Promise<GammaMarketResponse[]> {
  const url = `${GAMMA_API_BASE}/markets?active=true&limit=500`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Gamma API failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
```

### tokenMap.ts

```typescript
// src/markets/tokenMap.ts

import type { Market, TokenMap } from "@/types/market";
import type { GammaMarketResponse } from "./gamma";

export function buildMarketData(gammaMarkets: GammaMarketResponse[]): {
  markets: Market[];
  tokenMap: TokenMap;
} {
  const markets: Market[] = [];
  const tokenMap: TokenMap = {};

  for (const m of gammaMarkets) {
    if (!m.clobTokenIds || m.clobTokenIds.length < 2) continue;

    markets.push({
      marketId: m.id,
      title: m.question,
      conditionId: m.conditionId,
      tokenYes: m.clobTokenIds[1],
      tokenNo: m.clobTokenIds[0],
    });

    tokenMap[m.clobTokenIds[0]] = { marketId: m.id, outcome: "NO" };
    tokenMap[m.clobTokenIds[1]] = { marketId: m.id, outcome: "YES" };
  }

  return { markets, tokenMap };
}
```

---

## 7. 降级策略

```typescript
import { readFileSync, writeFileSync } from "fs";

const CACHE_PATH = "./data/markets-cache.json";

export async function fetchMarketsWithFallback() {
  try {
    const raw = await fetchGammaMarkets();
    const result = buildMarketData(raw);

    // 更新缓存
    writeFileSync(CACHE_PATH, JSON.stringify(result, null, 2));

    return result;
  } catch (err) {
    console.warn("Gamma API failed, loading cache:", err);
    const cached = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
    return cached;
  }
}
```

---

## 8. 验收

- [ ] `tokenMap` 中 key 数量 > 0
- [ ] `markets` 数组长度 > 0
- [ ] 每个 market 有 `tokenYes` 和 `tokenNo`
- [ ] `clobTokenIds[0]` 映射为 NO，`clobTokenIds[1]` 映射为 YES
