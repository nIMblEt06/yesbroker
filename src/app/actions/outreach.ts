"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getIpHash } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rate-limit";

export interface ContactResult {
  counted: boolean;
  count: number;
}

export async function recordContact(brokerId: number): Promise<ContactResult> {
  if (!Number.isInteger(brokerId) || brokerId <= 0) {
    return { counted: false, count: -1 };
  }
  const ipHash = await getIpHash();
  const { allowed } = await checkRateLimit("contact", ipHash, 20, 60);
  if (!allowed) return { counted: false, count: -1 };
  const ins = await sql`
    insert into outreach_events (broker_id, kind, ip_hash)
    values (${brokerId}, 'contact', ${ipHash})
    on conflict (broker_id, kind, ip_hash) do nothing
    returning id
  `;
  let count = 0;
  if (ins.length > 0) {
    const rows = await sql`
      update brokers set contact_count = contact_count + 1
      where id = ${brokerId}
      returning contact_count
    `;
    count = Number(rows[0]?.contact_count ?? 0);
  } else {
    const rows = await sql`select contact_count from brokers where id = ${brokerId}`;
    count = Number(rows[0]?.contact_count ?? 0);
  }
  revalidatePath("/");
  return { counted: ins.length > 0, count };
}

export interface FlatFoundResult {
  ok: boolean;
  counted?: boolean;
  error?: string;
}

export async function reportFlatFound(brokerId: number): Promise<FlatFoundResult> {
  if (!Number.isInteger(brokerId) || brokerId <= 0) {
    return { ok: false, error: "Invalid broker." };
  }
  const ipHash = await getIpHash();
  const { allowed } = await checkRateLimit("flat-found", ipHash, 20, 60);
  if (!allowed) return { ok: false, error: "Slow down a little and try again." };
  const ins = await sql`
    insert into outreach_events (broker_id, kind, ip_hash)
    values (${brokerId}, 'flat_found', ${ipHash})
    on conflict (broker_id, kind, ip_hash) do nothing
    returning id
  `;
  if (ins.length === 0) {
    return { ok: true, counted: false };
  }
  await sql`
    update brokers set flats_found = flats_found + 1
    where id = ${brokerId}
  `;
  revalidatePath("/");
  return { ok: true, counted: true };
}
