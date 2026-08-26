"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getIpHash } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { resolveAreaToken } from "@/lib/areas";
import { slugify } from "@/lib/slugify";
import { mergeContacts, type ContactRow } from "@/lib/merge";

export interface SubmitItem {
  name?: string;
  phoneRaw: string;
  areaTokens: string[];
  notes?: string;
  company?: string;
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
  addedNew?: number;
  updated?: number;
  rejected?: { raw: string; reason: string }[];
  createdAreas?: string[];
  areaNames?: string[];
}

const MAX_BATCH = 100;
const RATE_LIMIT_ROWS_PER_HOUR = 200;

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function ensureAreaSlugs(tokens: string[], createdAreas: string[]): Promise<string[]> {
  const slugs: string[] = [];
  for (const token of tokens) {
    const t = token.trim();
    if (!t) continue;
    const curated = resolveAreaToken(t);
    const slug = curated?.slug ?? slugify(t);
    if (!slug || slugs.includes(slug)) continue;
    const found = await sql`select id, name from areas where slug = ${slug}`;
    if (found.length === 0) {
      const name = curated?.name ?? titleCase(t);
      await sql`
        insert into areas (name, slug, aliases, kind, source, sort_order)
        values (${name}, ${slug}, ${[t]}, 'area', 'user', 200)
        on conflict (slug) do nothing
      `;
      createdAreas.push(name);
    }
    slugs.push(slug);
  }
  return slugs;
}

export async function submitContacts(
  rawItems: SubmitItem[],
  source: "single" | "bulk"
): Promise<SubmitResult> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, error: "Nothing to add." };
  }
  if (rawItems.length > MAX_BATCH) {
    return { ok: false, error: `Please submit up to ${MAX_BATCH} contacts at a time.` };
  }
  if (rawItems.some((i) => typeof i.company === "string" && i.company.trim() !== "")) {
    return { ok: true, addedNew: 0, updated: 0 };
  }

  const ipHash = await getIpHash();
  const { allowed } = await checkRateLimit("submit-contacts", ipHash, 10, 60);
  if (!allowed) {
    return { ok: false, error: "That's a lot of adds from one network, please try again in a little while." };
  }

  const recentRows = await sql`
    select count(*)::int as n from submissions
    where ip_hash = ${ipHash} and created_at > now() - interval '1 hour'
  `;
  const recentCount = Number(recentRows[0]?.n ?? 0);
  if (recentCount + rawItems.length > RATE_LIMIT_ROWS_PER_HOUR) {
    return {
      ok: false,
      error:
        "That's a lot of adds from one network, please try again in a little while.",
    };
  }

  const createdAreas: string[] = [];
  const rejected: { raw: string; reason: string }[] = [];
  const rows: ContactRow[] = [];

  for (const item of rawItems) {
    if (!normalizePhone(item.phoneRaw ?? "")) {
      rejected.push({ raw: String(item.phoneRaw ?? ""), reason: "Not a valid 10-digit Indian mobile" });
      continue;
    }
    const name = item.name?.trim() ?? "";
    if (!name) {
      rejected.push({ raw: String(item.phoneRaw ?? ""), reason: "Name (person or agency) is required" });
      continue;
    }
    let areaSlugs: string[] = [];
    try {
      areaSlugs = await ensureAreaSlugs(item.areaTokens ?? [], createdAreas);
    } catch {
      areaSlugs = [];
    }
    rows.push({
      name,
      phoneRaw: item.phoneRaw,
      areaSlugs,
      nameAreaPhrases: [],
      comments: item.notes?.trim() || "",
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "No valid phone numbers found.", rejected };
  }

  const cards = mergeContacts(rows);
  const byPhone = new Map<string, ContactRow[]>();
  for (const row of rows) {
    const p = normalizePhone(row.phoneRaw)!;
    const list = byPhone.get(p);
    if (list) list.push(row);
    else byPhone.set(p, [row]);
  }

  let addedNew = 0;
  let updated = 0;
  const touchedAreaNames = new Set<string>();

  await sql.begin(async (tx) => {
    for (const card of cards) {
      const groupRows = byPhone.get(card.phone) ?? [];
      const existing = await tx`select id, display_name, notes from brokers where phone = ${card.phone}`;

      let brokerId: number;
      if (existing.length === 0) {
        const inserted = await tx`
          insert into brokers (phone, display_name, aliases, notes, added_by_count)
          values (${card.phone}, ${card.displayName}, ${card.aliases}, ${card.notes}, ${card.addedBy})
          returning id
        `;
        brokerId = inserted[0].id;
        addedNew++;
      } else {
        const cur = existing[0];
        brokerId = cur.id;
        const curNotes: string = cur.notes ?? "";
        let notes = curNotes;
        if (card.notes) {
          const segs = card.notes.split(" \u2022 ").map((s) => s.trim()).filter(Boolean);
          for (const seg of segs) {
            if (!notes.toLowerCase().includes(seg.toLowerCase())) {
              notes = notes ? `${notes} \u2022 ${seg}` : seg;
            }
          }
        }
        const mergedAliases = [...new Set([...card.aliases])];
        const nextName = cur.display_name ?? card.displayName;

        await tx`
          update brokers set
            display_name = ${nextName},
            aliases = ${mergedAliases},
            notes = ${notes},
            added_by_count = added_by_count + ${card.addedBy},
            last_added_at = now()
          where id = ${brokerId}
        `;
        updated++;
      }

      for (const slug of card.areaSlugs) {
        await tx`
          insert into broker_areas (broker_id, area_id)
          select ${brokerId}, id from areas where slug = ${slug}
          on conflict do nothing
        `;
        const nm = await tx`select name from areas where slug = ${slug}`;
        if (nm.length) touchedAreaNames.add(nm[0].name as string);
      }

      for (const row of groupRows) {
        const areaIdRows = await tx`select id from areas where slug = any(${row.areaSlugs})`;
        await tx`
          insert into submissions (broker_id, phone_normalized, name, area_ids, notes, source, ip_hash)
          values (${brokerId}, ${card.phone}, ${row.name ?? null}, ${areaIdRows.map((r: Record<string, unknown>) => Number(r.id))}, ${row.comments || null}, ${source}, ${ipHash})
        `;
      }
    }
  });

  revalidatePath("/");
  return {
    ok: true,
    addedNew,
    updated,
    rejected,
    createdAreas,
    areaNames: [...touchedAreaNames],
  };
}
