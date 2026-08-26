import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runEtl } from "../src/lib/etl";
import { normalizePhone } from "../src/lib/phone";
import { CURATED_AREAS } from "../src/lib/area-taxonomy";
import { CITY_NAME_NOISE_WORDS, DEFAULT_CITY_SLUG } from "../src/lib/cities";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedDir = join(__dirname, "..", "seed");
const WRITE = process.argv.includes("--write");

if (!existsSync(seedDir)) {
  console.error("No /seed directory found. Place sheet1.tsv … sheetN.tsv there.");
  process.exit(1);
}

const sheetFiles = readdirSync(seedDir)
  .filter((f) => /^sheet\d+\.tsv$/.test(f))
  .sort(
    (a, b) =>
      Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0)
  );

if (sheetFiles.length === 0) {
  console.error("No sheet*.tsv files found in /seed.");
  process.exit(1);
}
console.log(`sheets: ${sheetFiles.join(", ")}`);

const sheets = Object.fromEntries(
  sheetFiles.map((f) => [f.replace(/\.tsv$/, ""), readFileSync(join(seedDir, f), "utf8")])
);

const result = runEtl(sheets, CURATED_AREAS, CITY_NAME_NOISE_WORDS[DEFAULT_CITY_SLUG] ?? []);

console.log("=== Brokers Age seed import ===");
console.log(`source rows parsed : ${result.totalRows}`);
console.log(`merged cards       : ${result.cards.length}`);
console.log(`rejected rows      : ${result.rejects.length}`);
console.log(`untagged cards     : ${result.cards.filter((c) => c.areaSlugs.length === 0).length}`);
console.log(`named conflicts    : ${result.cards.filter((c) => c.hasNameConflict).length}`);

const trust = result.cards.filter((c) => c.addedBy > 1);
console.log(`\ntrust merges (added by >1): ${trust.length}`);
for (const c of trust) {
  console.log(
    `  ${c.phone}  "${c.displayName ?? "(unnamed)"}"  ×${c.addedBy}  [${c.areaSlugs.join(", ")}]` +
      (c.hasNameConflict ? "  ⚠ NAME CONFLICT" : "")
  );
}

const areaCounts = new Map<string, number>();
for (const c of result.cards)
  for (const s of c.areaSlugs) areaCounts.set(s, (areaCounts.get(s) ?? 0) + 1);
console.log("\narea histogram:");
for (const [slug, n] of [...areaCounts.entries()].sort((a, b) => b[1] - a[1]))
  console.log(`  ${slug.padEnd(20)} ${n}`);

if (result.warnings.length) {
  console.log(`\nwarnings (${result.warnings.length}):`);
  for (const w of result.warnings) console.log(`  ⚠ ${w.message}`);
}
if (result.rejects.length) {
  console.log(`\nrejects (${result.rejects.length}):`);
  for (const r of result.rejects) console.log(`  ✕ ${r.raw} — ${r.reason}`);
  writeFileSync(
    join(__dirname, "..", "import-rejects.tsv"),
    ["raw\treason", ...result.rejects.map((r) => `${r.raw}\t${r.reason}`)].join("\n") + "\n"
  );
}

const invalid = result.cards.filter((c) => !normalizePhone(c.phone));
if (invalid.length) {
  console.error(`\nBUG: ${invalid.length} cards with invalid phones slipped through`);
  process.exit(2);
}

if (!WRITE) {
  console.log("\ndry-run only. Re-run with --write to import into the database.");
  process.exit(0);
}

