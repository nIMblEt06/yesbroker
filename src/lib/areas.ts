import { CURATED_AREAS, type TaxonomyArea } from "./area-taxonomy";
import { slugify } from "./slugify";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function phraseToPattern(phrase: string): string {
  return phrase
    .trim()
    .split(/[\s.]+/)
    .filter(Boolean)
    .map(escapeRe)
    .join("[\\s.]+");
}

interface AreaMatcher {
  slug: string;
  label: string;
  re: RegExp;
}

export const AREA_MATCHERS: AreaMatcher[] = CURATED_AREAS.filter(
  (a) => a.kind !== "special"
).flatMap((a) =>
  [a.name, ...a.aliases].map((label) => ({
    slug: a.slug,
    label,
    re: new RegExp(`\\b${phraseToPattern(label)}\\b`, "i"),
  }))
);

export interface AreaScanResult {
  slugs: string[];
  phrases: string[];
}

export function scanForAreas(...texts: (string | null | undefined)[]): AreaScanResult {
  const combined = texts.filter(Boolean).join(" \u2022 ");
  const slugs: string[] = [];
  const phrases: string[] = [];
  for (const m of AREA_MATCHERS) {
    if (m.re.test(combined)) {
      if (!slugs.includes(m.slug)) slugs.push(m.slug);
      if (!phrases.some((p) => p.toLowerCase() === m.label.toLowerCase()))
        phrases.push(m.label);
    }
  }
  return { slugs, phrases };
}

export function scanNameForAreas(name: string): AreaScanResult {
  const slugs: string[] = [];
  const phrases: string[] = [];
  for (const m of AREA_MATCHERS) {
    if (m.re.test(name)) {
      if (!slugs.includes(m.slug)) slugs.push(m.slug);
      if (!phrases.some((p) => p.toLowerCase() === m.label.toLowerCase()))
        phrases.push(m.label);
    }
  }
  return { slugs, phrases };
}

const ALIAS_LOOKUP: Map<string, TaxonomyArea> = new Map();
for (const a of CURATED_AREAS) {
  for (const label of [a.name, ...a.aliases]) {
    ALIAS_LOOKUP.set(slugify(label), a);
  }
  if (!ALIAS_LOOKUP.has(a.slug)) ALIAS_LOOKUP.set(a.slug, a);
}

export function resolveAreaToken(token: string): TaxonomyArea | null {
  const key = slugify(token);
  if (!key) return null;
  return ALIAS_LOOKUP.get(key) ?? null;
}

export function suggestAreas(query: string, limit = 8): TaxonomyArea[] {
  const q = slugify(query);
  if (!q) return CURATED_AREAS.filter((a) => a.kind === "area").slice(0, limit);
  const scored: { area: TaxonomyArea; score: number }[] = [];
  for (const a of CURATED_AREAS) {
    if (a.kind === "special") continue;
    const labels = [a.name, ...a.aliases].map((l) => slugify(l));
    let best = -1;
    for (const l of labels) {
      let s = -1;
      if (l.startsWith(q)) s = 2;
      else if (l.includes(q)) s = 1;
      if (s > best) best = s;
    }
    if (best >= 0) scored.push({ area: a, score: best + (a.sortOrder < 50 ? 0.5 : 0) });
  }
  return scored
    .sort((x, y) => y.score - x.score || x.area.sortOrder - y.area.sortOrder)
    .slice(0, limit)
    .map((s) => s.area);
}

export function areaBySlug(slug: string): TaxonomyArea | null {
  return CURATED_AREAS.find((a) => a.slug === slug) ?? null;
}
