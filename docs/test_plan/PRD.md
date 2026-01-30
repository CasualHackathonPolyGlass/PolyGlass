# Polymarket Smart Money Dashboard

## 产品需求文档（PRD）

**版本**：v0.1 (Hackathon MVP)
**作者**：Khalil
**时间**：2026-01

---

## 1. 项目背景

预测市场（Prediction Market）是重要的信息聚合工具，但当前普通用户在 Polymarket 上面临以下问题：

- 无法快速识别"聪明钱"（高胜率 / 高频 / 大资金地址）
- 缺乏链上透明的交易画像工具
- 很难判断某个市场当前的真实资金倾向
- 无法直观看到大户/KOL的交易行为

与此同时，Polymarket 所有交易行为都发生在 Polygon 链上，具备完整可验证的链上数据基础。

**本项目目标**：通过直接解析 Polygon 链上的 Polymarket OrderFilled 事件，构建一个类似 Nansen 的 Smart Money Dashboard，实现：

> 用真实链上数据还原交易行为，为预测市场提供透明的"资金视角"。

---

## 2. 产品目标

### 核心目标

构建一个可运行的 Web Dashboard，实现：

1. 从 Polygon 链实时拉取 Polymarket 真实交易数据
2. 解码 OrderFilled 事件并归类到对应市场
3. 对交易者进行基础画像分析
4. 提供市场维度与交易者维度的可视化界面

### Hackathon MVP 成功标准

项目必须满足：

- [ ] 至少展示 100 条真实链上 OrderFilled 交易
- [ ] 正确解析价格、方向、TokenId
- [ ] 能将交易归属到具体市场
- [ ] 数据持久化存储
- [ ] 提供 HTTP API
- [ ] 提供可视化前端界面

---

## 3. 用户画像

### 主要用户

| 用户类型 | 需求描述 |
|----------|----------|
| 预测市场交易者 | 希望了解聪明钱动向、热门市场趋势 |
| Web3 数据研究者 | 希望获取结构化预测市场链上数据 |
| 黑客松评审 / 开发者 | 关注链上数据解码能力与产品完整度 |

---

## 4. 产品范围（MVP）

### 4.1 Dashboard 首页

默认展示，无需用户输入地址。

#### A. 链上交易验证区（核心）

表格展示最近 OrderFilled 交易：

| 字段 | 说明 |
|------|------|
| txHash | 交易哈希 |
| blockNumber | 区块号 |
| maker | 做市商地址 |
| taker | 吃单方地址 |
| tokenId | 代币 ID |
| direction | BUY / SELL |
| price | 价格 (0~1) |
| amount | 成交量 |
| market title | 市场标题 |
| timestamp | 时间戳 |

支持展开查看原始 event 字段：
- makerAssetId
- takerAssetId
- makerAmountFilled
- takerAmountFilled
- fee

**目的**：向评审证明所有数据来自 Polygon 链真实 OrderFilled 解码。

#### B. 市场维度分析

**Top Markets 面板**：

| 展示内容 |
|----------|
| 市场标题 |
| 成交笔数 |
| 成交量 |
| 最近成交价走势（折线） |

点击某市场可展示：
- 该市场最近成交记录
- price 时间序列

#### C. 交易者榜单

**Top Traders（按活跃度排序）**：

| 字段 | 说明 |
|------|------|
| 地址 | 交易者地址 |
| 交易次数 | 总交易笔数 |
| 参与市场数 | 参与的市场数量 |
| 最近活跃时间 | 最后一次交易时间 |
| 标签 | Whale / Arb / Trend |

点击地址可展示：
- 最近交易列表
- 参与市场
- 简易行为画像

#### D. 标签系统（加分项）

支持：
- 手动给地址打标签
- 自动规则标签：

| 标签 | 规则 |
|------|------|
| Whale | 单笔交易额超过阈值 |
| Arbitrage | 短时间内频繁反向交易 |
| Trend | 在价格快速波动阶段加仓 |

---

## 5. 功能需求

### 5.1 链上数据采集

- 使用 Polygon RPC
- 调用 `eth_getLogs`
- 监听 Polymarket Exchange 合约 OrderFilled 事件
- 至少拉取 100 条真实交易

### 5.2 交易解码

必须正确解析：
- orderHash
- maker
- taker
- makerAssetId
- takerAssetId
- makerAmountFilled
- takerAmountFilled
- fee

并派生：
- tokenId（通过 Gamma token 映射）
- direction（BUY / SELL）
- price（基于成交量比例）

### 5.3 市场识别

使用 Gamma API 获取 markets：
- marketId
- title
- conditionId
- clobTokenIds (YES / NO)

构建：
- tokenId → market 映射

### 5.4 数据存储

使用 SQLite：

**Tables**：
- markets
- trades
- address_tags

每条 OrderFilled 唯一键：`(txHash, logIndex)`

### 5.5 HTTP API

至少包含：

| 端点 | 方法 |
|------|------|
| `/api/trades` | GET |
| `/api/markets` | GET |
| `/api/traders` | GET |
| `/api/tags` | POST |

### 5.6 前端展示

Web Dashboard 包含：
- Trades Table
- Market Bar Chart
- Price Line Chart
- Trader Table

---

## 6. 技术架构

### 数据流

```
Polygon RPC
    ↓
OrderFilled Logs
    ↓
Event Decoder
    ↓
TokenId → Market Mapping (Gamma API)
    ↓
SQLite
    ↓
HTTP API
    ↓
Next.js Dashboard
```

---

## 7. 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | Next.js + TypeScript + Tailwind + Recharts/ECharts |
| 后端 | Node.js + ethers/viem |
| 数据库 | SQLite + Prisma |
| 链上 | Polygon RPC |
| 元数据 | Polymarket Gamma API |

---

## 8. 非目标（明确不做）

MVP 阶段不包含：

- 实时 websocket
- 完整精确 PnL 会计系统
- 自动交易执行
- 钱包连接
- 用户登录

---

## 9. 创新点

1. 直接从 Polygon 链解析预测市场交易（非中心化 API）
2. 将 OrderFilled 映射为市场级成交行为
3. 提供预测市场专用 Smart Money Dashboard
4. 地址行为画像 + 市场资金流结合展示

---

## 10. 后续扩展方向

- 精确 realized/unrealized PnL
- Copy Trading
- 市场情绪指数
- Whale Alert
- AI 市场解读
- Telegram 信号推送
