import { readFileSync } from "node:fs";
import { slugify } from "../src/lib/slugify";

/**
 * Seed a new city end-to-end: the city row, its wildcard "all-<city>" area,
 * and its curated area list, from one JSON file. Going live afterwards is a
 * single UPDATE (see the printed reminder) — no code change, no deploy.
 *
 * Usage:
 *   tsx --env-file=.env scripts/add-city.mts cities/pune.json          # dry run
 *   tsx --env-file=.env scripts/add-city.mts cities/pune.json --write  # actually insert
 *
 * JSON shape:
 *   {
 *     "name": "Pune",
 *     "slug": "pune",
 *     "state": "Maharashtra",
 *     "noiseWords": ["pune", "pcmc"],
 *     "areas": [
 *       { "name": "Koregaon Park", "aliases": ["Koregaon Park", "KP"] },
 *       { "name": "Baner" }
 *     ]
 *   }
 * Area "slug" is derived from "name" if omitted. "noiseWords" is optional —
 * extra tokens (beyond the always-stripped "broker") to clean out of names
 * during import for this city; add it to CITY_NAME_NOISE_WORDS in
 * src/lib/cities.ts by hand afterwards if you want it applied at submit time.
 */

interface CityAreaInput {
  name: string;
  slug?: string;
  aliases?: string[];
}

interface CityInput {
  name: string;
  slug: string;
  state?: string;
  areas: CityAreaInput[];
}

const WRITE = process.argv.includes("--write");
const jsonPath = process.argv.find((a) => a.endsWith(".json"));

if (!jsonPath) {
  console.error("Usage: tsx --env-file=.env scripts/add-city.mts <path/to/city.json> [--write]");
  process.exit(1);
}

const input: CityInput = JSON.parse(readFileSync(jsonPath, "utf8"));

if (!input.name?.trim() || !input.slug?.trim()) {
  console.error('City JSON needs at least "name" and "slug".');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(input.slug)) {
  console.error(`City slug "${input.slug}" must be lowercase letters, digits, and hyphens only.`);
  process.exit(1);
}
if (!Array.isArray(input.areas) || input.areas.length === 0) {
  console.error("City JSON needs a non-empty \"areas\" array.");
  process.exit(1);
}

const RESERVED_SLUGS = ["add", "about", "admin", "share-target", "api"];
if (RESERVED_SLUGS.includes(input.slug)) {
  console.error(`"${input.slug}" collides with an existing top-level route (${RESERVED_SLUGS.join(", ")}). Pick another slug.`);
  process.exit(1);
}

const areas = input.areas.map((a, i) => {
  const slug = a.slug?.trim() || slugify(a.name);
  if (!slug) throw new Error(`Area at index ${i} ("${a.name}") has no usable slug.`);
  return { name: a.name.trim(), slug, aliases: a.aliases?.length ? a.aliases : [a.name.trim()] };
});
const dupSlugs = areas.map((a) => a.slug).filter((s, i, arr) => arr.indexOf(s) !== i);
if (dupSlugs.length) {
  console.error(`Duplicate area slugs within this city: ${[...new Set(dupSlugs)].join(", ")}`);
  process.exit(1);
}

console.log(`City: ${input.name} (${input.slug})${input.state ? `, ${input.state}` : ""}`);
console.log(`Areas: ${areas.length}`);
for (const a of areas) console.log(`  ${a.slug.padEnd(24)} ${a.name}`);
console.log(`Wildcard area: all-${input.slug}`);

if (!WRITE) {
  console.log("\ndry-run only. Re-run with --write to insert into the database.");
  process.exit(0);
}

async function main() {
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  await sql.begin(async (tx) => {
    const cityRows = await tx`
      insert into cities (name, slug, state, is_active)
      values (${input.name}, ${input.slug}, ${input.state ?? null}, false)
      on conflict (slug) do update set name = excluded.name, state = excluded.state
      returning id
    `;
    const cityId = Number(cityRows[0].id);

    await tx`
      insert into areas (name, slug, aliases, kind, source, sort_order, city_id)
      values (${`All ${input.name}`}, ${`all-${input.slug}`}, ${[`All ${input.name}`, "Everywhere", "Anywhere"]}, 'special', 'curated', 0, ${cityId})
      on conflict (city_id, slug) do nothing
    `;

    for (const [i, a] of areas.entries()) {
      await tx`
        insert into areas (name, slug, aliases, kind, source, sort_order, city_id)
        values (${a.name}, ${a.slug}, ${a.aliases}, 'area', 'curated', ${10 + i}, ${cityId})
        on conflict (city_id, slug) do update set name = excluded.name, aliases = excluded.aliases
      `;
    }
  });

  await sql.end();
  console.log(`\nSeeded "${input.name}" (inactive). Go live with:`);
  console.log(`  update cities set is_active = true where slug = '${input.slug}';`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
