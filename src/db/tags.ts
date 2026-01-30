/**
 * 模块E/H：Tags 数据操作
 */
import { getDb } from "./init";

interface TagRow {
  id: number;
  address: string;
  tag: string;
  created_at: string;
}

/**
 * 添加标签
 */
export function addTag(address: string, tag: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO address_tags (address, tag) VALUES (?, ?)
  `).run(address.toLowerCase(), tag);
}

/**
 * 查询标签（可选按地址筛选）
 */
export function getTags(address?: string): TagRow[] {
  const db = getDb();
  if (address) {
    return db
      .prepare("SELECT * FROM address_tags WHERE address = ?")
      .all(address.toLowerCase()) as TagRow[];
  }
  return db.prepare("SELECT * FROM address_tags").all() as TagRow[];
}

/**
 * 批量查询多个地址的标签
 */
export function getTagsForAddresses(addresses: string[]): Record<string, string[]> {
  if (addresses.length === 0) return {};

  const db = getDb();
  const placeholders = addresses.map(() => "?").join(",");
  const lowerAddrs = addresses.map((a) => a.toLowerCase());

  const rows = db
    .prepare(`SELECT address, tag FROM address_tags WHERE address IN (${placeholders})`)
    .all(...lowerAddrs) as Array<{ address: string; tag: string }>;

  const result: Record<string, string[]> = {};
  for (const row of rows) {
    if (!result[row.address]) result[row.address] = [];
    result[row.address].push(row.tag);
  }
  return result;
}
