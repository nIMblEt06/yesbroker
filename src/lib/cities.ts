import "server-only";
import { sql } from "./db";
import { cached } from "./cache";

export const DEFAULT_CITY_SLUG = "bangalore";

export interface City {
  id: number;
  name: string;
  slug: string;
  state: string | null;
  sortOrder: number;
}

export async function fetchCities(): Promise<City[]> {
  return cached("cities:active", 300, loadCities);
}

async function loadCities(): Promise<City[]> {
  const rows = await sql`
    select id, name, slug, state, sort_order
    from cities
    where is_active
    order by sort_order asc, name asc
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
    state: (r.state as string | null) ?? null,
    sortOrder: Number(r.sort_order),
  }));
}

export async function cityBySlug(slug: string): Promise<City | null> {
  const cities = await fetchCities();
  return cities.find((c) => c.slug === slug) ?? null;
}

/**
 * Noise words stripped from broker names on top of the always-on "broker" token
 * (src/lib/merge.ts). City-specific, because "blr"/"bangalore" is Bangalore-only
 * junk that would strip real words in another city's names.
 */
export const CITY_NAME_NOISE_WORDS: Record<string, string[]> = {
  bangalore: ["blr", "bangalore", "banglore"],
};
