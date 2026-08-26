export interface ContactedBroker {
  id: number;
  name: string;
  phone: string;
  areas: string[];
  at: number;
  foundVia?: boolean;
}

export interface MsgPrefs {
  areas: string[];
  bhk: string[];
  furnishing: "" | "semi" | "full" | "none";
  budgetMinK: number;
  budgetMaxK: number;
  tenant: "bachelor" | "family";
}

export const BUDGET_SLIDER_MIN = 5;
export const BUDGET_SLIDER_MAX = 100;

export const DEFAULT_PREFS: MsgPrefs = {
  areas: [],
  bhk: [],
  furnishing: "",
  budgetMinK: 15,
  budgetMaxK: 35,
  tenant: "bachelor",
};

const CONTACTS_KEY = "ba.contacts.v1";
const ARCHIVE_KEY = "ba.archive.v1";
const PREFS_KEY = "ba.prefs.v1";
const VOTES_KEY = "ba.votes.v1";
const REACHOUTS_KEY = "ba.reachouts.v1";
const NUDGES_KEY = "ba.nudges.v1";

export const NUDGE_LEVELS = [3, 10];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked — non-fatal
  }
}

export function loadContacted(): ContactedBroker[] {
  const list = readJson<ContactedBroker[]>(CONTACTS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveContacted(list: ContactedBroker[]): void {
  writeJson(CONTACTS_KEY, list);
}

export function hasContacted(id: number): boolean {
  return loadContacted().some((c) => c.id === id);
}

export function addContacted(entry: Omit<ContactedBroker, "at">): ContactedBroker[] {
  const list = loadContacted().filter((c) => c.id !== entry.id);
  const next = [{ ...entry, at: Date.now() }, ...list];
  saveContacted(next);
  return next;
}

export function removeContacted(id: number): ContactedBroker[] {
  const next = loadContacted().filter((c) => c.id !== id);
  saveContacted(next);
  return next;
}

export function loadArchive(): ContactedBroker[] {
  const list = readJson<ContactedBroker[]>(ARCHIVE_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function archiveOne(id: number): { contacted: ContactedBroker[]; archive: ContactedBroker[] } {
  const entry = loadContacted().find((c) => c.id === id);
  const contacted = removeContacted(id);
  if (!entry) return { contacted, archive: loadArchive() };
  const archive = [entry, ...loadArchive().filter((c) => c.id !== id)];
  writeJson(ARCHIVE_KEY, archive);
  return { contacted, archive };
}

export function restoreOne(id: number): { contacted: ContactedBroker[]; archive: ContactedBroker[] } {
  const entry = loadArchive().find((c) => c.id === id);
  const archive = loadArchive().filter((c) => c.id !== id);
  writeJson(ARCHIVE_KEY, archive);
  let contacted = loadContacted();
  if (entry) {
    contacted = [{ ...entry }, ...contacted.filter((c) => c.id !== id)];
    saveContacted(contacted);
  }
  return { contacted, archive };
}

export function markFound(id: number): ContactedBroker[] {
  const next = loadContacted().map((c) => (c.id === id ? { ...c, foundVia: true } : c));
  saveContacted(next);
  return next;
}

export function loadPrefs(): MsgPrefs {
  const p = readJson<Partial<MsgPrefs> & { bhk?: unknown }>(PREFS_KEY, {});
  const merged = { ...DEFAULT_PREFS, ...p };
  const bhk = Array.isArray(merged.bhk)
    ? merged.bhk
    : typeof merged.bhk === "string" && merged.bhk
      ? [merged.bhk]
      : [];
  return { ...merged, bhk };
}

export function savePrefs(prefs: MsgPrefs): void {
  writeJson(PREFS_KEY, prefs);
}

export function hasVoted(id: number): boolean {
  return readJson<number[]>(VOTES_KEY, []).includes(id);
}

export function markVoted(id: number): void {
  const votes = readJson<number[]>(VOTES_KEY, []);
  if (!votes.includes(id)) writeJson(VOTES_KEY, [...votes, id]);
}

export function recordReachOut(): number | null {
  const count = readJson<number>(REACHOUTS_KEY, 0) + 1;
  writeJson(REACHOUTS_KEY, count);
  const level = NUDGE_LEVELS.find((l) => l === count);
  if (!level) return null;
  const shown = readJson<number[]>(NUDGES_KEY, []);
  if (shown.includes(level)) return null;
  writeJson(NUDGES_KEY, [...shown, level]);
  return level;
}