async function main() {
  const { sql } = await import("../src/lib/db");
  let createdBrokers = 0;
  let enrichedExisting = 0;
  let skippedUnchanged = 0;

  const cityRows = await sql`select id from cities where slug = ${DEFAULT_CITY_SLUG}`;
  const cityId = cityRows[0]?.id;
  if (!cityId) {
    console.error(`No "${DEFAULT_CITY_SLUG}" row in cities — run db:migrate first.`);
    process.exit(1);
  }

  await sql.begin(async (tx) => {
    for (const [i, card] of result.cards.entries()) {
      const inserted = await tx`
        insert into brokers (phone, display_name, aliases, firm, budget_min, budget_max, property_tags, notes, added_by_count, has_name_conflict, city_id)
        values (${card.phone}, ${card.displayName}, ${card.aliases}, ${card.firm}, ${card.budgetMin}, ${card.budgetMax}, ${card.propertyTags}, ${card.notes}, ${card.addedBy}, ${card.hasNameConflict}, ${cityId})
        on conflict (phone) do nothing
        returning id
      `;
      process.stdout.write(`\r  importing ${i + 1}/${result.cards.length}…`);
      if (inserted.length === 0) {
        const existingRows = await tx`
          select id, notes, firm, budget_min, budget_max, property_tags, added_by_count, has_name_conflict
          from brokers where phone = ${card.phone} for update
        `;
        const cur = existingRows[0] as Record<string, unknown>;
        const curNotes: string = (cur.notes as string | null) ?? "";
        const curFirm: string | null = (cur.firm as string | null) ?? null;
        let notes = curNotes;
        let notesChanged = false;
        for (const seg of card.notes.split(" \u2022 ").map((s) => s.trim()).filter(Boolean)) {
          if (!notes.toLowerCase().includes(seg.toLowerCase())) {
            notes = notes ? `${notes} \u2022 ${seg}` : seg;
            notesChanged = true;
          }
        }
        const curTags: string[] = Array.isArray(cur.property_tags) ? (cur.property_tags as string[]) : [];
        const nextTags = [...new Set([...curTags, ...card.propertyTags])];
        const nextMin =
          card.budgetMin != null
            ? cur.budget_min != null
              ? Math.min(Number(cur.budget_min), card.budgetMin)
              : card.budgetMin
            : cur.budget_min;
        const nextMax =
          card.budgetMax != null
            ? cur.budget_max != null
              ? Math.max(Number(cur.budget_max), card.budgetMax)
              : card.budgetMax
            : cur.budget_max;
        await tx`
          update brokers set
            display_name = coalesce(display_name, ${card.displayName}),
            firm = coalesce(firm, ${card.firm}),
            notes = ${notes},
            budget_min = ${nextMin},
            budget_max = ${nextMax},
            property_tags = ${nextTags},
            added_by_count = greatest(added_by_count, ${card.addedBy}),
            has_name_conflict = has_name_conflict or ${card.hasNameConflict}
          where phone = ${card.phone}
        `;
        const brokerId = Number(cur.id);
        for (const slug of card.areaSlugs) {
          await tx`
            insert into broker_areas (broker_id, area_id)
            select ${brokerId}, id from areas where slug = ${slug} and city_id = ${cityId}
            on conflict do nothing
          `;
        }
        if (notesChanged || (!curFirm && card.firm)) enrichedExisting++;
        else skippedUnchanged++;
        continue;
      }
      const brokerId = Number(inserted[0].id);
      for (const slug of card.areaSlugs) {
        await tx`
          insert into broker_areas (broker_id, area_id)
          select ${brokerId}, id from areas where slug = ${slug} and city_id = ${cityId}
          on conflict do nothing
        `;
      }
      await tx`
        insert into submissions (broker_id, phone_normalized, name, firm, budget_min, budget_max, property_tags, notes, source)
        values (${brokerId}, ${card.phone}, ${card.displayName}, ${card.firm}, ${card.budgetMin}, ${card.budgetMax}, ${card.propertyTags}, ${card.notes || null}, 'seed')
      `;
      createdBrokers++;
    }
    process.stdout.write("\n");
  });

  await sql.end();
  console.log(
    `\nwrite complete: ${createdBrokers} brokers created, ${enrichedExisting} existing enriched, ${skippedUnchanged} unchanged.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
