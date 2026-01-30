# 模块G：Dashboard 前端 - 开发文档

---

## 1. 职责

展示：

- trades 表格
- markets 图表
- traders 排行榜

---

## 2. 数据接口

全部来自模块F的 API：

- `GET /api/trades`
- `GET /api/markets`
- `GET /api/traders`

---

## 3. 组件列表

| 组件 | 说明 |
|------|------|
| `TradesTable` | 交易表格（核心） |
| `MarketsChart` | 市场柱状图 |
| `TradersTable` | 交易者排行榜 |

---

## 4. 文件结构

```
app/
  dashboard/
    page.tsx           # Dashboard 主页
components/
  TradesTable.tsx
  MarketsChart.tsx
  TradersTable.tsx
```

---

## 5. 实现代码

### Dashboard 页面

```tsx
// app/dashboard/page.tsx
import { TradesTable } from "@/components/TradesTable";
import { MarketsChart } from "@/components/MarketsChart";
import { TradersTable } from "@/components/TradersTable";

export default async function DashboardPage() {
  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold">
        Polymarket Smart Money Dashboard
      </h1>

      <section>
        <h2 className="text-xl font-semibold mb-4">Top Markets</h2>
        <MarketsChart />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
        <TradesTable />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Top Traders</h2>
        <TradersTable />
      </section>
    </div>
  );
}
```

### TradesTable 组件

```tsx
// components/TradesTable.tsx
"use client";

import { useEffect, useState } from "react";

interface Trade {
  txHash: string;
  blockNumber: number;
  maker: string;
  taker: string;
  direction: "BUY" | "SELL";
  price: number;
  marketTitle: string;
}

export function TradesTable() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trades?limit=100")
      .then(r => r.json())
      .then(data => {
        setTrades(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Tx Hash</th>
            <th className="px-4 py-2 text-left">Block</th>
            <th className="px-4 py-2 text-left">Direction</th>
            <th className="px-4 py-2 text-left">Price</th>
            <th className="px-4 py-2 text-left">Market</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2 font-mono text-sm">
                <a
                  href={`https://polygonscan.com/tx/${t.txHash}`}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  {t.txHash.slice(0, 10)}...
                </a>
              </td>
              <td className="px-4 py-2">{t.blockNumber}</td>
              <td className={`px-4 py-2 font-medium ${
                t.direction === "BUY" ? "text-green-600" : "text-red-600"
              }`}>
                {t.direction}
              </td>
              <td className="px-4 py-2">{t.price.toFixed(2)}</td>
              <td className="px-4 py-2 truncate max-w-xs">{t.marketTitle}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### MarketsChart 组件

```tsx
// components/MarketsChart.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Market {
  id: string;
  title: string;
  trade_count: number;
  volume: number;
}

export function MarketsChart() {
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    fetch("/api/markets")
      .then(r => r.json())
      .then(data => setMarkets(data.data.slice(0, 10)));
  }, []);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={markets}>
          <XAxis
            dataKey="title"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip />
          <Bar dataKey="trade_count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### TradersTable 组件

```tsx
// components/TradersTable.tsx
"use client";

import { useEffect, useState } from "react";

interface Trader {
  address: string;
  trade_count: number;
  market_count: number;
}

export function TradersTable() {
  const [traders, setTraders] = useState<Trader[]>([]);

  useEffect(() => {
    fetch("/api/traders")
      .then(r => r.json())
      .then(data => setTraders(data.data.slice(0, 20)));
  }, []);

  return (
    <table className="min-w-full border">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-2 text-left">Address</th>
          <th className="px-4 py-2 text-left">Trades</th>
          <th className="px-4 py-2 text-left">Markets</th>
        </tr>
      </thead>
      <tbody>
        {traders.map((t, i) => (
          <tr key={i} className="border-t hover:bg-gray-50">
            <td className="px-4 py-2 font-mono text-sm">
              {t.address.slice(0, 10)}...{t.address.slice(-8)}
            </td>
            <td className="px-4 py-2">{t.trade_count}</td>
            <td className="px-4 py-2">{t.market_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 6. 依赖

```json
{
  "dependencies": {
    "recharts": "^2.x"
  }
}
```

---

## 7. 验收

- [ ] `/dashboard` 页面可访问
- [ ] TradesTable 显示 ≥ 100 条交易
- [ ] 每条交易的 txHash 可点击跳转到 Polygonscan
- [ ] 显示 direction（BUY 绿色 / SELL 红色）
- [ ] 显示 price 和 marketTitle
