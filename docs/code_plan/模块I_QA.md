# 模块I：数据验证 (QA) - 开发文档

---

## 1. 职责

校验数据质量，确保符合验收标准。

---

## 2. 校验项

| 校验项 | 标准 | 说明 |
|--------|------|------|
| trades 数量 | ≥ 100 | MVP 最低要求 |
| txHash 可验证 | 合法格式 | 可跳转 Polygonscan |
| price 合法 | 0 < price < 1 | 异常需标记 |
| 字段完整 | 非空 | maker/taker/direction |

---

## 3. 验证脚本

```typescript
// scripts/validate.ts
import db from "@/db";

async function validate() {
  console.log("🔍 Running validation...\n");

  // 1. 检查 trades 数量
  const tradeCount = db.prepare("SELECT COUNT(*) as c FROM trades").get().c;
  console.log(`Trades count: ${tradeCount}`);
  if (tradeCount < 100) {
    console.error("❌ FAIL: trades < 100");
    process.exit(1);
  }
  console.log("✅ trades >= 100");

  // 2. 检查 txHash 格式
  const invalidTx = db.prepare(`
    SELECT COUNT(*) as c FROM trades
    WHERE tx_hash NOT LIKE '0x%' OR LENGTH(tx_hash) != 66
  `).get().c;
  if (invalidTx > 0) {
    console.error(`❌ FAIL: ${invalidTx} invalid txHash`);
    process.exit(1);
  }
  console.log("✅ All txHash valid");

  // 3. 检查 price 范围
  const priceAnomalies = db.prepare(`
    SELECT COUNT(*) as c FROM trades
    WHERE price <= 0 OR price >= 1 OR price IS NULL
  `).get().c;
  const priceRate = priceAnomalies / tradeCount;
  console.log(`Price anomalies: ${priceAnomalies} (${(priceRate * 100).toFixed(1)}%)`);
  if (priceRate > 0.1) {
    console.error("❌ FAIL: > 10% price anomalies");
    process.exit(1);
  }
  console.log("✅ Price anomalies < 10%");

  // 4. 检查必填字段
  const emptyFields = db.prepare(`
    SELECT COUNT(*) as c FROM trades
    WHERE maker = '' OR taker = '' OR direction = ''
  `).get().c;
  if (emptyFields > 0) {
    console.error(`❌ FAIL: ${emptyFields} empty required fields`);
    process.exit(1);
  }
  console.log("✅ All required fields filled");

  // 5. 检查 market 命中率
  const resolved = db.prepare(`
    SELECT COUNT(*) as c FROM trades WHERE market_id IS NOT NULL
  `).get().c;
  const hitRate = resolved / tradeCount;
  console.log(`Market hit rate: ${(hitRate * 100).toFixed(1)}%`);
  if (hitRate < 0.8) {
    console.warn("⚠️ WARN: market hit rate < 80%");
  } else {
    console.log("✅ Market hit rate >= 80%");
  }

  console.log("\n✅ All validations passed!");
}

validate().catch(err => {
  console.error("Validation error:", err);
  process.exit(1);
});
```

---

## 4. 手动验证

### 在 Polygonscan 验证 txHash

1. 从 `/dashboard` 复制任意 txHash
2. 打开 `https://polygonscan.com/tx/{txHash}`
3. 确认交易存在且合约地址正确

### 验证 API 响应

```bash
# 检查 trades API
curl http://localhost:3000/api/trades?limit=1 | jq

# 检查字段完整性
curl http://localhost:3000/api/trades?limit=100 | jq '.data | length'
```

---

## 5. 运行命令

```bash
# 运行验证脚本
pnpm validate
# 或
npx ts-node scripts/validate.ts
```

---

## 6. package.json

```json
{
  "scripts": {
    "validate": "ts-node scripts/validate.ts"
  }
}
```

---

## 7. 验收

- [ ] `pnpm validate` 全部通过
- [ ] 可在 Polygonscan 验证任意 txHash
- [ ] API 返回数据格式正确
