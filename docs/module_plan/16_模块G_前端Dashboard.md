# 模块G：前端 Dashboard

**模块编号**：16
**版本**：v0.1

---

## 1. 目标

提供 Web 可视化界面展示数据，满足前端展示验收基线。

---

## 2. 页面结构

### /dashboard 页面布局

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Header                                     │
│  Polymarket Smart Money Dashboard                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │     Top Markets             │  │     Market Price Line        │  │
│  │     (柱状图/表格)            │  │     (折线图)                  │  │
│  │                             │  │                              │  │
│  └─────────────────────────────┘  └─────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Trades Table                              │   │
│  │  (链上交易验证 - 核心)                                        │   │
│  │  txHash | block | maker | taker | direction | price | market │   │
│  │  ─────────────────────────────────────────────────────────── │   │
│  │  0x123..| 55000 | 0x111.| 0x222.| BUY       | 0.65  | Will X │   │
│  │  0x456..| 54999 | 0x333.| 0x444.| SELL      | 0.63  | Will Y │   │
│  │  ...                                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Top Traders                               │   │
│  │  address | trades | markets | volume | lastActive | tags     │   │
│  │  ─────────────────────────────────────────────────────────── │   │
│  │  0x111.. | 100    | 15      | 50000  | 2h ago     | [Whale]  │   │
│  │  ...                                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 组件列表

| 组件 | 优先级 | 说明 |
|------|--------|------|
| **TradesTable** | 必须 | 链上交易表格（核心验收项） |
| **TopMarkets** | 推荐 | 市场柱状图/表格 |
| **PriceLineChart** | 推荐 | 市场价格折线图 |
| **TopTraders** | 推荐 | 交易者排行榜 |
| **TradeDetailDrawer** | 可选 | 交易详情抽屉 |
| **AddressDrawer** | 可选 | 地址详情抽屉 |

---

## 4. 组件详细设计

### 4.1 TradesTable（必须）

链上交易验证核心组件。

#### 显示字段

| 字段 | 说明 | 格式 |
|------|------|------|
| txHash | 交易哈希 | 截断显示 + 复制按钮 |
| blockNumber | 区块号 | 数字 |
| maker | Maker 地址 | 截断显示 |
| taker | Taker 地址 | 截断显示 |
| direction | 方向 | BUY(绿) / SELL(红) |
| price | 价格 | 0.00 ~ 1.00 |
| marketTitle | 市场 | 截断显示 |
| timestamp | 时间 | 相对时间 |

#### 交互功能

- 点击行展开显示解码字段
- 点击 txHash 复制到剪贴板
- 分页加载
- 按 market/direction 筛选

#### 代码结构

```typescript
// components/trades/TradesTable.tsx
interface TradesTableProps {
  trades: Trade[];
  loading: boolean;
  onPageChange: (page: number) => void;
  pagination: Pagination;
}

// components/trades/TradeRow.tsx
interface TradeRowProps {
  trade: Trade;
  expanded: boolean;
  onToggle: () => void;
}

// components/trades/TradeDetail.tsx
interface TradeDetailProps {
  trade: Trade;
}
```

### 4.2 TopMarkets

市场统计展示。

#### 显示内容

- 市场标题
- 成交笔数
- 成交量
- 最新价格

#### 展示形式

- 柱状图（volume）
- 或表格形式

### 4.3 PriceLineChart

市场价格走势。

#### 数据结构

```typescript
interface PricePoint {
  timestamp: string;
  price: number;
}

interface ChartData {
  marketId: string;
  marketTitle: string;
  priceHistory: PricePoint[];
}
```

### 4.4 TopTraders

交易者排行榜。

#### 显示字段

| 字段 | 说明 |
|------|------|
| address | 地址（截断） |
| tradeCount | 交易次数 |
| marketCount | 参与市场数 |
| totalVolume | 总成交量 |
| lastActiveAt | 最近活跃 |
| tags | 标签 chips |

---

## 5. 数据获取

### 使用 React Query

```typescript
// hooks/useTrades.ts
import { useQuery } from '@tanstack/react-query';

export function useTrades(options?: TradeQueryOptions) {
  return useQuery({
    queryKey: ['trades', options],
    queryFn: () => fetch(`/api/trades?${new URLSearchParams(options)}`).then(r => r.json()),
    staleTime: 30_000,
  });
}

// hooks/useMarkets.ts
export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    queryFn: () => fetch('/api/markets').then(r => r.json()),
    staleTime: 60_000,
  });
}

// hooks/useTraders.ts
export function useTraders() {
  return useQuery({
    queryKey: ['traders'],
    queryFn: () => fetch('/api/traders').then(r => r.json()),
    staleTime: 60_000,
  });
}
```

---

## 6. 组件目录结构

```
app/
├── dashboard/
│   └── page.tsx              # Dashboard 主页面
├── components/
│   ├── trades/
│   │   ├── TradesTable.tsx   # 交易表格
│   │   ├── TradeRow.tsx      # 单行交易
│   │   └── TradeDetail.tsx   # 交易详情
│   ├── markets/
│   │   ├── TopMarkets.tsx    # 市场排行
│   │   └── PriceChart.tsx    # 价格图表
│   ├── traders/
│   │   ├── TopTraders.tsx    # 交易者排行
│   │   └── AddressDrawer.tsx # 地址详情
│   └── common/
│       ├── Pagination.tsx    # 分页组件
│       ├── Loading.tsx       # 加载状态
│       └── CopyButton.tsx    # 复制按钮
└── hooks/
    ├── useTrades.ts
    ├── useMarkets.ts
    └── useTraders.ts
```

---

## 7. 样式方案

### Tailwind CSS

```tsx
// 示例：TradeRow 组件
<tr className="border-b hover:bg-gray-50">
  <td className="px-4 py-2 font-mono text-sm">
    {truncateHash(trade.txHash)}
    <CopyButton text={trade.txHash} />
  </td>
  <td className="px-4 py-2">{trade.blockNumber}</td>
  <td className={cn(
    "px-4 py-2 font-medium",
    trade.direction === 'BUY' ? 'text-green-600' : 'text-red-600'
  )}>
    {trade.direction}
  </td>
  <td className="px-4 py-2">{trade.price.toFixed(2)}</td>
</tr>
```

---

## 8. 验收标准

- [ ] 打开 `/dashboard` 能看到页面
- [ ] Trades 表格显示 ≥ 100 条交易
- [ ] 每条交易显示 txHash、direction、price、market
- [ ] txHash 可复制
- [ ] 点击行能展开看到解码字段
- [ ] 页面响应式（移动端可用）
