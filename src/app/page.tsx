import Link from "next/link";
import { fetchAreaChips, fetchBrokers, fetchFacetCounts, type BrokerFilters } from "@/lib/queries";
import { FilterBar } from "@/components/FilterBar";
import { BrokerGrid } from "@/components/BrokerGrid";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const areaSlugs = asArray(sp.area);
  const q = typeof sp.q === "string" ? sp.q : "";

  const filters: BrokerFilters = {
    areaSlugs,
    q,
    limit: PAGE_SIZE + 1,
    offset: 0,
  };

  const [areas, result, counts] = await Promise.all([
    fetchAreaChips(),
    fetchBrokers(filters),
    fetchFacetCounts(q),
  ]);
  const filtered = Boolean(areaSlugs.length || q);
  const hasMore = result.brokers.length > PAGE_SIZE;
  const initialBrokers = result.brokers.slice(0, PAGE_SIZE);

  const sortedAreas = [...areas].sort((a, b) => {
    const diff = (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const activeAreas = areas.filter((a) => areaSlugs.includes(a.slug));
  const areaNameBySlug = new Map(areas.map((a) => [a.slug, a.name]));
  const waAreaCounts: Record<string, number> = {};
  for (const [slug, n] of Object.entries(counts)) {
    const name = areaNameBySlug.get(slug);
    if (name) waAreaCounts[name] = n;
  }

  return (
    <div>
      <FilterBar areas={sortedAreas} resultCount={initialBrokers.length} filtered={filtered} counts={counts} />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="display-1 text-2xl">Rental brokers in Bengaluru</h1>
        <Link href="/add" className="btn btn-primary btn-sm hidden sm:inline-flex">
          + Add
        </Link>
      </div>

      {initialBrokers.length === 0 ? (
        <EmptyState filtered={filtered} activeAreas={activeAreas.map((a) => a.name)} firstAreaSlug={activeAreas[0]?.slug} />
      ) : (
        <BrokerGrid
          key={`${areaSlugs.join(",")}|${q}`}
          initial={initialBrokers}
          hasMore={hasMore}
          areaSlugs={areaSlugs}
          q={q}
          waAreaNames={activeAreas.map((a) => a.name)}
          areaCounts={waAreaCounts}
        />
      )}

      <Link href="/add" className="fab sm:hidden" aria-label="Add a broker">
        +
      </Link>
    </div>
  );
}

function EmptyState({
  filtered,
  activeAreas,
  firstAreaSlug,
}: {
  filtered: boolean;
  activeAreas: string[];
  firstAreaSlug?: string;
}) {
  const areaName = activeAreas[0];
  return (
    <div className="broker-card mt-6 flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="text-muted" aria-hidden>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z" />
          <path d="M9 21.5v-8h6v8" />
        </svg>
      </span>
      {filtered && areaName ? (
        <>
          <h2 className="text-lg font-semibold">No brokers in {areaName} yet</h2>
          <p className="max-w-sm text-sm text-muted">
            Know a good broker there? Add them so the next person doesn&apos;t struggle.
          </p>
          <Link href={`/add?area=${firstAreaSlug}`} className="btn btn-primary mt-2">
            Be the first to add
          </Link>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold">Nothing matches those filters</h2>
          <p className="max-w-sm text-sm text-muted">
            Try removing a filter, or add a broker you know so the directory grows.
          </p>
          <Link href="/add" className="btn btn-primary mt-2">
            + Add a broker
          </Link>
        </>
      )}
    </div>
  );
}
