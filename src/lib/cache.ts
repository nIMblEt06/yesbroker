import "server-only";
import { getRedis } from "./redis";

/**
 * TTL-only read-through cache backed by Upstash Redis. No invalidation: writers
 * don't clear these keys, so callers should only wrap views where a few seconds
 * to a few minutes of staleness after a write is acceptable.
 */
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  const hit = await redis.get<T>(key);
  if (hit !== null && hit !== undefined) return hit;

  const value = await load();
  await redis.set(key, value, { ex: ttlSeconds });
  return value;
}
