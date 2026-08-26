# YesBroker

A community-maintained directory of rental brokers in Bengaluru. No accounts,
no onboarding, trust-based: anyone adds broker contacts, anyone finds and
messages them directly on WhatsApp or by phone.

**Stack:** Next.js 15 (App Router) · Tailwind CSS v4 · Supabase Postgres · Vercel

## Local development

```bash
npm install
cp .env.example .env   # fill in values from your Supabase project
npm run db:migrate     # create tables + seed the area taxonomy
npm run dev
```

### Environment variables

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (**Transaction pooler**, port 6543) |
| `ADMIN_PASSWORD` | Any long random string — gates `/admin` |
| `IP_SALT` | Long random string — salts IP hashes for vote/report dedup |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally, your domain in prod |

Generate secrets with: `openssl rand -hex 24`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm test` | ETL + merge pipeline tests (vitest) |
| `npm run db:migrate` | Applies SQL files in `supabase/migrations` (tracked in `schema_migrations`) |
| `npm run seed:dry-run` | Parses `/seed/*.tsv`, prints merged-card report — no writes |
| `npm run seed:import -- --write` | Same, then imports into the database (idempotent) |

## Seed data & privacy

The raw TSV sheets contain real phone numbers and live in `/seed`, which is
**gitignored on purpose** — they exist only in the database and local files.
Tests use fake-number fixtures in `tests/fixtures/`.

Import pipeline: parse each sheet shape → normalize phones to `+91XXXXXXXXXX`
(last 10 digits, must start 6–9) → resolve areas via alias map → **merge by
phone** (union areas, distinct comments, longest name wins as primary, others
become aliases, `added_by_count` = number of source rows). Name conflicts are
flagged (`has_name_conflict`) for admin review instead of silently dropped.
Building/society names fold into landmarks in notes, not areas.

### Sheet shapes

- `sheet1.tsv` — loose `broker · contact · comments` lines.
- `sheet2.tsv` / `sheet3.tsv` — `broker · area(s) · contact`.
- `sheet4.tsv` — structured directory export:
  `Zone · Area · Broker/Firm · Contact Person · Phone · Rental Focus`. The
  contact person becomes the broker name and the firm is stored separately
  (`brokers.firm`) so the card can show it as a small byline under the name.
  Area cells resolve each `/`-separated token against the alias map; zone
  labels are never scanned for areas.

Re-running `--write` is safe: existing brokers get enriched (firm, missing
notes segments, unioned areas/tags) instead of skipped or duplicated.

## Area rent bands

Curated per-area rent ranges (1BHK/2BHK/3BHK, tier, notes) live in
`area_rent_bands`, seeded by `supabase/migrations/0005_area_rent_bands.sql`
(upsert — edit that file's `values` list to refresh bands). When a user
filters by area, the homepage shows a "Rent guide" strip for the selected
areas so newcomers get budget context before contacting brokers.

## Adding curated areas

Areas live in two places that must stay in sync:

- `supabase/migrations/0002_areas.sql` (the database)
- `src/lib/area-taxonomy.ts` (matching, suggestions, tests)

A vitest case fails if they drift. Contributors can also create new areas at
runtime (fuzzy-suggested, flagged `source='user'`) — admins can rename/merge later.

## Admin

Visit `/admin`, sign in with `ADMIN_PASSWORD`. Tabs: reported queue, hidden,
name conflicts, search-all. Actions: edit fields, hide/unhide, soft-delete.
Reports auto-hide a broker at 3 flags.

## Deploy (Vercel)

1. Push to GitHub, import repo in Vercel.
2. Add the four env vars above (use the Supabase **transaction pooler** URL).
3. Run migrations against production once: `DATABASE_URL=... npm run db:migrate`
4. Import seed if desired: `DATABASE_URL=... npm run seed:dry-run` then `-- --write`.

## Contact

Broker removal requests: hello@yesbroker.xyz
