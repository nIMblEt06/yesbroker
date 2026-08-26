"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TaxonomyArea } from "@/lib/area-taxonomy";

interface Props {
  areas: TaxonomyArea[];
  resultCount: number;
  filtered: boolean;
  counts: Record<string, number>;
}

export function FilterBar({ areas, resultCount, filtered, counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const areaSlugs = searchParams.getAll("area");
  const q = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setQuery(q);
  }, [q]);

  function push(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("offset");
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }

  function toggleArea(slug: string) {
    push((params) => {
      const all = params.getAll("area");
      params.delete("area");
      const next = all.includes(slug) ? all.filter((v) => v !== slug) : [...all, slug];
      for (const v of next) params.append("area", v);
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      push((params) => {
        if (value.trim()) params.set("q", value.trim());
        else params.delete("q");
      });
    }, 350);
  }

  function clearAll() {
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <div className="sticky top-0 z-40 -mx-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <input
          type="search"
          inputMode="search"
          placeholder="Search name, area, notes or phone…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="field h-10 flex-1"
          aria-label="Search brokers"
        />
        {filtered && (
          <button onClick={clearAll} className="btn btn-outline btn-sm shrink-0">
            Clear
          </button>
        )}
      </div>

      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by area">
        {areas.map((a) => (
          <button
            key={a.slug}
            className="chip"
            data-active={areaSlugs.includes(a.slug)}
            aria-pressed={areaSlugs.includes(a.slug)}
            onClick={() => toggleArea(a.slug)}
          >
            {a.name}
            <span className="chip-n">{counts[a.slug] ?? 0}</span>
          </button>
        ))}
      </div>

      <p className="mt-1.5 text-xs text-muted" aria-live="polite">
        {pending ? "Updating…" : `${resultCount} broker${resultCount === 1 ? "" : "s"} shown`}
      </p>
    </div>
  );
}
