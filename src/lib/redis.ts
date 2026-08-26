import "server-only";
import { Redis } from "@upstash/redis";

declare global {
  var __baRedis: Redis | undefined;
}

export function getRedis(): Redis {
  globalThis.__baRedis ??= Redis.fromEnv();
  return globalThis.__baRedis;
}
