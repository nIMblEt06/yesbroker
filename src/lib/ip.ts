import { createHash } from "node:crypto";
import { headers } from "next/headers";

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "0.0.0.0";
}

export async function getIpHash(): Promise<string> {
  const ip = await getClientIp();
  return createHash("sha256").update(ip + (process.env.IP_SALT ?? "")).digest("hex");
}
