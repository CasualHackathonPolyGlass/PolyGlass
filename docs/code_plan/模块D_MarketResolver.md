# 模块D：Token → Market Resolver - 开发文档

---

## 1. 职责

为每笔 trade 计算：

- `tokenId`（哪个是 outcome token）
- `marketId`（归属市场）
- `outcome`（YES / NO）
- `direction`（BUY / SELL）
- `price`（0~1）

---

## 2. 输入

```typescript
// 模块C产出
DecodedTrade[]

// 模块A产出
TokenMap
```

---

## 3. 输出 Schema

```typescript
interface ResolvedTrade extends DecodedTrade {
  tokenId: string;
  marketId: string;
  outcome: "YES" | "NO";
  direction: "BUY" | "SELL";
  price: number;
}
```

---

## 4. 核心接口

```typescript
function resolveTrade(
  trade: DecodedTrade,
  tokenMap: TokenMap
): ResolvedTrade;
```

---

## 5. 归类规则

### 5.1 TokenId 判定

```
if (makerAssetId in tokenMap) → tokenId = makerAssetId
else if (takerAssetId in tokenMap) → tokenId = takerAssetId
else → 无法归类
```

### 5.2 Direction 判定

```
语义：
  收到 outcome token → BUY
  给出 outcome token → SELL

逻辑：
  tokenId == makerAssetId
    → maker 提供 outcome token
    → taker 收到 outcome token
    → direction = "BUY"

  tokenId == takerAssetId
    → taker 提供 outcome token
    → maker 收到 outcome token
    → direction = "SELL"
```

### 5.3 Price 计算

```
price = Number(collateral) / Number(outcome)

BUY:
  taker 用 collateral 换 outcome
  collateral = takerAmount
  outcome = makerAmount
  price = takerAmount / makerAmount

SELL:
  taker 用 outcome 换 collateral
  collateral = makerAmount
  outcome = takerAmount
  price = makerAmount / takerAmount
```

---

## 6. 实现代码

```typescript
// src/resolver/resolve.ts

import type { DecodedTrade, ResolvedTrade } from "@/types/trade";
import type { TokenMap } from "@/types/market";

export function resolveTrade(
  trade: DecodedTrade,
  tokenMap: TokenMap
): ResolvedTrade | null {
  // 1. 判定 tokenId
  let tokenId: string;
  let isMakerOutcome: boolean;

  if (trade.makerAssetId in tokenMap) {
    tokenId = trade.makerAssetId;
    isMakerOutcome = true;
  } else if (trade.takerAssetId in tokenMap) {
    tokenId = trade.takerAssetId;
    isMakerOutcome = false;
  } else {
    return null; // 无法归类
  }

  // 2. 查询 market 信息
  const mapping = tokenMap[tokenId];

  // 3. 判定 direction
  //    maker 提供 outcome → taker 买入 → BUY
  //    taker 提供 outcome → taker 卖出 → SELL
  const direction = isMakerOutcome ? "BUY" : "SELL";

  // 4. 计算 price
  let price: number;
  if (direction === "BUY") {
    // collateral = takerAmount, outcome = makerAmount
    price = Number(trade.takerAmount) / Number(trade.makerAmount);
  } else {
    // collateral = makerAmount, outcome = takerAmount
    price = Number(trade.makerAmount) / Number(trade.takerAmount);
  }

  // 5. 价格校验
  if (!isFinite(price) || price < 0 || price > 1) {
    console.warn(`Price anomaly: ${price} for tx ${trade.txHash}`);
    price = Math.max(0, Math.min(1, price)); // clamp
  }

  return {
    ...trade,
    tokenId,
    marketId: mapping.marketId,
    outcome: mapping.outcome,
    direction,
    price,
  };
}
```

### 批量处理

```typescript
export function resolveTrades(
  trades: DecodedTrade[],
  tokenMap: TokenMap
): { resolved: ResolvedTrade[]; unresolved: DecodedTrade[] } {
  const resolved: ResolvedTrade[] = [];
  const unresolved: DecodedTrade[] = [];

  for (const trade of trades) {
    const result = resolveTrade(trade, tokenMap);
    if (result) {
      resolved.push(result);
    } else {
      unresolved.push(trade);
    }
  }

  console.log(`Resolved: ${resolved.length}/${trades.length}`);
  console.log(`Unresolved: ${unresolved.length}/${trades.length}`);

  return { resolved, unresolved };
}
```

---

## 7. 文件结构

```
src/resolver/
  resolve.ts      # 归类逻辑
  price.ts        # 价格计算（可选拆分）
```

---

## 8. 验收

- [ ] `price` ∈ (0, 1)（允许少量异常被 clamp）
- [ ] `marketId` 非空（已归类的记录）
- [ ] `direction` 为 `"BUY"` 或 `"SELL"`
- [ ] 命中率 > 80%
