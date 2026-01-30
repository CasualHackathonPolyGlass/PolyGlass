/**
 * 简单的内存缓存
 * 支持 TTL 和后台刷新
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  refreshing: boolean;
}

interface CacheOptions {
  /** 缓存有效期 (ms)，默认 60 秒 */
  ttl?: number;
  /** 过期后是否返回旧数据并后台刷新，默认 true */
  staleWhileRevalidate?: boolean;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 60 * 1000; // 60 秒

/**
 * 获取缓存数据，过期时自动刷新
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, staleWhileRevalidate = true } = options;
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  // 缓存命中且未过期
  if (entry && now - entry.timestamp < ttl) {
    return entry.data;
  }

  // 缓存过期但有数据，返回旧数据并后台刷新
  if (entry && staleWhileRevalidate && !entry.refreshing) {
    entry.refreshing = true;
    refreshInBackground(key, fetcher, entry);
    return entry.data;
  }

  // 无缓存或正在刷新，同步获取
  if (entry?.refreshing) {
    return entry.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: now, refreshing: false });
  return data;
}

async function refreshInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  entry: CacheEntry<T>
): Promise<void> {
  try {
    const data = await fetcher();
    cache.set(key, { data, timestamp: Date.now(), refreshing: false });
  } catch {
    entry.refreshing = false;
  }
}

/**
 * 清除指定缓存
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * 预热缓存（用于进程启动时加载文件缓存）
 */
export function seedCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now(), refreshing: false });
}
