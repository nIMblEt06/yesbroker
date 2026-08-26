import type { TaxonomyArea } from "./area-taxonomy";
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

function buildMatchers(areas: TaxonomyArea[]): AreaMatcher[] {
  return areas
    .filter((a) => a.kind !== "special")
    .flatMap((a) =>
      [a.name, ...a.aliases].map((label) => ({
        slug: a.slug,
        label,
        re: new RegExp(`\\b${phraseToPattern(label)}\\b`, "i"),
      }))
    );
}

export interface AreaScanResult {
  slugs: string[];
  phrases: string[];
}

export function scanForAreas(areas: TaxonomyArea[], ...texts: (string | null | undefined)[]): AreaScanResult {
  const combined = texts.filter(Boolean).join(" • ");
  const matchers = buildMatchers(areas);
  const slugs: string[] = [];
  const phrases: string[] = [];
  for (const m of matchers) {
    if (m.re.test(combined)) {
      if (!slugs.includes(m.slug)) slugs.push(m.slug);
      if (!phrases.some((p) => p.toLowerCase() === m.label.toLowerCase()))
        phrases.push(m.label);
    }
  }
  return { slugs, phrases };
}

export function scanNameForAreas(areas: TaxonomyArea[], name: string): AreaScanResult {
  const matchers = buildMatchers(areas);
  const slugs: string[] = [];
  const phrases: string[] = [];
  for (const m of matchers) {
    if (m.re.test(name)) {
      if (!slugs.includes(m.slug)) slugs.push(m.slug);
      if (!phrases.some((p) => p.toLowerCase() === m.label.toLowerCase()))
        phrases.push(m.label);
    }
  }
  return { slugs, phrases };
}

export function resolveAreaToken(areas: TaxonomyArea[], token: string): TaxonomyArea | null {
  const key = slugify(token);
  if (!key) return null;
  for (const a of areas) {
    for (const label of [a.name, ...a.aliases]) {
      if (slugify(label) === key) return a;
    }
    if (a.slug === key) return a;
  }
  return null;
}

export function suggestAreas(areas: TaxonomyArea[], query: string, limit = 8): TaxonomyArea[] {
  const q = slugify(query);
  if (!q) return areas.filter((a) => a.kind === "area").slice(0, limit);
  const scored: { area: TaxonomyArea; score: number }[] = [];
  for (const a of areas) {
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

export function areaBySlug(areas: TaxonomyArea[], slug: string): TaxonomyArea | null {
  return areas.find((a) => a.slug === slug) ?? null;
}
