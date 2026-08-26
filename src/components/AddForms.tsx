"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaxonomyArea } from "@/lib/area-taxonomy";
import { suggestAreas } from "@/lib/areas";
import { normalizePhone } from "@/lib/phone";
import { submitContacts } from "@/app/actions/contacts";
import { contactsSupported, pickContacts } from "@/lib/contact-picker";
import { useToast } from "@/components/Toaster";

interface SelectedArea {
  key: string;
  label: string;
  isNew: boolean;
}

interface Props {
  areas: TaxonomyArea[];
  prefillAreaSlug?: string;
  prefillPhone?: string;
  prefillName?: string;
  prefillNotes?: string;
  sharedText?: string;
}

export function AddForms({ areas, prefillAreaSlug, prefillPhone, prefillName, prefillNotes, sharedText }: Props) {
  const areaPrefill: SelectedArea[] = useMemo(() => {
    const found = areas.find((a) => a.slug === prefillAreaSlug);
    return found ? [{ key: found.slug, label: found.name, isNew: false }] : [];
  }, [areas, prefillAreaSlug]);
  const sharedRows = useMemo(
    () => (sharedText?.trim() ? parsePaste(sharedText).slice(0, 100) : []),
    [sharedText]
  );
  const sharedSingle = useMemo(() => {
    if (sharedRows.length !== 1) return null;
    const r = sharedRows[0];
    const phone = r.phoneRaw ? normalizePhone(r.phoneRaw) : null;
    if (!phone) return null;
    return { phone, name: r.name };
  }, [sharedRows]);
  const [tab, setTab] = useState<"single" | "bulk">(sharedRows.length > 1 ? "bulk" : "single");

  return (
    <div className="broker-card mx-auto max-w-xl p-4 sm:p-6">
      <h1 className="display-1 text-xl">Add a broker</h1>
      <p className="mt-1 text-sm text-muted">
        Found a good broker? Add them so the next person doesn&apos;t struggle.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-[4px] bg-brand-soft p-1" role="tablist">
        <TabButton active={tab === "single"} onClick={() => setTab("single")}>
          Add one
        </TabButton>
        <TabButton active={tab === "bulk"} onClick={() => setTab("bulk")}>
          Add many
        </TabButton>
      </div>

      <div className="mt-4">
        {tab === "single" ? (
          <SingleForm
            areas={areas}
            prefill={areaPrefill}
            initialPhone={prefillPhone ?? sharedSingle?.phone}
            initialName={prefillName ?? sharedSingle?.name}
            initialNotes={prefillNotes}
          />
        ) : (
          <BulkForm areas={areas} prefill={areaPrefill} initialRows={sharedRows.length > 1 ? sharedRows : undefined} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "rounded-[2px] bg-card px-3 py-2 font-display text-xs uppercase tracking-wide"
          : "rounded-[2px] px-3 py-2 text-sm font-medium text-muted hover:text-ink"
      }
    >
      {children}
    </button>
  );
}

export function AreaPicker({
  areas,
  selected,
  onChange,
}: {
  areas: TaxonomyArea[];
  selected: SelectedArea[];
  onChange: (next: SelectedArea[]) => void;
}) {
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return suggestAreas(query, 5)
      .filter((a) => !selected.some((s) => s.key === a.slug))
      .concat(
        !areas.some((a) => a.name.toLowerCase() === q) &&
          !selected.some((s) => s.label.toLowerCase() === q)
          ? [{ slug: "", name: "", sortOrder: 0, aliases: [], kind: "area" as const }]
          : []
      );
  }, [query, selected, areas]);
  const showCustom =
    query.trim().length > 1 && !suggestAreas(query, 1).some((a) => a.name.toLowerCase() === query.trim().toLowerCase());

  function add(item: SelectedArea) {
    if (!selected.some((s) => s.key === item.key)) onChange([...selected, item]);
    setQuery("");
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={selected.length ? "Add another area…" : "Type an area (e.g. Indiranagar)"}
        className="field"
        aria-label="Area"
      />
      {query.trim() && (
        <div className="mt-1 overflow-hidden rounded-[4px] border border-line bg-card shadow-sm">
          {suggestions.slice(0, 5).map((a) => (
            <button
              key={a.slug}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-soft"
              onClick={() => add({ key: a.slug, label: a.name, isNew: false })}
            >
              {a.name}
            </button>
          ))}
          {showCustom && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-brand-strong hover:bg-brand-soft"
              onClick={() =>
                add({
                  key: `new:${slugifyLocal(query)}`,
                  label: query.trim(),
                  isNew: true,
                })
              }
            >
              Use “{query.trim()}” (new area)
            </button>
          )}
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span key={s.key} className="tag">
              {s.label}
              <button
                type="button"
                aria-label={`Remove ${s.label}`}
                className="ml-1 text-brand-strong/70 hover:text-danger"
                onClick={() => onChange(selected.filter((x) => x.key !== s.key))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function slugifyLocal(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="hidden" aria-hidden="true">
      <label>
        Company
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}

function SingleForm({
  areas,
  prefill,
  initialPhone,
  initialName,
  initialNotes,
}: {
  areas: TaxonomyArea[];
  prefill: SelectedArea[];
  initialPhone?: string;
  initialName?: string;
  initialNotes?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [honeypot, setHoneypot] = useState("");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [selected, setSelected] = useState<SelectedArea[]>(prefill);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const canPickContacts = useMemo(() => contactsSupported(), []);

  async function onPickContact() {
    try {
      const [c] = await pickContacts(false);
      if (!c) return;
      const tel = (c.tel ?? []).find((t) => normalizePhone(t));
      if (tel) setPhone(tel);
      const pickedName = c.name?.[0];
      if (pickedName) setName(pickedName);
      if (!tel) toast("That contact has no mobile number");
    } catch {
      toast("Couldn't open contacts");
    }
  }

  const phoneValid = Boolean(normalizePhone(phone));
  const nameValid = name.trim().length > 0;
  const canSubmit = phoneValid && nameValid && selected.length > 0;

  function submit() {
    if (honeypot) {
      toast("Added, thanks!");
      return;
    }
    startTransition(async () => {
      const res = await submitContacts(
        [
          {
            name: name.trim() || undefined,
            phoneRaw: phone,
            areaTokens: selected.map((s) => (s.isNew ? s.label : s.key)),
            notes: notes.trim() || undefined,
            company: honeypot || undefined,
          },
        ],
        "single"
      );
      if (!res.ok) {
        toast(res.error ?? "Couldn't add.");
        return;
      }
      if ((res.rejected?.length ?? 0) > 0) {
        toast(res.rejected![0].reason);
        return;
      }
      toast(res.updated ? "Merged into an existing broker, trust count up!" : "Added, thanks!");
      setPhone("");
      setName("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) submit();
      }}
    >
      <Honeypot value={honeypot} onChange={setHoneypot} />
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium">Phone *</label>
          {canPickContacts && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void onPickContact()}
            >
              Pick from contacts
            </button>
          )}
        </div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98450 98713"
          inputMode="tel"
          className="field phone-num"
          autoFocus
        />
        <p
          className={`mt-1 h-4 text-xs ${phone ? (phoneValid ? "text-brand-strong" : "text-danger") : "text-muted"}`}
        >
          {phone
            ? phoneValid
              ? `✓ ${normalizePhone(phone)}`
              : "Enter a 10-digit Indian mobile number"
            : "Required"}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Areas served *</label>
        <AreaPicker areas={areas} selected={selected} onChange={setSelected} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Person or agency"
          className="field"
        />
        {!nameValid && (
          <p className="mt-1 h-4 text-xs text-muted">Required</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='e.g. "family only", "responds fast"'
          rows={2}
          className="field resize-none"
        />
      </div>

      <button type="submit" disabled={!canSubmit || pending} className="btn btn-primary w-full disabled:opacity-40">
        {pending ? "Adding…" : "Add broker"}
      </button>
    </form>
  );
}

interface BulkRow {
  key: number;
  line: string;
  name: string;
  phoneRaw: string | null;
}

function parsePaste(text: string): BulkRow[] {
  let key = 0;
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
      let phoneRaw: string | null = null;
      let name = line;
      if (m) {
        const digits = m[0].replace(/\D/g, "");
        if (digits.length >= 10) {
          phoneRaw = digits.slice(-10);
          name = line.replace(m[0], "");
        }
      }
      name = name.replace(/^[\s\-–—:,|]+|[\s\-–—:,|]+$/g, "").trim();
      return {
        key: ++key,
        line,
        name,
        phoneRaw,
      };
    });
}

function isValidRow(r: BulkRow): boolean {
  return Boolean(r.phoneRaw && normalizePhone(r.phoneRaw) && r.name.trim());
}

function BulkForm({
  areas,
  prefill,
  initialRows,
}: {
  areas: TaxonomyArea[];
  prefill: SelectedArea[];
  initialRows?: BulkRow[];
}) {
  const toast = useToast();
  const router = useRouter();
  const MAX = 100;

  const [paste, setPaste] = useState("");
  const [rows, setRows] = useState<BulkRow[]>(initialRows ?? []);
  const [truncated, setTruncated] = useState(false);
  const [commonAreas, setCommonAreas] = useState<SelectedArea[]>(prefill);
  const [result, setResult] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [pending, startTransition] = useTransition();
  const canPickContacts = useMemo(() => contactsSupported(), []);

  async function onPickContacts() {
    try {
      const picked = await pickContacts(true);
      if (!picked.length) return;
      const usable = picked
        .map((c) => ({
          name: c.name?.[0] ?? "",
          tel: (c.tel ?? []).find((t) => normalizePhone(t)),
        }))
        .filter((c): c is { name: string; tel: string } => Boolean(c.tel));
      if (!usable.length) {
        toast("None of those contacts have a mobile number");
        return;
      }
      setRows((rs) => {
        let key = rs.reduce((m, r) => Math.max(m, r.key), 0);
        return [
          ...rs,
          ...usable.map((c) => ({
            key: ++key,
            line: [c.name, c.tel].filter(Boolean).join(" "),
            name: c.name,
            phoneRaw: c.tel,
          })),
        ];
      });
    } catch {
      toast("Couldn't open contacts");
    }
  }

  function doParse() {
    const parsed = parsePaste(paste);
    setTruncated(parsed.length > MAX);
    setRows(parsed.slice(0, MAX));
    setResult(null);
  }

  const validRows = rows.filter(isValidRow);

  function submitAll() {
    if (honeypot) {
      setResult(
        `Added ${validRows.length} new contact${validRows.length === 1 ? "" : "s"}`
      );
      return;
    }
    startTransition(async () => {
      const res = await submitContacts(
        validRows.map((r) => ({
          name: r.name || undefined,
          phoneRaw: r.phoneRaw!,
          areaTokens: commonAreas.map((s) => (s.isNew ? s.label : s.key)),
          company: honeypot || undefined,
        })),
        "bulk"
      );
      if (!res.ok) {
        toast(res.error ?? "Couldn't add.");
        return;
      }
      const where = res.areaNames?.length ? ` to ${res.areaNames.join(", ")}` : "";
      setResult(
        `Added ${res.addedNew} new contact${res.addedNew === 1 ? "" : "s"}${where}` +
          (res.updated ? ` · merged ${res.updated} into existing listings` : "") +
          ((res.rejected?.length ?? 0) > 0 ? ` · ${res.rejected!.length} invalid skipped` : "")
      );
      setPaste("");
      setRows([]);
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (validRows.length) submitAll();
      }}
    >
      <Honeypot value={honeypot} onChange={setHoneypot} />
      <div>
        <label className="mb-1 block text-sm font-medium">Paste numbers</label>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={5}
          placeholder={"One per line, name + number:\n98450 98713 Chand\nNasir 98441 33601"}
          className="field resize-none font-mono text-sm"
        />
        <div className="mt-2 flex items-center gap-2">
          <button type="button" onClick={doParse} className="btn btn-outline btn-sm" disabled={!paste.trim()}>
            Parse list
          </button>
          {canPickContacts && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void onPickContacts()}
            >
              Pick from contacts
            </button>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="rounded-[4px] border border-line p-3">
            <p className="mb-2 text-sm font-semibold">Apply to all {validRows.length} rows</p>
            <AreaPicker areas={areas} selected={commonAreas} onChange={setCommonAreas} />
          </div>

          <div>
            <p className="mb-1.5 flex items-center justify-between text-sm font-semibold">
              Review rows
              <span className="font-normal text-muted">
                {validRows.length}/{rows.length} valid
              </span>
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-[4px] border border-line p-2">
              {rows.map((r) => {
                const valid = isValidRow(r);
                const hasNumber = Boolean(r.phoneRaw && normalizePhone(r.phoneRaw));
                return (
                  <div key={r.key} className="flex items-center gap-2 rounded-[4px] px-1 py-1 text-sm">
                    <span>{valid ? "✓" : "⚠"}</span>
                    <span className={`phone-num w-32 shrink-0 ${hasNumber ? "" : "text-danger line-through"}`}>
                      {r.phoneRaw ?? r.line.slice(0, 16)}
                    </span>
                    {hasNumber ? (
                      <input
                        value={r.name}
                        onChange={(e) =>
                          setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))
                        }
                        placeholder="Add a name"
                        className={`field h-8 flex-1 py-1 text-sm ${valid ? "" : "border-warn"}`}
                      />
                    ) : (
                      <span className="flex-1 text-xs text-danger">invalid number, will skip</span>
                    )}
                    <button
                      type="button"
                      aria-label="Remove row"
                      className="px-1 text-muted hover:text-danger"
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            {truncated && (
              <p className="mt-1 text-xs text-warn">Only the first {MAX} rows were kept.</p>
            )}
          </div>

          {result && (
            <p className="rounded-[4px] bg-brand-soft px-3 py-2 text-sm font-medium text-brand-strong">
              {result}
            </p>
          )}

          <button
            type="submit"
            disabled={!validRows.length || pending}
            className="btn btn-primary w-full disabled:opacity-40"
          >
            {pending ? "Submitting…" : `Submit all (${validRows.length})`}
          </button>
        </>
      )}
    </form>
  );
}
