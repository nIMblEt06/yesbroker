"use server";

import { fetchBrokers } from "@/lib/queries";
import { getIpHash } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { cityBySlug, DEFAULT_CITY_SLUG } from "@/lib/cities";

export interface SerializedBroker {
  id: number;
  phone: string;
  displayName: string | null;
  firm: string | null;
  aliases: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  propertyTags: string[];
  notes: string;
  helpfulVotes: number;
  contactCount: number;
  flatsFound: number;
  reportFlagged: boolean;
  hasNameConflict: boolean;
  firstAddedAt: string;
  lastAddedAt: string;
  areas: { slug: string; name: string }[];
}

const PAGE_SIZE = 12;

export async function fetchMoreBrokers(
  areaSlugs: string[],
  q: string,
  shown: number,
  citySlug: string = DEFAULT_CITY_SLUG
): Promise<{ brokers: SerializedBroker[]; hasMore: boolean }> {
  const ipHash = await getIpHash();
  const { allowed } = await checkRateLimit("fetch-more", ipHash, 30, 60);
  if (!allowed) return { brokers: [], hasMore: false };

  const city = await cityBySlug(citySlug);
  if (!city) return { brokers: [], hasMore: false };

  const result = await fetchBrokers({
    cityId: city.id,
    areaSlugs,
    q,
    limit: PAGE_SIZE,
    offset: shown,
  });
  return {
    hasMore: result.hasMore,
    brokers: result.brokers.map((b) => ({
      ...b,
      firstAddedAt: b.firstAddedAt.toISOString(),
      lastAddedAt: b.lastAddedAt.toISOString(),
    })),
  };
}
