# 模块F：HTTP API 服务

**模块编号**：15
**版本**：v0.1

---

## 1. 目标

提供 HTTP API 端点，供前端展示与评审验收。

---

## 2. 端点总览

| 优先级 | 方法 | 端点 | 说明 |
|--------|------|------|------|
| **必须** | GET | `/api/trades` | 获取交易列表 |
| 推荐 | GET | `/api/markets` | 获取市场列表（含统计） |
| 推荐 | GET | `/api/traders` | 获取交易者排行 |
| 推荐 | POST | `/api/tags` | 添加地址标签 |
| 可选 | GET | `/api/tags` | 获取地址标签 |
| 可选 | DELETE | `/api/tags` | 删除地址标签 |

---

## 3. 端点详细设计

### 3.1 GET /api/trades（必须）

获取最新交易列表。

#### 请求参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `limit` | number | 否 | 20 | 返回数量（最大 100） |
| `offset` | number | 否 | 0 | 偏移量 |
| `marketId` | string | 否 | - | 按市场筛选 |
| `address` | string | 否 | - | 按地址筛选（maker 或 taker） |
| `direction` | string | 否 | - | BUY 或 SELL |

#### 响应格式

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "txHash": "0x1234...",
      "blockNumber": 55050000,
      "logIndex": 0,
      "maker": "0x1111...",
      "taker": "0x2222...",
      "tokenId": "12345",
      "direction": "BUY",
      "price": 0.65,
      "makerAmountFilled": "1000000000000000000",
      "takerAmountFilled": "650000000",
      "fee": "1000000",
      "marketId": "0x5678...",
      "marketTitle": "Will X happen?",
      "outcomeSide": "YES",
      "timestamp": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

### 3.2 GET /api/markets

获取市场列表（含统计信息）。

#### 请求参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `limit` | number | 否 | 20 | 返回数量 |
| `offset` | number | 否 | 0 | 偏移量 |
| `sort` | string | 否 | volume | 排序字段 |
| `window` | string | 否 | 24h | 统计时间窗口 |

#### 响应格式

```json
{
  "success": true,
  "data": [
    {
      "id": "0x5678...",
      "title": "Will X happen?",
      "tradeCount": 50,
      "volume": 25000.00,
      "lastPrice": 0.65,
      "lastTradeAt": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 30
  }
}
```

### 3.3 GET /api/traders

获取交易者排行榜。

#### 请求参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `limit` | number | 否 | 20 | 返回数量 |
| `offset` | number | 否 | 0 | 偏移量 |
| `sort` | string | 否 | activity | 排序字段 |
| `window` | string | 否 | 7d | 统计时间窗口 |

#### 响应格式

```json
{
  "success": true,
  "data": [
    {
      "address": "0x1111...",
      "tradeCount": 100,
      "marketCount": 15,
      "totalVolume": 50000.00,
      "lastActiveAt": "2026-01-15T10:30:00Z",
      "tags": ["Whale"]
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 200
  }
}
```

### 3.4 POST /api/tags

添加地址标签。

#### 请求体

```json
{
  "address": "0x1111...",
  "tag": "Whale"
}
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "id": 1,
    "address": "0x1111...",
    "tag": "Whale",
    "source": "manual",
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

---

## 4. 错误响应

### 错误码

| HTTP 状态 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | INVALID_PARAMS | 参数校验失败 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | DUPLICATE | 重复操作 |
| 500 | INTERNAL_ERROR | 内部错误 |

### 错误格式

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Invalid limit parameter"
  }
}
```

---

## 5. 代码实现

### Next.js Route Handler 示例

```typescript
// app/api/trades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTrades, getTradeCount } from '@/lib/repository';
import { validateTradeQuery } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      limit: Number(searchParams.get('limit')) || 20,
      offset: Number(searchParams.get('offset')) || 0,
      marketId: searchParams.get('marketId'),
      address: searchParams.get('address'),
      direction: searchParams.get('direction'),
    };

    // 校验参数
    const validation = validateTradeQuery(params);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PARAMS', message: validation.error }
      }, { status: 400 });
    }

    // 查询数据
    const [trades, total] = await Promise.all([
      getTrades(params),
      getTradeCount(params),
    ]);

    return NextResponse.json({
      success: true,
      data: trades,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total,
        hasMore: params.offset + trades.length < total,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}
```

---

## 6. 参数校验

```typescript
// lib/validators.ts
import { z } from 'zod';

export const TradeQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  marketId: z.string().optional(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  direction: z.enum(['BUY', 'SELL']).optional(),
});

export const TagRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tag: z.string().min(1).max(50),
});
```

---

## 7. 验收标准

- [ ] `curl localhost:3000/api/trades?limit=100` 返回有效 JSON
- [ ] 返回数据包含所有必要字段
- [ ] limit=100 返回 100 条（或实际不足时返回全部）
- [ ] 错误情况返回正确的错误码和消息
