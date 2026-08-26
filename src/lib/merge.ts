import { normalizePhone, phoneDigits } from "./phone";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ContactRow {
  name?: string | null;
  phoneRaw: string;
  areaSlugs: string[];
  nameAreaPhrases: string[];
  comments?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  propertyTags?: string[];
  namePreCleaned?: boolean;
  firm?: string | null;
}

export interface MergedCard {
  phone: string;
  displayName: string | null;
  aliases: string[];
  firm: string | null;
  areaSlugs: string[];
  notes: string;
  landmarks: string[];
  hasNameConflict: boolean;
  budgetMin: number | null;
  budgetMax: number | null;
  propertyTags: string[];
}

const BUILDING_RE =
  /\b(orchard green|fern leaf|cv raman societies|shapoorji pallonji|shapoorji|prestige fern|rehaja residency)\b/gi;

export function extractLandmarks(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(BUILDING_RE)) {
    const lm = m[0].replace(/\s+/g, " ");
    if (!out.some((x) => x.toLowerCase() === lm.toLowerCase())) out.push(lm);
  }
  return out;
}

export interface CleanedName {
  name: string | null;
  landmarks: string[];
}

const BASE_NOISE_WORDS = ["broker"];

export function cleanBrokerName(raw: string, areaPhrases: string[], cityNoiseWords: string[] = []): CleanedName {
  let s = raw ?? "";
  const landmarks: string[] = [];
  for (const m of s.matchAll(BUILDING_RE)) landmarks.push(m[0]);
  s = s.replace(BUILDING_RE, " ");
  for (const p of areaPhrases) {
    const pattern = new RegExp(
      `\\b${p.trim().split(/[\s.]+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s.]+")}\\b`,
      "gi"
    );
    s = s.replace(pattern, " ");
  }
  const noiseRe = new RegExp(`\\b(${[...BASE_NOISE_WORDS, ...cityNoiseWords].map(escapeRe).join("|")})\\b`, "gi");
  s = s.replace(noiseRe, " ");
  s = s.replace(/\b\d+\b/g, " ");
  s = s.replace(/[()]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^[-–—:,.;]+|[-–—:,.;]+$/g, "").trim();
  return { name: s.length ? s : null, landmarks };
}

function tokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  for (const t of a) if (!b.has(t)) return false;
  return true;
}

interface NameCluster {
  display: string;
  tokenSet: Set<string>;
}

export function mergeNames(names: string[]): {
  primary: string | null;
  aliases: string[];
  conflict: boolean;
} {
  const distinct: string[] = [];
  const seen = new Set<string>();
  for (const n of names) {
    if (!n) continue;
    const k = n.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    distinct.push(n);
  }
  if (distinct.length === 0) return { primary: null, aliases: [], conflict: false };

  const clusters: NameCluster[] = [];
  for (const n of distinct) {
    const ts = tokens(n);
    let merged = false;
    for (const c of clusters) {
      if (isSubset(ts, c.tokenSet) || isSubset(c.tokenSet, ts)) {
        if (ts.size > c.tokenSet.size || (ts.size === c.tokenSet.size && n.length > c.display.length)) {
          c.display = n;
          c.tokenSet = ts.size >= c.tokenSet.size ? ts : c.tokenSet;
        }
        merged = true;
        break;
      }
    }
    if (!merged) clusters.push({ display: n, tokenSet: ts });
  }

  const primary = clusters
    .slice()
    .sort((a, b) => b.display.length - a.display.length)[0].display;
  const aliases = clusters.map((c) => c.display).filter((d) => d !== primary);
  return { primary, aliases, conflict: clusters.length > 1 };
}

export function mergeContacts(rows: ContactRow[], cityNoiseWords: string[] = []): MergedCard[] {
  const groups = new Map<string, ContactRow[]>();
  for (const row of rows) {
    const phone = normalizePhone(row.phoneRaw);
    if (!phone) continue;
    const list = groups.get(phone);
    if (list) list.push(row);
    else groups.set(phone, [row]);
  }

  const cards: MergedCard[] = [];
  for (const [phone, group] of groups) {
    const cleanedNames: string[] = [];
    const landmarks: string[] = [];
    for (const row of group) {
      const c = row.namePreCleaned
        ? { name: (row.name ?? "").trim() || null, landmarks: [] as string[] }
        : cleanBrokerName(row.name ?? "", row.nameAreaPhrases ?? [], cityNoiseWords);
      if (c.name) cleanedNames.push(c.name);
      for (const lm of c.landmarks)
        if (!landmarks.some((x) => x.toLowerCase() === lm.toLowerCase()))
          landmarks.push(lm);
      for (const lm of extractLandmarks(row.comments ?? ""))
        if (!landmarks.some((x) => x.toLowerCase() === lm.toLowerCase()))
          landmarks.push(lm);
    }
    const { primary, aliases, conflict } = mergeNames(cleanedNames);

    const firms: string[] = [];
    for (const row of group) {
      const f = (row.firm ?? "").trim();
      if (f && !firms.some((x) => x.toLowerCase() === f.toLowerCase())) firms.push(f);
    }

    const areaSlugs: string[] = [];
    for (const row of group)
      for (const slug of row.areaSlugs ?? [])
        if (!areaSlugs.includes(slug)) areaSlugs.push(slug);

    const comments: string[] = [];
    for (const row of group) {
      const note = (row.comments ?? "").trim();
      if (note && !comments.some((c) => c.toLowerCase() === note.toLowerCase()))
        comments.push(note);
    }
    let notes = comments.join(" \u2022 ");
    for (const lm of landmarks) {
      if (!notes.toLowerCase().includes(lm.toLowerCase())) {
        notes = notes ? `${notes} \u2022 Near ${lm}` : `Near ${lm}`;
      }
    }

    const mins = group.map((r) => r.budgetMin).filter((v): v is number => typeof v === "number");
    const maxs = group.map((r) => r.budgetMax).filter((v): v is number => typeof v === "number");
    const tags: string[] = [];
    for (const row of group)
      for (const t of row.propertyTags ?? [])
        if (!tags.includes(t)) tags.push(t);

    cards.push({
      phone,
      displayName: primary,
      aliases,
      firm: firms.length ? firms.join(" \u2022 ") : null,
      areaSlugs,
      notes,
      landmarks,
      hasNameConflict: conflict,
      budgetMin: mins.length ? Math.min(...mins) : null,
      budgetMax: maxs.length ? Math.max(...maxs) : null,
      propertyTags: tags,
    });
  }

  cards.sort((a, b) => a.phone.localeCompare(b.phone));
  return cards;
}

export { phoneDigits };
