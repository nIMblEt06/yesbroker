import "server-only";
import postgres from "postgres";
import { sql } from "./db";
import { cached } from "./cache";
import type { TaxonomyArea } from "./area-taxonomy";

type DbParam = postgres.ParameterOrJSON<never>;

export interface BrokerCardData {
  id: number;
  phone: string;
  displayName: string | null;
  aliases: string[];
  firm: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  propertyTags: string[];
  notes: string;
  helpfulVotes: number;
  contactCount: number;
  flatsFound: number;
  reportFlagged: boolean;
  hasNameConflict: boolean;
  firstAddedAt: Date;
  lastAddedAt: Date;
  areas: { slug: string; name: string }[];
}

function qClause(q: string, params: DbParam[], p: (v: DbParam) => string): string {
  const query = q.trim();
  if (!query) return "";
  const like = `%${query}%`;
  const digits = query.replace(/\D/g, "");
  const parts = [
    `b.display_name ilike ${p(like)}`,
    `exists (select 1 from unnest(b.aliases) al where al ilike ${p(like)})`,
    `b.notes ilike ${p(like)}`,
    `exists (
      select 1 from broker_areas ba2 join areas a2 on a2.id = ba2.area_id
      where ba2.broker_id = b.id and (a2.name ilike ${p(like)} or a2.slug ilike ${p(like)})
    )`,
  ];
  if (digits.length >= 3) parts.push(`b.phone like ${p("%" + digits + "%")}`);
  return ` and (${parts.join(" or ")})`;
}

export async function fetchFacetCounts(q: string, cityId: number): Promise<Record<string, number>> {
  if (!q.trim()) return cached(`facet-counts:empty:city=${cityId}`, 60, () => loadFacetCounts(q, cityId));
  return loadFacetCounts(q, cityId);
}

async function loadFacetCounts(q: string, cityId: number): Promise<Record<string, number>> {
  const params: DbParam[] = [];
  const p = (v: DbParam) => `$${params.push(v)}`;
  let where = `b.is_deleted = false and b.is_hidden = false and b.city_id = ${p(cityId)}`;
  where += qClause(q, params, p);

  const areaRows = await sql.unsafe(
    `select a.slug as slug, count(*)::int as n
     from brokers b
     join broker_areas ba on ba.broker_id = b.id
     join areas a on a.id = ba.area_id
     where ${where}
     group by a.slug`,
    params
  );

  const areas: Record<string, number> = {};
  for (const r of areaRows as Record<string, unknown>[]) areas[String(r.slug)] = Number(r.n);

  return areas;
}

export async function fetchAreaChips(cityId: number): Promise<TaxonomyArea[]> {
  return cached(`area-chips:city=${cityId}`, 300, () => loadAreaChips(cityId));
}

async function loadAreaChips(cityId: number): Promise<TaxonomyArea[]> {
  const rows = await sql`
    select name, slug, aliases, kind, sort_order
    from areas
    where kind = 'area' and city_id = ${cityId}
    order by sort_order asc, name asc
  `;
  return rows.map((r) => ({
    name: String(r.name),
    slug: String(r.slug),
    aliases: (r.aliases as string[] | null) ?? [],
    kind: "area" as const,
    sortOrder: Number(r.sort_order),
  }));
}

export interface BrokerFilters {
  cityId: number;
  areaSlugs: string[];
  q: string;
  limit: number;
  offset: number;
}

export async function fetchBrokers(
  f: BrokerFilters
): Promise<{ brokers: BrokerCardData[]; hasMore: boolean }> {
  const isDefaultView = f.areaSlugs.length === 0 && !f.q.trim() && f.offset === 0;
  if (isDefaultView) {
    const result = await cached(`brokers:default:city=${f.cityId}:limit=${f.limit}`, 30, () => loadBrokers(f));
    return {
      hasMore: result.hasMore,
      brokers: result.brokers.map((b) => ({
        ...b,
        firstAddedAt: new Date(b.firstAddedAt),
        lastAddedAt: new Date(b.lastAddedAt),
      })),
    };
  }
  return loadBrokers(f);
}

async function loadBrokers(
  f: BrokerFilters
): Promise<{ brokers: BrokerCardData[]; hasMore: boolean }> {
  const params: DbParam[] = [];
  const p = (v: DbParam) => `$${params.push(v)}`;

  let where = `b.is_deleted = false and b.is_hidden = false and b.city_id = ${p(f.cityId)}`;

  if (f.areaSlugs.length) {
    where += ` and exists (
      select 1 from broker_areas ba join areas a on a.id = ba.area_id
      where ba.broker_id = b.id and (a.slug = any(${p(f.areaSlugs)}) or (a.kind = 'special' and a.city_id = ${p(f.cityId)}))
    )`;
  }

  where += qClause(f.q, params, p);

  const orderBy =
    "contact_count desc, flats_found desc, helpful_votes desc, id asc";

  const query = `
    select b.id, b.phone, b.display_name, b.aliases, b.firm,
           b.budget_min, b.budget_max, b.property_tags, b.notes,
       b.helpful_votes, b.report_count,
       b.contact_count, b.flats_found,
       b.has_name_conflict, b.first_added_at, b.last_added_at,
           coalesce(jsonb_agg(distinct jsonb_build_object('slug', a.slug, 'name', a.name))
                    filter (where a.id is not null), '[]') as areas
    from brokers b
    left join broker_areas ba on ba.broker_id = b.id
    left join areas a on a.id = ba.area_id
    where ${where}
    group by b.id
    order by ${orderBy}
    limit ${f.limit + 1} offset ${f.offset}
  `;

  const rows = await sql.unsafe(query, params);
  const hasMore = rows.length > f.limit;

  return {
    hasMore,
    brokers: rows.slice(0, f.limit).map((r) => mapRow(r as Record<string, unknown>)),
  };
}

function mapRow(r: Record<string, unknown>): BrokerCardData {
  return {
    id: Number(r.id),
    phone: String(r.phone),
    displayName: (r.display_name as string | null) ?? null,
    aliases: (r.aliases as string[] | null) ?? [],
    firm: (r.firm as string | null) ?? null,
    budgetMin: (r.budget_min as number | null) ?? null,
    budgetMax: (r.budget_max as number | null) ?? null,
    propertyTags: (r.property_tags as string[] | null) ?? [],
    notes: (r.notes as string | null) ?? "",
    helpfulVotes: Number(r.helpful_votes),
    contactCount: Number(r.contact_count ?? 0),
    flatsFound: Number(r.flats_found ?? 0),
    reportFlagged: Number(r.report_count ?? 0) > 0,
    hasNameConflict: Boolean(r.has_name_conflict),
    firstAddedAt: new Date(r.first_added_at as string),
    lastAddedAt: new Date(r.last_added_at as string),
    areas: (r.areas as { slug: string; name: string }[]) ?? [],
  };
}
