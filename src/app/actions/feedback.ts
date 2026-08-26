"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getIpHash } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rate-limit";

export interface FeedbackResult {
  counted: boolean;
  votes?: number;
  message: string;
}

const AUTO_HIDE_THRESHOLD = 3;

const REASONS = ["wrong_number", "dead_number", "spam", "abusive", "other"] as const;

export async function voteHelpful(brokerId: number): Promise<FeedbackResult> {
  if (!Number.isInteger(brokerId)) return { counted: false, message: "Invalid broker." };
  const ipHash = await getIpHash();
  const { allowed } = await checkRateLimit("vote", ipHash, 20, 60);
  if (!allowed) return { counted: false, message: "Slow down a little and try again." };

  const result = await sql.begin(async (tx) => {
    const ins = await tx`
      insert into votes (broker_id, ip_hash)
      values (${brokerId}, ${ipHash})
      on conflict (broker_id, ip_hash) do nothing
      returning id
    `;
    if (ins.length === 0) {
      const cur = await tx`select helpful_votes from brokers where id = ${brokerId}`;
      return { counted: false, votes: cur.length ? Number(cur[0].helpful_votes) : 0 };
    }
    const upd = await tx`
      update brokers set helpful_votes = helpful_votes + 1
      where id = ${brokerId}
      returning helpful_votes
    `;
    return { counted: true, votes: Number(upd[0].helpful_votes) };
  });

  revalidatePath("/");
  return result.counted
    ? { counted: true, votes: result.votes, message: "Counted. Thanks!" }
    : { counted: false, votes: result.votes, message: "You already marked this one." };
}

export async function reportBroker(
  brokerId: number,
  reason: string,
  note: string
): Promise<FeedbackResult> {
  if (!Number.isInteger(brokerId)) return { counted: false, message: "Invalid broker." };
  if (!(REASONS as readonly string[]).includes(reason)) {
    return { counted: false, message: "Pick a reason." };
  }
  const ipHash = await getIpHash();
  const { allowed } = await checkRateLimit("report", ipHash, 20, 60);
  if (!allowed) return { counted: false, message: "Slow down a little and try again." };

  const result = await sql.begin(async (tx) => {
    const ins = await tx`
      insert into reports (broker_id, ip_hash, reason, note)
      values (${brokerId}, ${ipHash}, ${reason}, ${note?.trim() || null})
      on conflict (broker_id, ip_hash) do nothing
      returning id
    `;
    if (ins.length === 0) {
      return { counted: false, hidden: false };
    }
    const upd = await tx`
      update brokers set
        report_count = report_count + 1,
        is_hidden = (report_count + 1) >= ${AUTO_HIDE_THRESHOLD}
      where id = ${brokerId}
      returning is_hidden
    `;
    return { counted: true, hidden: Boolean(upd[0]?.is_hidden) };
  });

  revalidatePath("/");
  if (!result.counted) return { counted: false, message: "Already reported from here." };
  return {
    counted: true,
    message: result.hidden ? "Reported. Hidden for review." : "Reported. Thanks.",
  };
}
