<div align="center">

  ![logo](public/logo1.png)
# PolyGlass

**Polymarket 链上数据聚合与可视化平台**

[![Status](https://img.shields.io/badge/Status-MVP_Demo-success?style=for-the-badge)](https://github.com/CasualHackathonPolyGlass/PolyGlass)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

[![Polygon](https://img.shields.io/badge/Polygon-8247E5?style=flat-square&logo=polygon&logoColor=white)](https://polygon.technology/)
[![Polymarket](https://img.shields.io/badge/Polymarket-00D395?style=flat-square)](https://polymarket.com/)
[![RainbowKit](https://img.shields.io/badge/RainbowKit-7B3FE4?style=flat-square)](https://www.rainbowkit.com/)
[![Turso](https://img.shields.io/badge/Turso-4FF8D2?style=flat-square&logo=turso&logoColor=black)](https://turso.tech/)
[![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=three.js)](https://threejs.org/)

<p align="center">
  <b>聚合 Polymarket 链上交易数据与市场元数据，基于 LLM 进行市场趋势分析与异常检测。提供 20,000+ 市场实时浏览、Smart Money 链上追踪、PnL 排行榜、热力图可视化及市场结算日历，为量化团队、DAO 和交易者打造机构级的预测市场数据分析工具。</b>
</p>

[English](./README_EN.md) | 简体中文

</div>

---

## ✨ 功能特性

| 模块 | 说明 |
|:----:|------|
| 📊 **Overview** | 市场概览统计、异常交易卡片、热门事件轮播 |
| 🏪 **Markets** | 20,000+ 市场实时浏览，支持搜索/筛选/排序，自动同步 Polymarket 数据 |
| 💰 **Smart Money** | 识别高胜率交易者，追踪链上行为，PnL/ROI/胜率排名 |
| 🧠 **Insights** | 基于 LLM 的市场趋势分析，输入事件 URL 即可获取洞察 |
| 📅 **Calendar** | 预测市场结算时间线，按日期查看即将结算的市场 |
| 🔗 **钱包连接** | RainbowKit 集成，支持 MetaMask/WalletConnect/Coinbase 等 |

---

## 🏗️ 技术架构

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

---

## 📁 项目结构

```
PolyGlass/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API 路由
│   │   │   ├── markets/        #   市场数据接口
│   │   │   ├── smart-money/    #   Smart Money 接口
│   │   │   ├── events/         #   事件接口
│   │   │   ├── leaderboard/    #   排行榜接口
│   │   │   ├── stats/          #   统计接口
│   │   │   └── ...
│   │   ├── markets/            # Markets 页面
│   │   ├── smart-money/        # Smart Money 页面
│   │   ├── insights/           # Insights 页面
│   │   ├── calendar/           # Calendar 页面
│   │   ├── components/         # 页面级组件
│   │   └── hooks/              # 自定义 Hooks
│   ├── markets/                # 模块A: Gamma API 市场数据
│   ├── indexer/                # 模块B: Polygon 链上日志扫描
│   ├── decoder/                # 模块C: 日志解码
│   ├── resolver/               # 模块D: 交易解析与聚合
│   ├── db/                     # 模块E: Turso 数据库操作
│   ├── sync/                   # 数据同步逻辑
│   ├── components/             # 通用 UI 组件
│   ├── lib/                    # 工具库（缓存、日志、wagmi 配置）
│   ├── types/                  # TypeScript 类型定义
│   └── utils/                  # 辅助函数
├── scripts/                    # 数据同步与回填脚本
├── data/                       # 本地缓存数据（gitignore）
└── docs/                       # 项目文档
```

---

## 🚀 快速开始

### 环境要求

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9+-F69220?style=flat-square&logo=pnpm&logoColor=white)

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

> 💡 Markets 页面数据从 Gamma API 自动同步，无需手动操作。

---

## 📊 数据来源

| 数据类型 | 来源 | 同步方式 |
|:--------:|:----:|:--------:|
| 市场/事件元数据 | Polymarket Gamma API | 🟢 自动（≤60s 延迟） |
| 实时价格 | Polymarket CLOB | 🟢 实时 |
| 交易记录 | Polygon 链上日志 | 🟡 手动 `pnpm fetch` |
| 入金/出金 | USDC Transfer 事件 | 🟡 手动 `pnpm fetch` |

**关键合约地址 (Polygon)**

| 合约 | 地址 |
|------|------|
| CTF Exchange | `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E` |
| USDC.e | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| Native USDC | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |

---

## 🔄 数据同步与回填

### 自动同步

Markets 页面数据从 Polymarket Gamma API **自动同步**，内存缓存 60 秒，部署后无需手动操作。

### 手动同步

Smart Money 链上数据需要通过脚本手动同步：

```bash
pnpm fetch                    # 主同步：拉取最近 3 天的 OrderFilled 链上日志
```

### 数据回填

项目提供了一组回填脚本，用于补充历史数据和增强数据维度：

| 脚本 | 功能 | 说明 |
|------|------|------|
| `backfill-origin-type.ts` | 回填地址类型 | 识别 EOA / 合约地址 |
| `backfill-relayer.ts` | 回填 relayer 信息 | 识别代理交易 |
| `backfill-deposits.ts` | 回填 USDC 存款 | 扫描入金事件 |

按顺序执行：

```bash
pnpm tsx scripts/backfill-origin-type.ts
pnpm tsx scripts/backfill-relayer.ts
pnpm tsx scripts/backfill-deposits.ts
```

> ⚠️ **注意事项**
> - 主同步脚本 `pnpm fetch` 默认扫描最近 **3 天**（约 129,600 区块）的链上日志。如需回填更早的历史数据，可通过 `scanBlockRange(fromBlock, toBlock)` 函数指定区块范围。
> - 回填速度取决于所使用的 **RPC 节点性能和速率限制**。免费 RPC 可能较慢，推荐使用 Alchemy / Infura 等付费节点以获得更快的回填速度。

---

## 🗺️ Roadmap

### 🔜 近期计划

- [ ] **跟单功能** - 订阅 Smart Money 地址，实时推送交易动态
- [ ] **钱包分析** - 输入任意地址，查看历史持仓与 PnL
- [ ] **市场预警** - 异常交易量、价格波动实时通知

### 🚀 中期计划

- [ ] **多平台聚合** - 接入 Kalshi、Opinion 等预测市场，统一数据视图
- [ ] **跨平台套利** - 识别不同平台间的赔率差异

### 🌐 远期愿景

- [ ] **链上跟单执行** - 连接钱包一键跟单 Smart Money 交易
- [ ] **策略回测** - 历史数据回测交易策略表现
- [ ] **API 服务** - 开放 RESTful API 供第三方接入
- [ ] **社交预测插件** - 集成侧边栏插件，支持用户针对市场发表预测观点，基于预测准确率计算信誉分排名

---

## 👥 团队成员

<!-- 在此添加团队成员 -->

---

## 🙏 鸣谢

<a href="https://www.ogbc.com/">
  <img src="https://img.shields.io/badge/OGBC-Learning_Support-blue?style=for-the-badge" alt="OGBC" />
</a>
<a href="https://ethpanda.org/">
  <img src="https://img.shields.io/badge/ETHPanda-Hackathon_Platform-orange?style=for-the-badge" alt="ETHPanda" />
</a>
<a href="https://lxdao.io/">
  <img src="https://img.shields.io/badge/LXDAO-Hackathon_Platform-purple?style=for-the-badge" alt="LXDAO" />
</a>

感谢 **[OGBC](https://www.ogbc.com/)** 提供的学习文档支持。

感谢主办方 **[ETHPanda](https://ethpanda.org/)** 和 **[LXDAO](https://lxdao.io/)** 提供的休闲黑客松平台。

---

<div align="center">

**Made with ❤️ for the Polymarket Community**

[![GitHub stars](https://img.shields.io/github/stars/CasualHackathonPolyGlass/PolyGlass?style=social)](https://github.com/CasualHackathonPolyGlass/PolyGlass)

</div>
