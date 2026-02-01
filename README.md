# PolyGlass

Polymarket 链上数据聚合与可视化平台。基于 LLM 进行市场趋势分析，为量化团队和交易者提供机构级的预测市场数据分析工具。

## 功能特性

| 模块 | 说明 |
|------|------|
| **Overview** | 市场概览统计、异常交易卡片、热门事件轮播 |
| **Markets** | 20,000+ 市场实时浏览，支持搜索/筛选/排序，自动同步 Polymarket 数据 |
| **Smart Money** | 识别高胜率交易者，追踪链上行为，PnL/ROI/胜率排名 |
| **Insights** | 基于 LLM 的市场趋势分析，输入事件 URL 即可获取洞察 |
| **Calendar** | 预测市场结算时间线，按日期查看即将结算的市场 |
| **钱包连接** | RainbowKit 集成，支持 MetaMask/WalletConnect/Coinbase 等 |

## 技术架构

```
┌─────────────────────────────────────────────────┐
│  前端: Next.js 16 + React 19 + Tailwind CSS 4   │
│  可视化: Recharts + Three.js                     │
│  状态: React Query + Zustand                     │
│  钱包: RainbowKit + wagmi + viem                 │
├─────────────────────────────────────────────────┤
│  API: Next.js API Routes                         │
├──────────────────────┬──────────────────────────┤
│  Gamma API (自动)    │  Polygon RPC (手动)       │
│  市场/事件元数据      │  交易日志/Smart Money     │
│  ≤60s 延迟同步       │  存储到 Turso DB          │
└──────────────────────┴──────────────────────────┘
```

## 快速开始

### 环境要求

- Node.js 20+ / pnpm 9+
- Polygon RPC URL（Smart Money 功能需要）
- Turso 数据库账号（可选，Smart Money 功能需要）

### 安装

```bash
git clone https://github.com/CasualHackathonPolyGlass/PolyGlass.git
cd PolyGlass
pnpm install
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# Polygon RPC（Smart Money 功能需要）
POLYGON_RPC_URL=https://polygon-rpc.com

# Turso 数据库（可选，Smart Money 功能需要）
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# WalletConnect（可选）
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-project-id
```

### 运行

```bash
pnpm dev        # 启动开发服务器 http://localhost:3000
pnpm build      # 构建生产版本
pnpm fetch      # 同步 Smart Money 链上数据
```

> Markets 页面数据从 Gamma API 自动同步，无需手动操作。

## 数据来源

| 数据类型 | 来源 | 同步方式 |
|----------|------|----------|
| 市场/事件元数据 | Polymarket Gamma API | 自动（≤60s 延迟） |
| 实时价格 | Polymarket CLOB | 实时 |
| 交易记录 | Polygon 链上日志 | 手动 `pnpm fetch` |
| 入金/出金 | USDC Transfer 事件 | 手动 `pnpm fetch` |

**关键合约地址 (Polygon)**

- CTF Exchange: `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`
- USDC.e: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- Native USDC: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`


## 团队成员



## 鸣谢

感谢 **[OGBC](https://www.ogbc.com/)** 提供的学习文档支持。
