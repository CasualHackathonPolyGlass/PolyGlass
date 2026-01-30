# 模块B：RPC OrderFilled 日志扫描 - 开发文档

---

## 1. 职责

使用 Polygon RPC 拉取 `OrderFilled` logs。

---

## 2. 输入

### 环境变量

```bash
RPC_URL=https://polygon-rpc.com
```

### 合约地址

```typescript
const EXCHANGE_ADDRESSES = [
  "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E", // Current
  "0xC5d563A36AE78145C45a50134d48A1215220f80a", // Legacy
];
```

---

## 3. 输出 Schema

```typescript
interface RawLog {
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  topics: string[];
  data: string;
}
```

---

## 4. 核心接口

```typescript
async function scanOrderFilledLogs(
  fromBlock: number,
  toBlock: number
): Promise<RawLog[]>;
```

---

## 5. 扫描策略

### 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `window` | 20,000 blocks | 单次查询区块范围 |
| `minLogs` | 100 | 最少获取日志数 |
| `direction` | 从 latest 向前 | 扫描方向 |

### 流程

```
latest block
    │
    ▼
[to - window, to]  ──► getLogs ──► 累加
    │
    ▼
logs >= 100?
    │
    ├─ 否 → to = from - 1, 继续
    │
    └─ 是 → 返回
```

### 核心逻辑

```typescript
async function scanUntilEnough(minLogs = 100): Promise<RawLog[]> {
  const logs: RawLog[] = [];
  let toBlock = await getLatestBlock();
  const window = 20_000;

  while (logs.length < minLogs) {
    const fromBlock = toBlock - window;

    const batch = await getLogs({
      fromBlock,
      toBlock,
      address: EXCHANGE_ADDRESSES,
      topics: [ORDER_FILLED_TOPIC],
    });

    logs.push(...batch);
    console.log(`Scanned ${fromBlock}-${toBlock}: +${batch.length} logs (total: ${logs.length})`);

    toBlock = fromBlock - 1;
  }

  return logs;
}
```

---

## 6. RPC 调用

### eth_blockNumber

```typescript
async function getLatestBlock(): Promise<number> {
  const res = await rpcCall("eth_blockNumber", []);
  return parseInt(res, 16);
}
```

### eth_getLogs

```typescript
async function getLogs(params: {
  fromBlock: number;
  toBlock: number;
  address: string[];
  topics: string[];
}): Promise<RawLog[]> {
  const res = await rpcCall("eth_getLogs", [{
    fromBlock: "0x" + params.fromBlock.toString(16),
    toBlock: "0x" + params.toBlock.toString(16),
    address: params.address,
    topics: params.topics,
  }]);

  return res.map((log: any) => ({
    blockNumber: parseInt(log.blockNumber, 16),
    transactionHash: log.transactionHash,
    logIndex: parseInt(log.logIndex, 16),
    topics: log.topics,
    data: log.data,
  }));
}
```

### RPC 通用封装

```typescript
async function rpcCall(method: string, params: any[]): Promise<any> {
  const res = await fetch(process.env.RPC_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}
```

---

## 7. 错误处理

| 错误 | 处理 |
|------|------|
| RPC 超时 | 指数退避重试 3 次 |
| 窗口过大（10000 limit） | 减半窗口重试 |
| 返回空 | 继续向前扫描 |

```typescript
async function rpcCallWithRetry(method: string, params: any[], retries = 3): Promise<any> {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      return await rpcCall(method, params);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`RPC retry ${i + 1}/${retries}:`, err);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}
```

---

## 8. 文件结构

```
src/indexer/
  scan.ts        # 扫描逻辑
  rpc.ts         # RPC 客户端封装
  config.ts      # 合约地址、topic 等常量
```

---

## 9. OrderFilled Topic

```typescript
// config.ts
import { keccak256, toBytes } from "viem";

export const ORDER_FILLED_TOPIC = keccak256(
  toBytes("OrderFilled(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)")
);

// 或用 ethers
import { ethers } from "ethers";
export const ORDER_FILLED_TOPIC = ethers.id(
  "OrderFilled(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)"
);
```

---

## 10. 验收

- [ ] `logs.length >= 100`
- [ ] 每条 log 包含 `transactionHash`、`blockNumber`、`topics`、`data`
- [ ] `topics[0]` 为 OrderFilled 事件签名
