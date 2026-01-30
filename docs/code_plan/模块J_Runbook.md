# 模块J：运行指南 (Runbook) - 开发文档

---

## 1. 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | ≥ 18 |
| pnpm | ≥ 8 |

---

## 2. 环境变量

创建 `.env.local`：

```bash
# 必需
RPC_URL=https://polygon-rpc.com

# 可选（有默认值）
GAMMA_API_BASE=https://gamma-api.polymarket.com
```

---

## 3. 快速启动

### Demo 一键启动

```bash
pnpm demo
```

或分步执行：

```bash
# 1. 安装依赖
pnpm install

# 2. 拉取数据
pnpm fetch

# 3. 启动开发服务器
pnpm dev

# 4. 打开浏览器
open http://localhost:3000/dashboard
```

---

## 4. Scripts 说明

| 命令 | 说明 |
|------|------|
| `pnpm fetch` | 拉取链上数据 |
| `pnpm dev` | 启动开发服务器 |
| `pnpm validate` | 验证数据质量 |
| `pnpm demo` | 一键启动（fetch + dev） |

---

## 5. 数据拉取流程

```typescript
// scripts/fetch.ts

import { fetchMarketsWithFallback } from "@/markets/gamma";
import { scanOrderFilledLogs } from "@/indexer/scan";
import { decodeLogs } from "@/decoder/decode";
import { resolveTrades } from "@/resolver/resolve";
import { saveMarkets, saveTrades } from "@/db";

async function main() {
  console.log("📦 Fetching markets from Gamma...");
  const { markets, tokenMap } = await fetchMarketsWithFallback();
  saveMarkets(markets);
  console.log(`✅ Saved ${markets.length} markets`);

  console.log("\n🔗 Scanning OrderFilled logs...");
  const logs = await scanOrderFilledLogs();
  console.log(`✅ Found ${logs.length} logs`);

  console.log("\n🔄 Decoding logs...");
  const { trades: decoded } = decodeLogs(logs);
  console.log(`✅ Decoded ${decoded.length} trades`);

  console.log("\n🎯 Resolving markets...");
  const { resolved } = resolveTrades(decoded, tokenMap);
  console.log(`✅ Resolved ${resolved.length} trades`);

  console.log("\n💾 Saving to database...");
  const saved = saveTrades(resolved);
  console.log(`✅ Saved ${saved} new trades`);

  console.log("\n🎉 Done!");
}

main().catch(console.error);
```

---

## 6. package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",

    "fetch": "ts-node scripts/fetch.ts",
    "validate": "ts-node scripts/validate.ts",

    "demo": "pnpm fetch && pnpm dev"
  }
}
```

---

## 7. 评审环境运行

```bash
# 克隆仓库
git clone <repo>
cd polymarket-dashboard

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填写 RPC_URL

# 一键启动
pnpm install
pnpm demo

# 验证
open http://localhost:3000/dashboard
```

---

## 8. 常见问题

### Q: pnpm fetch 报错 RPC 失败

```bash
# 检查 RPC_URL 是否有效
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Q: trades < 100

```bash
# 增大扫描范围重新拉取
rm data/app.db
pnpm fetch
```

### Q: 端口 3000 被占用

```bash
pnpm dev -- -p 3001
```

---

## 9. 目录结构

```
polymarket-dashboard/
├── app/
│   ├── api/           # API Routes
│   └── dashboard/     # Dashboard 页面
├── components/        # React 组件
├── db/                # 数据库操作
├── src/
│   ├── markets/       # 模块A
│   ├── indexer/       # 模块B
│   ├── decoder/       # 模块C
│   └── resolver/      # 模块D
├── scripts/           # 脚本
│   ├── fetch.ts
│   └── validate.ts
├── data/              # SQLite 数据库
├── .env.local         # 环境变量
└── package.json
```

---

## 10. 验收 Checklist

- [ ] `.env.local` 已配置 RPC_URL
- [ ] `pnpm install` 成功
- [ ] `pnpm fetch` 成功（trades ≥ 100）
- [ ] `pnpm validate` 全部通过
- [ ] `pnpm dev` 启动成功
- [ ] `/dashboard` 显示 ≥ 100 条交易
