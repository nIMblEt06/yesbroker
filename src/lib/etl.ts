import { normalizePhone } from "./phone";
import { resolveAreaToken, scanForAreas, scanNameForAreas } from "./areas";
import {
  mergeContacts,
  cleanBrokerName,
  type ContactRow,
  type MergedCard,
} from "./merge";

export interface Reject {
  raw: string;
  reason: string;
}

export interface Warning {
  message: string;
}

interface RawRecord {
  nameText: string;
  phoneRaw: string;
  commentText: string;
  forcedAreaSlugs?: string[];
  namePreCleaned?: boolean;
  firm?: string | null;
}

const PHONE_CANDIDATE = /(?:\+91[\s-]?)?\d[\d\s().-]*\d/g;

function isDirectorySheet(text: string): boolean {
  const first = text.split(/\r?\n/).find((l) => l.trim());
  return !!first && /\tbroker\s*\/\s*firm\t/i.test(first);
}

function extractDirectoryRecords(
  text: string,
  label: string
): { records: RawRecord[]; rejects: Reject[]; warnings: Warning[] } {
  const records: RawRecord[] = [];
  const rejects: Reject[] = [];
  const warnings: Warning[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) continue;
    if (/^\s*zone\s*\t/i.test(line) || /\tbroker\s*\/\s*firm\t/i.test(line)) continue;

    const cols = line.split("\t").map((c) => c.trim());
    if (cols.length < 5) {
      rejects.push({ raw: `${label}: ${line}`, reason: "directory row needs at least 5 columns" });
      continue;
    }
    const [, areaCell, firm, contact, phoneRaw] = cols;

    if (!phoneRaw) {
      rejects.push({ raw: `${label}: ${line}`, reason: "no phone cell" });
      continue;
    }

    const slugs: string[] = [];
    const unresolved: string[] = [];
    for (const token of (areaCell ?? "").split("/")) {
      const t = token.trim();
      if (!t) continue;
      const area = resolveAreaToken(t);
      if (area && !slugs.includes(area.slug)) slugs.push(area.slug);
      else if (!area) unresolved.push(t);
    }
    if (unresolved.length) {
      warnings.push({
        message: `${label} "${areaCell}": unrecognized area token(s) ${unresolved.map((t) => `"${t}"`).join(", ")}`,
      });
      for (const s of scanForAreas(areaCell).slugs)
        if (!slugs.includes(s)) slugs.push(s);
    }

    const hasContact = Boolean(contact);
    const nameText = contact || firm || "";
    const firmName = hasContact ? firm || null : null;

    records.push({
      nameText,
      phoneRaw,
      commentText: "",
      forcedAreaSlugs: slugs,
      namePreCleaned: true,
      firm: firmName,
    });
  }

  return { records, rejects, warnings };
}

function extractRecords(text: string, label: string): { records: RawRecord[]; rejects: Reject[] } {
  const records: RawRecord[] = [];
  const rejects: Reject[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/contact/i.test(line) && !/\d{8,}/.test(line.replace(/[\s()-]/g, ""))) {
      continue;
    }

    const candidates = [...line.matchAll(PHONE_CANDIDATE)].filter((m) => {
      const digits = m[0].replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 13;
    });

    if (candidates.length === 0) {
      rejects.push({ raw: `${label}: ${line}`, reason: "no phone-like cell found" });
      continue;
    }

    const m = candidates[candidates.length - 1];
    const nameText = line
      .slice(0, m.index ?? 0)
      .trim()
      .replace(/[\t\-–—:,|]+$/g, "")
      .trim();
    const commentText = line
      .slice((m.index ?? 0) + m[0].length)
      .trim()
      .replace(/^[\t\-–—:,|]+/g, "")
      .trim();

    records.push({ nameText, phoneRaw: m[0], commentText });
  }

  return { records, rejects };
}

export interface EtlResult {
  cards: MergedCard[];
  rejects: Reject[];
  warnings: Warning[];
  totalRows: number;
}

export function runEtl(sheets: Record<string, string | undefined>): EtlResult {
  const rows: ContactRow[] = [];
  const rejects: Reject[] = [];
  const warnings: Warning[] = [];
  let totalRows = 0;

  for (const key of Object.keys(sheets).sort()) {
    const text = sheets[key];
    if (!text) continue;
    const directory = isDirectorySheet(text);
    const parsed = directory
      ? extractDirectoryRecords(text, key)
      : { ...extractRecords(text, key), warnings: [] as Warning[] };
    rejects.push(...parsed.rejects);
    warnings.push(...parsed.warnings);

    for (const rec of parsed.records) {
      totalRows++;
      const inName = rec.forcedAreaSlugs
        ? { slugs: [], phrases: [] as string[] }
        : scanNameForAreas(rec.nameText);
      const inComments = rec.forcedAreaSlugs
        ? { slugs: [] as string[], phrases: [] as string[] }
        : scanForAreas(rec.commentText);
      const slugs = [...(rec.forcedAreaSlugs ?? inName.slugs)];
      for (const s of inComments.slugs) if (!slugs.includes(s)) slugs.push(s);

      const cleaned = cleanBrokerName(rec.nameText, inName.phrases);
      if (!inName.slugs.length && cleaned.landmarks.length) {
        warnings.push({
          message: `${key} "${rec.nameText}": building-only location (${cleaned.landmarks.join(", ")}) left untagged`,
        });
      }

      rows.push({
        name: rec.nameText,
        phoneRaw: rec.phoneRaw,
        comments: rec.commentText,
        areaSlugs: slugs,
        nameAreaPhrases: inName.phrases,
        namePreCleaned: rec.namePreCleaned,
        firm: rec.firm ?? null,
      });
    }
  }

  const validRows: ContactRow[] = [];
  for (const row of rows) {
    if (!normalizePhone(row.phoneRaw)) {
      rejects.push({
        raw: `"${row.phoneRaw}"`,
        reason: "not a valid 10-digit Indian mobile",
      });
      continue;
    }
    validRows.push(row);
  }

  const cards = mergeContacts(validRows);
  return { cards, rejects, warnings, totalRows };
}
