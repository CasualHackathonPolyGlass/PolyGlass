# 模块H：标签系统 - 开发文档

---

## 1. 职责

支持手动给钱包地址打标签。

---

## 2. API

### POST /api/tags

**请求**

```json
{
  "address": "0x1234...",
  "tag": "Whale"
}
```

**响应**

```json
{
  "success": true
}
```

### GET /api/tags

**参数**

| 参数 | 说明 |
|------|------|
| address | 可选，按地址筛选 |

**响应**

```json
{
  "data": [
    { "address": "0x...", "tag": "Whale" }
  ]
}
```

---

## 3. 数据库表

```sql
CREATE TABLE address_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(address, tag)
);
```

---

## 4. 实现代码

### DB 操作

```typescript
// db/tags.ts
import db from "./index";

export function addTag(address: string, tag: string) {
  db.prepare(`
    INSERT INTO address_tags (address, tag)
    VALUES (?, ?)
  `).run(address, tag);
}

export function getTags(address?: string) {
  if (address) {
    return db.prepare(`
      SELECT * FROM address_tags WHERE address = ?
    `).all(address);
  }
  return db.prepare(`SELECT * FROM address_tags`).all();
}

export function getTagsForAddresses(addresses: string[]) {
  if (addresses.length === 0) return {};

  const placeholders = addresses.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT address, tag FROM address_tags
    WHERE address IN (${placeholders})
  `).all(...addresses);

  const result: Record<string, string[]> = {};
  for (const row of rows) {
    if (!result[row.address]) result[row.address] = [];
    result[row.address].push(row.tag);
  }
  return result;
}
```

### API Route

```typescript
// app/api/tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addTag, getTags } from "@/db/tags";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") || undefined;

  return NextResponse.json({ data: getTags(address) });
}

export async function POST(request: NextRequest) {
  const { address, tag } = await request.json();

  if (!address || !tag) {
    return NextResponse.json(
      { error: "Missing address or tag" },
      { status: 400 }
    );
  }

  try {
    addTag(address, tag);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Tag already exists" },
      { status: 409 }
    );
  }
}
```

### 前端展示

```tsx
// components/TagChip.tsx
interface TagChipProps {
  tag: string;
}

export function TagChip({ tag }: TagChipProps) {
  const colors: Record<string, string> = {
    Whale: "bg-blue-100 text-blue-800",
    Arb: "bg-purple-100 text-purple-800",
    VIP: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[tag] || "bg-gray-100"}`}>
      {tag}
    </span>
  );
}
```

### 在 TradersTable 中使用

```tsx
// 在 TradersTable 中添加标签列
{traders.map((t) => (
  <tr key={t.address}>
    <td>{t.address}</td>
    <td>{t.trade_count}</td>
    <td>
      {t.tags?.map(tag => (
        <TagChip key={tag} tag={tag} />
      ))}
    </td>
  </tr>
))}
```

---

## 5. 文件结构

```
db/
  tags.ts
app/api/
  tags/route.ts
components/
  TagChip.tsx
```

---

## 6. 验收

- [ ] `POST /api/tags` 能成功添加标签
- [ ] 添加后刷新页面标签仍存在
- [ ] 重复添加返回 409
- [ ] TradersTable 显示标签 chips
