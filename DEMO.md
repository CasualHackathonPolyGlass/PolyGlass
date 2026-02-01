# 演示说明

PolyGlass 是一个 Polymarket 数据智能分析平台，提供市场数据、Smart Money 追踪和洞察功能。

## 演示步骤

### 1. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 2. 浏览 Overview 页面

- 查看市场概览统计
- 查看异常交易卡片
- 查看热门事件轮播

### 3. 浏览 Markets 页面

- 访问 http://localhost:3000/markets
- 使用搜索框搜索市场（如 "Trump"、"Bitcoin"）
- 点击标签筛选（Sports、Crypto、Politics 等）
- 点击 "+" 展开查看事件下的子市场
- 点击市场标题跳转到 Polymarket 原站

### 4. 连接钱包

- 点击右上角 "Connect" 按钮
- 选择钱包类型（MetaMask、WalletConnect 等）
- 授权连接到 Polygon 网络
- 连接后显示地址和链信息

### 5. 查看 Smart Money 页面

- 访问 http://localhost:3000/smart-money
- 查看 Smart Money 交易者列表
- 查看其持仓和胜率统计

### 6. 同步数据（可选）

```bash
# 同步最新市场和交易数据
pnpm tsx scripts/fetch.ts

# 生成 Smart Money 分析
pnpm tsx scripts/process-smart-money.ts
```

## 预期输出

### Markets 页面

- 显示按事件分组的市场列表
- 每个事件显示：标题、价格、来源、Volume、Open Interest、结束日期、标签
- 支持排序（按 Volume、结束日期等）
- 分页显示，默认每页 50 条

### 钱包连接

- 未连接：显示渐变 "Connect" 按钮
- 已连接：显示 `[Polygon] [0x1234...abcd ▼]`
- 点击地址可查看详情或断开连接

### Smart Money 页面

- 显示高绩效交易者列表
- 包含 PnL、ROI、胜率、评分等指标

## 截图

![功能截图](screenshots/demo.png)

## 演示数据

使用的示例市场/交易哈希：

- Market: `will-there-be-another-us-government-shutdown-by-january-31`
- Tx: `0x916cad96dd5c219997638133512fd17fe7c1ce72b830157e4fd5323cf4f19946`

### 数据库统计

```
Fills: ~80,000 条
Events: ~2,900 个
Markets: ~10,000 个
Smart Traders: 15 个
```

### API 端点

| 端点 | 说明 |
|------|------|
| GET /api/markets | 获取市场列表 |
| GET /api/events/[id]/markets | 获取事件下的市场 |
| GET /api/smart-money | 获取 Smart Money 数据 |

## 技术栈

- **前端**: Next.js 15 + React 19 + Tailwind CSS
- **数据库**: Turso (libSQL)
- **区块链**: Polygon + Alchemy RPC
- **钱包**: RainbowKit + wagmi + viem
- **缓存**: React Query + HTTP Cache-Control
