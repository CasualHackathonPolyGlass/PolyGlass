# PolyGlass

## 项目简介

PolyGlass 是一个 Polymarket 链上数据聚合与可视化平台，为量化团队、DAO 和交易者提供机构级的预测市场数据分析工具。

## 技术架构

**前端**
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 (霓虹玻璃风 UI)
- Recharts 数据可视化 + Three.js 3D 效果
- Zustand 状态管理 + React Query 数据获取

**后端**
- Next.js API Routes (Edge Runtime)
- Turso (libSQL) 云数据库
- Polygon RPC 链上数据索引

**数据层**
- Polymarket Gamma API (市场/事件数据)
- Polygon 链上日志 (交易/入金事件)
- ethers.js 链上交互

## 快速开始

### 环境要求

- Node.js 20+
- pnpm 9+
- 有效的 Polygon RPC URL
- Turso 数据库账号（可选，无配置时自动降级到 Gamma API）

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/your-org/PolyGlass.git
cd PolyGlass
```

2. 安装依赖
```bash
pnpm install
```

3. 配置环境变量
```bash
cp .env.example .env.local
```

编辑 `.env.local`：
```env
# Polygon RPC (必需)
POLYGON_RPC_URL=https://polygon-rpc.com

# Turso 数据库 (可选)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Gamma API (可选，有默认值)
GAMMA_API_BASE=https://gamma-api.polymarket.com
```

4. 运行项目
```bash
pnpm dev
```

### 运行命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 (http://localhost:3000) |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | 代码检查 |
| `pnpm test` | 运行测试 |
| `pnpm fetch` | 手动同步市场数据 |

## 功能说明

- **实时市场数据**: 展示 Polymarket 活跃市场的赔率、交易量、持仓量
- **市场热力图**: 按分类/交易量可视化市场活跃度
- **Smart Money 追踪**: 识别和追踪高胜率交易者的链上行为
- **交易员排行榜**: 按 ROI、胜率、交易量等维度排名
- **事件日历**: 预测市场结算时间线视图
- **AI 分析**: 基于 LLM 的市场趋势分析

## 数据来源

| 数据类型 | 来源 | 获取方式 |
|----------|------|----------|
| 市场/事件元数据 | Polymarket Gamma API | REST API 轮询 |
| 实时价格 | Polymarket CLOB | WebSocket / REST |
| 交易记录 | Polygon 链上日志 | RPC eth_getLogs |
| 入金/出金 | USDC Transfer 事件 | RPC eth_getLogs |
| 地址类型 | Polygon 链上状态 | RPC eth_getCode |

**关键合约地址 (Polygon)**
- CTF Exchange: `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`
- USDC.e: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- Native USDC: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`

## 团队成员

- 待补充
