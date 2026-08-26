"use client";

import { useState, useTransition } from "react";
import { fetchMoreBrokers, type SerializedBroker } from "@/app/actions/feed";
import type { BrokerCardData } from "@/lib/queries";
import { BrokerCard } from "@/components/BrokerCard";

function revive(b: SerializedBroker): BrokerCardData {
  return {
    ...b,
    firstAddedAt: new Date(b.firstAddedAt),
    lastAddedAt: new Date(b.lastAddedAt),
  };
}

export function BrokerGrid({
  initial,
  hasMore: hasMoreInitial,
  areaSlugs,
  q,
  waAreaNames,
  areaCounts,
}: {
  initial: BrokerCardData[];
  hasMore: boolean;
  areaSlugs: string[];
  q: string;
  waAreaNames: string[];
  areaCounts: Record<string, number>;
}) {
  const [brokers, setBrokers] = useState(initial);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function loadMore() {
    startTransition(async () => {
      try {
        const res = await fetchMoreBrokers(areaSlugs, q, brokers.length);
        setBrokers((cur) => {
          const seen = new Set(cur.map((b) => b.id));
          return [...cur, ...res.brokers.map(revive).filter((b) => !seen.has(b.id))];
        });
        setHasMore(res.hasMore);
      } catch {
        setError(true);
      }
    });
  }

  if (brokers.length === 0) return null;

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {brokers.map((b) => (
          <BrokerCard
            key={b.id}
            broker={b}
            waCtx={{ areaNames: waAreaNames, areaCounts }}
          />
        ))}
      </div>
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button onClick={loadMore} disabled={pending} className="btn btn-outline disabled:opacity-50">
            {pending ? "Loading…" : error ? "Retry" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
