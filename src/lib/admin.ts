import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getIpHash } from "./ip";
import { checkRateLimit } from "./rate-limit";

export const ADMIN_COOKIE = "ba_admin";

export function adminToken(): string {
  return createHmac("sha256", process.env.ADMIN_PASSWORD ?? "")
    .update("brokers-age-admin-v1")
    .digest("hex");
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const expected = adminToken();
  if (value.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function checkLoginAllowed(): Promise<boolean> {
  const ipHash = await getIpHash();
  const { allowed } = await checkRateLimit("admin-login", ipHash, 5, 3600);
  return allowed;
}
