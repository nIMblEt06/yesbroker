import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

declare global {
  var __baLimiters: Map<string, Ratelimit> | undefined;
}

function getLimiter(bucket: string, limit: number, windowSeconds: number): Ratelimit {
  const limiters = (globalThis.__baLimiters ??= new Map());
  const cacheKey = `${bucket}:${limit}:${windowSeconds}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `ba:${bucket}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Sliding-window rate limit shared across serverless instances via Upstash Redis.
 * `bucket` names the action (e.g. "vote"); `key` is the caller identity (an IP hash).
 */
export async function checkRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean }> {
  const { success } = await getLimiter(bucket, limit, windowSeconds).limit(key);
  return { allowed: success };
}
