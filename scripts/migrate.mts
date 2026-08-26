import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is required. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

try {
  await sql`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;

  const applied = new Set(
    (await sql`select name from schema_migrations`).map((r) => r.name)
  );

  const dir = join(__dirname, "..", "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const f of files) {
    if (applied.has(f)) continue;
    const content = readFileSync(join(dir, f), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into schema_migrations (name) values (${f})`;
    });
    console.log(`applied ${f}`);
    ran++;
  }

  console.log(ran === 0 ? "already up to date" : `done, ${ran} migration(s) applied`);
} finally {
  await sql.end();
}
