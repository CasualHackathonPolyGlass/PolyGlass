/**
 * 模块E：数据库初始化
 * 使用 @libsql/client 连接 Turso 云数据库
 */
import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

export function getClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL 环境变量未设置");
  }

  client = createClient({ url, authToken });
  return client;
}

/** 兼容旧代码的别名 */
export const getDb = getClient;

export default getClient;
