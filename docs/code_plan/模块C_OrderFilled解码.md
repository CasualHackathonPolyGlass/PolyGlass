# 模块C：OrderFilled 解码器 - 开发文档

---

## 1. 职责

将 `RawLog` 解码为结构化 `DecodedTrade`。

---

## 2. 输入

```typescript
// 模块B产出
RawLog[]
```

---

## 3. 输出 Schema

```typescript
interface DecodedTrade {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  maker: string;
  taker: string;
  makerAssetId: string;
  takerAssetId: string;
  makerAmount: bigint;
  takerAmount: bigint;
  fee: bigint;
}
```

---

## 4. 核心接口

```typescript
function decodeOrderFilled(log: RawLog): DecodedTrade;
```

---

## 5. 事件 ABI

```solidity
event OrderFilled(
    bytes32 indexed orderHash,
    address indexed maker,
    address indexed taker,
    uint256 makerAssetId,
    uint256 takerAssetId,
    uint256 makerAmountFilled,
    uint256 takerAmountFilled,
    uint256 fee
);
```

### 字段分布

```
topics[0]: Event Signature
topics[1]: orderHash (bytes32)
topics[2]: maker (address, 左填充 0 至 32 字节)
topics[3]: taker (address, 左填充 0 至 32 字节)

data (160 bytes = 5 × 32):
  [0x00..0x20]: makerAssetId    (uint256)
  [0x20..0x40]: takerAssetId    (uint256)
  [0x40..0x60]: makerAmountFilled (uint256)
  [0x60..0x80]: takerAmountFilled (uint256)
  [0x80..0xa0]: fee             (uint256)
```

---

## 6. 实现代码

### 方式一：ethers.js

```typescript
import { ethers } from "ethers";

const ORDER_FILLED_ABI = [
  "event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAssetId, uint256 takerAssetId, uint256 makerAmountFilled, uint256 takerAmountFilled, uint256 fee)",
];

const iface = new ethers.Interface(ORDER_FILLED_ABI);

export function decodeOrderFilled(log: RawLog): DecodedTrade {
  const parsed = iface.parseLog({
    topics: log.topics,
    data: log.data,
  });

  if (!parsed) throw new Error("Failed to decode log");

  return {
    txHash: log.transactionHash,
    logIndex: log.logIndex,
    blockNumber: log.blockNumber,
    maker: parsed.args.maker,
    taker: parsed.args.taker,
    makerAssetId: parsed.args.makerAssetId.toString(),
    takerAssetId: parsed.args.takerAssetId.toString(),
    makerAmount: parsed.args.makerAmountFilled,
    takerAmount: parsed.args.takerAmountFilled,
    fee: parsed.args.fee,
  };
}
```

### 方式二：viem

```typescript
import { decodeEventLog } from "viem";
import { orderFilledAbi } from "./abi";

export function decodeOrderFilled(log: RawLog): DecodedTrade {
  const decoded = decodeEventLog({
    abi: orderFilledAbi,
    data: log.data as `0x${string}`,
    topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
  });

  return {
    txHash: log.transactionHash,
    logIndex: log.logIndex,
    blockNumber: log.blockNumber,
    maker: decoded.args.maker,
    taker: decoded.args.taker,
    makerAssetId: decoded.args.makerAssetId.toString(),
    takerAssetId: decoded.args.takerAssetId.toString(),
    makerAmount: decoded.args.makerAmountFilled,
    takerAmount: decoded.args.takerAmountFilled,
    fee: decoded.args.fee,
  };
}
```

### 批量解码

```typescript
export function decodeLogs(logs: RawLog[]): {
  trades: DecodedTrade[];
  errors: { index: number; error: string }[];
} {
  const trades: DecodedTrade[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < logs.length; i++) {
    try {
      trades.push(decodeOrderFilled(logs[i]));
    } catch (err) {
      errors.push({ index: i, error: String(err) });
    }
  }

  return { trades, errors };
}
```

---

## 7. 校验规则

```typescript
function validateTrade(trade: DecodedTrade): boolean {
  const addrRegex = /^0x[a-fA-F0-9]{40}$/;

  return (
    addrRegex.test(trade.maker) &&
    addrRegex.test(trade.taker) &&
    trade.makerAssetId.length > 0 &&
    trade.takerAssetId.length > 0 &&
    trade.makerAmount > 0n &&
    trade.takerAmount > 0n
  );
}
```

---

## 8. 文件结构

```
src/decoder/
  decode.ts      # 解码逻辑
  abi.ts         # ABI 定义
  validate.ts    # 校验逻辑
```

---

## 9. 验收

- [ ] 所有字段非空
- [ ] `maker`/`taker` 为合法 0x 地址（42 字符）
- [ ] `makerAmount`/`takerAmount` > 0
- [ ] 解码成功率接近 100%
