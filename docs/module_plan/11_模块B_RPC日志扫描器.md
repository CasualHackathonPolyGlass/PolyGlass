# 模块B：RPC 日志扫描器（Scanner）

**模块编号**：11
**版本**：v0.1

---

## 1. 目标

从 Polygon RPC 通过 `eth_getLogs` 拉取 `OrderFilled` 事件 logs，累计 ≥100 条。

---

## 2. 接口定义

### 输入

| 参数 | 类型 | 说明 |
|------|------|------|
| `RPC_URL` | string | Polygon RPC 端点 |
| `contractAddresses` | string[] | Exchange 合约地址列表 |
| `fromBlock` | number | 起始区块（可选，默认从最新往前） |
| `blockRange` | number | 单次查询窗口，默认 20,000 |
| `minLogs` | number | 最少日志数量，默认 100 |

### 输出

```typescript
interface RawLog {
  blockNumber: number;
  txHash: string;
  logIndex: number;
  topics: string[];      // topics[0] = OrderFilled topic
  data: string;          // 未解码的 data
  address: string;       // 合约地址
}
```

---

## 3. 合约信息

### Polymarket CTF Exchange 合约

| 类型 | 地址 |
|------|------|
| Current | `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E` |
| Legacy | `0xC5d563A36AE78145C45a50134d48A1215220f80a` |

### OrderFilled Event Topic

```typescript
// keccak256("OrderFilled(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)")
const ORDER_FILLED_TOPIC = "0xd0a08e8c493f9c94f29311604c9de1b4e8c8d4c06bd0c789af57f2d65b...";
```

---

## 4. 扫描策略

```
┌─────────────────────────────────────────────────────────────┐
│                      扫描策略流程                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. 获取最新区块号                                          │
│      latestBlock = eth_blockNumber()                        │
│      │                                                      │
│      ▼                                                      │
│   2. 设置初始窗口                                            │
│      toBlock = latestBlock                                  │
│      fromBlock = toBlock - blockRange                       │
│      │                                                      │
│      ▼                                                      │
│   3. 查询日志                                                │
│      logs = eth_getLogs({                                   │
│        fromBlock,                                           │
│        toBlock,                                             │
│        address: contractAddresses,                          │
│        topics: [ORDER_FILLED_TOPIC]                         │
│      })                                                     │
│      │                                                      │
│      ▼                                                      │
│   4. 累计日志                                                │
│      allLogs.push(...logs)                                  │
│      │                                                      │
│      ▼                                                      │
│   5. 检查数量                                                │
│      if (allLogs.length >= minLogs) → 返回                   │
│      else → 向前移动窗口，重复步骤 3                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 代码接口

```typescript
// lib/indexer.ts

interface ScannerConfig {
  rpcUrl: string;
  contractAddresses: string[];
  blockRange: number;      // 默认 20000
  minLogs: number;         // 默认 100
}

interface ScanResult {
  logs: RawLog[];
  fromBlock: number;
  toBlock: number;
  scannedBlocks: number;
}

// 主函数
async function scanOrderFilledLogs(config: ScannerConfig): Promise<ScanResult>;

// 辅助函数
async function getLatestBlockNumber(rpcUrl: string): Promise<number>;
async function getLogs(params: GetLogsParams): Promise<RawLog[]>;
```

---

## 6. RPC 调用示例

### eth_blockNumber

```json
{
  "jsonrpc": "2.0",
  "method": "eth_blockNumber",
  "params": [],
  "id": 1
}
```

### eth_getLogs

```json
{
  "jsonrpc": "2.0",
  "method": "eth_getLogs",
  "params": [{
    "fromBlock": "0x3567890",
    "toBlock": "0x356ABCD",
    "address": ["0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"],
    "topics": ["0xd0a08e8c..."]
  }],
  "id": 1
}
```

---

## 7. 错误处理

| 错误类型 | 处理策略 |
|----------|----------|
| RPC 超时 | 重试 3 次，指数退避 |
| 窗口过大 | 减半窗口重试 |
| 返回空 | 继续向前扫描 |
| 达到创世块 | 停止扫描，返回已有日志 |

### 重试配置

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};
```

---

## 8. 产物文件

| 文件 | 说明 |
|------|------|
| `data/logs_orderfilled.json` | 原始日志列表 |

### 文件格式示例

```json
{
  "fromBlock": 55000000,
  "toBlock": 55100000,
  "totalLogs": 150,
  "logs": [
    {
      "blockNumber": 55050000,
      "txHash": "0x1234...",
      "logIndex": 0,
      "topics": ["0xd0a08e8c..."],
      "data": "0x...",
      "address": "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
    }
  ]
}
```

---

## 9. 验收标准

- [ ] 本地生成 `data/logs_orderfilled.json`
- [ ] 日志条数 ≥ 100
- [ ] 每条日志包含必要字段（txHash, blockNumber, topics, data）
- [ ] topics[0] 为 OrderFilled event topic
