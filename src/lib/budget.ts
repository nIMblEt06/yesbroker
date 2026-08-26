export const PROPERTY_TAGS = ["PG", "1RK", "1BHK", "2BHK", "3BHK+", "IND_HOUSE"] as const;
export type PropertyTag = (typeof PROPERTY_TAGS)[number];

export const PROPERTY_LABELS: Record<string, string> = {
  PG: "PG",
  "1RK": "1RK",
  "1BHK": "1BHK",
  "2BHK": "2BHK",
  "3BHK+": "3BHK+",
  IND_HOUSE: "Ind. House",
};

export interface BudgetBucket {
  key: string;
  label: string;
  min: number;
  max: number;
}

export const BUDGET_BUCKETS: BudgetBucket[] = [
  { key: "<15", label: "Under ₹15k", min: 0, max: 15000 },
  { key: "15-30", label: "₹15k–₹30k", min: 15000, max: 30000 },
  { key: "30-60", label: "₹30k–₹60k", min: 30000, max: 60000 },
  { key: "60+", label: "₹60k+", min: 60000, max: 100000000 },
];

export function bucketByKey(key: string): BudgetBucket | null {
  return BUDGET_BUCKETS.find((b) => b.key === key) ?? null;
}

export function formatBudget(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (v: number) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`);
  if (min != null && max != null) {
    if (min === max) return fmt(min);
    return `${fmt(min)}–${fmt(max)}`;
  }
  if (min != null) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}
